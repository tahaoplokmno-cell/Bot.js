const { Markup } = require('telegraf');
const adminActions = require('./admin_actions');
const charge = require('./charge');
const shop = require('./shop');
const devBot = require('./dev_bot');
const config = require('./config');

module.exports = async function handleCallback(ctx, bot, db, userStates, saveDB) {
    const data = ctx.callbackQuery.data;
    const uId = String(ctx.from.id);

    await ctx.answerCbQuery().catch(() => {});

    // ===== 1️⃣ أزرار الأدمن =====
    if (data.startsWith("adm#")) {
        return adminActions.handleSuperAdminCallback(ctx, data, uId, userStates, db, bot);
    }

    // ===== 2️⃣ أزرار المتجر =====
    if (data.startsWith("shop_cat#") || data.startsWith("buy_item#") ||
        data === "m#games" || data === "m#cards" || data === "m#phone" ||
        data.startsWith("order_syr#")) {
        return shop.handleShopCallback(ctx, data, uId, userStates, db);
    }

    // ===== 3️⃣ أزرار إنشاء بوت =====
    if (data === "bot_order#start") {
        return devBot.initBotOrder(ctx, userStates, uId);
    }

    // ===== 4️⃣ أزرار الشحن =====
    if (data.startsWith("ch#")) {
        return charge.askAmount(ctx, data, uId, userStates);
    }

    // ===== 5️⃣ فئات الشحن =====
    if (data.startsWith("amt#") || data.startsWith("amts#")) {
        const amount = data.split("#")[1];
        userStates[uId] = { action: 'await_charge_amount', amount: parseFloat(amount), isUsd: data.startsWith("amt#") };
        return ctx.reply(`📸 أرسل صورة إثبات الدفع بقيمة ${amount} ${data.startsWith("amt#") ? '$' : 'ل.س'}`);
    }

    // ===== 6️⃣ قبول/رفض الدفع =====
    if (data.startsWith("pay_approve#") || data.startsWith("pay_reject#")) {
        return adminActions.handlePaymentDecision(ctx, data, uId, db, saveDB);
    }

    // ===== 7️⃣ استرجاع الأموال =====
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

    // ===== 8️⃣ اختيار عملة الاسترجاع =====
    if (data.startsWith("refund#")) {
        const currency = data.split("#")[1];
        userStates[uId] = { action: 'await_refund_amount', currency };
        const msg = currency === 'usd' ? "✍️ اكتب المبلغ بالدولار:" : "✍️ اكتب المبلغ بالليرة السورية:";
        return ctx.reply(msg);
    }

    // ===== 9️⃣ السيرفر (إنشاء بوت) =====
    if (data.startsWith("srv#")) {
        return devBot.handleServerChoice(ctx, data, uId, userStates, bot);
    }

    // ===== 🔟 أزرار طلب البوت (4 أزرار: السعر، الوصف، الوقت، الملف) =====
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

    // ===== 1️⃣1️⃣ إرسال الكود للزبون =====
    if (data.startsWith("send_code#")) {
        const clientId = data.split("#")[1];
        userStates[uId] = { action: 'await_send_code', clientUId: clientId };
        return ctx.editMessageText(`✍️ اكتب الكود الذي تريد إرساله للمستخدم ${clientId}:`);
    }

    // ===== 1️⃣2️⃣ تأكيد الطلب =====
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
        
        // إرسال إشعار للإدارة مع زر إرسال الكود
        const adminBtn = Markup.inlineKeyboard([
            [Markup.button.callback("📤 إرسال الكود للزبون", `send_code#${uId}`)]
        ]);
        await bot.telegram.sendMessage(config.ADMIN_CHANNEL_ID,
            `🛒 **طلب شراء جديد!**\n👤 ${ctx.from.first_name}\n🆔 \`${uId}\`\n🎁 ${state.item}\n💰 $${state.price}\n🆔 الآيدي: \`${state.gameId || 'غير محدد'}\``,
            { reply_markup: adminBtn, parse_mode: 'Markdown' }
        ).catch(() => {});
        return;
    }

    // ===== 1️⃣3️⃣ العودة للقائمة =====
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
