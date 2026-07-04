const { Markup } = require('telegraf');
const adminActions = require('./admin_actions');
const charge = require('./charge');
const devBot = require('./dev_bot');
const config = require('./config');

module.exports = async function handleCallback(ctx, bot, db, userStates, saveDB) {
    const data = ctx.callbackQuery.data;
    const uId = String(ctx.from.id);

    await ctx.answerCbQuery().catch(() => {});

    if (data.startsWith("adm#")) {
        return adminActions.handleSuperAdminCallback(ctx, data, uId, userStates, db, bot);
    }

    const backToMain = [Markup.button.callback("🔙 العودة للقائمة الرئيسية", "main_menu")];
    
    // ===== الألعاب =====
    if (data === "m#games") {
        const games = db.custom_store?.games || {};
        const keys = Object.keys(games);
        if (keys.length === 0) return ctx.reply("⚠️ لا توجد ألعاب!");
        const buttons = keys.map(g => [Markup.button.callback(g, `shop_cat#${g}`)]);
        buttons.push(backToMain);
        return ctx.editMessageText("🎮 **اختر اللعبة:**", { 
            parse_mode: 'Markdown', 
            reply_markup: Markup.inlineKeyboard(buttons) 
        });
    }

    if (data.startsWith("shop_cat#")) {
        const catName = data.split('#')[1];
        const list = db.custom_store?.games?.[catName] || [];
        if (list.length === 0) return ctx.reply(`⚠️ لا توجد عروض!`);
        const rawButtons = list.map(item => {
            const price = parseFloat(item.split('-')[1]) || 0;
            return Markup.button.callback(item, `buy_item#${catName}#${item}#${price}`);
        });
        let buttons = [];
        for (let i = 0; i < rawButtons.length; i += 2) buttons.push(rawButtons.slice(i, i + 2));
        buttons.push([Markup.button.callback("🔙 رجوع", "m#games")]);
        buttons.push(backToMain);
        return ctx.editMessageText(`🛒 **عروض ${catName.replace('🎮 ', '')}:**`, { 
            parse_mode: 'Markdown', 
            reply_markup: Markup.inlineKeyboard(buttons) 
        });
    }

    if (data.startsWith("buy_item#")) {
        const parts = data.split('#');
        const catName = parts[1];
        const item = parts[2];
        const price = parseFloat(parts[3]) || 0;
        const userBal = db.users[uId]?.balance_usd || 0;
        if (userBal < price) {
            return ctx.reply(`❌ رصيدك ($${userBal.toFixed(2)}) لا يكفي!`);
        }
        userStates[uId] = { 
            type: 'game', 
            name: catName, 
            item, 
            price, 
            action: 'await_game_id' 
        };
        return ctx.reply(`✍️ اكتب الآيدي (ID) الخاص بك:`, { parse_mode: 'Markdown' });
    }

    if (data === "confirm_order") {
        const state = userStates[uId];
        if (!state || state.action !== 'confirmed') {
            return ctx.reply("❌ لا يوجد طلب مؤكد.");
        }
        const userBal = db.users?.[uId]?.balance_usd || 0;
        if (userBal < state.price) {
            return ctx.reply(`❌ رصيدك غير كافٍ! المطلوب $${state.price}`);
        }
        db.users[uId].balance_usd = userBal - state.price;
        saveDB(db);
        userStates[uId] = null;
        const msg = `✅ **تم الشراء بنجاح!**\n🎁 المنتج: *${state.item}*\n💰 الخصم: *$${state.price}*`;
        await ctx.editMessageText(msg, { parse_mode: 'Markdown' });
        
        const adminBtn = Markup.inlineKeyboard([
            [Markup.button.callback("📤 إرسال الكود للزبون", `send_code#${uId}`)]
        ]);
        await bot.telegram.sendMessage(config.ADMIN_CHANNEL_ID,
            `🛒 **طلب شراء جديد!**\n👤 ${ctx.from.first_name}\n🆔 \`${uId}\`\n🎁 ${state.item}\n💰 $${state.price}`,
            { reply_markup: adminBtn, parse_mode: 'Markdown' }
        ).catch(() => {});
        return;
    }

    if (data.startsWith("send_code#")) {
        const clientId = data.split("#")[1];
        userStates[uId] = { action: 'await_send_code', clientUId: clientId };
        return ctx.editMessageText(`✍️ اكتب الكود الذي تريد إرساله للمستخدم ${clientId}:`);
    }

    // ===== البطاقات =====
    if (data === "m#cards") {
        const buttons = [
            [Markup.button.callback("🎮 بطاقات ستيم", "shop_cat#🎮 بطاقات ستيم")],
            [Markup.button.callback("🎮 بطاقات إكس بوكس", "shop_cat#🎮 بطاقات إكس بوكس")],
            backToMain
        ];
        return ctx.editMessageText("🎟️ **اختر البطاقة:**", { 
            parse_mode: 'Markdown', 
            reply_markup: Markup.inlineKeyboard(buttons) 
        });
    }

    // ===== شحن رصيد الهاتف =====
    if (data === "m#phone") {
        const buttons = [
            [Markup.button.callback("📱 سيريتل", "order_syr#syr")],
            [Markup.button.callback("📱 إم تي إن", "order_syr#mtn")],
            backToMain
        ];
        return ctx.editMessageText("📱 **اختر شبكة الهاتف:**", { 
            parse_mode: 'Markdown', 
            reply_markup: Markup.inlineKeyboard(buttons) 
        });
    }

    if (data.startsWith("order_syr#")) {
        const type = data.split('#')[1];
        userStates[uId] = { action: 'await_syr_phone', cardType: type };
        return ctx.reply(`✍️ اكتب رقم الهاتف (${type.toUpperCase()}):`);
    }

    if (data === "bot_order#start") {
        return devBot.initBotOrder(ctx, userStates, uId);
    }

    if (data.startsWith("ch#")) {
        return charge.askAmount(ctx, data, uId, userStates);
    }

    if (data.startsWith("amt#") || data.startsWith("amts#")) {
        const amount = data.split("#")[1];
        userStates[uId] = { action: 'await_charge_amount', amount: parseFloat(amount), isUsd: data.startsWith("amt#") };
        return ctx.reply(`📸 أرسل صورة إثبات الدفع بقيمة ${amount} ${data.startsWith("amt#") ? '$' : 'ل.س'}`);
    }

    if (data.startsWith("pay_approve#") || data.startsWith("pay_reject#")) {
        return adminActions.handlePaymentDecision(ctx, data, uId, db, saveDB);
    }

    if (data.startsWith("ref_app#") || data.startsWith("ref_rej#")) {
        const parts = data.split("#");
        const targetId = parts[1];
        const amount = parseFloat(parts[2]) || 0;

        if (data.startsWith("ref_app#")) {
            if (db.users[targetId]) {
                db.users[targetId].balance_usd = (db.users[targetId].balance_usd || 0) - amount;
                saveDB(db);
                await ctx.editMessageText(`✅ تم استرجاع $${amount} للمستخدم ${targetId}`);
                await bot.telegram.sendMessage(targetId, `✅ تم استرجاع $${amount} إلى محفظتك!`);
            }
        } else {
            await ctx.editMessageText(`❌ تم رفض طلب الاسترجاع`);
            await bot.telegram.sendMessage(targetId, "❌ عذراً، تم رفض طلب استرجاع الأموال.");
        }
        return;
    }

    if (data.startsWith("refund#")) {
        const currency = data.split("#")[1];
        userStates[uId] = { action: 'await_refund_amount', currency };
        const msg = currency === 'usd' ? "✍️ اكتب المبلغ بالدولار:" : "✍️ اكتب المبلغ بالليرة السورية:";
        return ctx.reply(msg);
    }

    if (data.startsWith("srv#")) {
        return devBot.handleServerChoice(ctx, data, uId, userStates, bot);
    }

    if (data.startsWith("bot_dec#")) {
        const parts = data.split("#");
        const action = parts[1];
        const clientId = parts[2];

        if (action === "price") {
            userStates[uId] = { action: 'await_bot_price', targetCustomerId: clientId };
            return ctx.editMessageText(`✍️ اكتب السعر للمستخدم ${clientId}:`);
        }
        if (action === "desc") {
            userStates[uId] = { action: 'await_bot_desc_admin', targetCustomerId: clientId };
            return ctx.editMessageText(`✍️ اكتب وصف إضافي للمستخدم ${clientId}:`);
        }
        if (action === "time") {
            userStates[uId] = { action: 'await_bot_time', targetCustomerId: clientId };
            return ctx.editMessageText(`✍️ اكتب الوقت المتوقع للمستخدم ${clientId}:`);
        }
        if (action === "file") {
            userStates[uId] = { action: 'await_bot_file', targetCustomerId: clientId };
            return ctx.editMessageText(`📤 أرسل الملف للمستخدم ${clientId}:`);
        }
    }

    if (data === "main_menu") {
        const mainMenu = Markup.keyboard([
            ['🏪 المتجر'],
            ['💳 المحفظة', '💰 استرجاع الأموال'],
            ['⚙️ الإعدادات', '📞 الدعم الفني']
        ]).resize();
        return ctx.editMessageText("🎯 **القائمة الرئيسية**", {
            parse_mode: 'Markdown',
            reply_markup: mainMenu
        });
    }

    return ctx.reply("⚠️ هذا الزر غير مفعل حالياً.");
};
