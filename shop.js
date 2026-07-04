const { Markup } = require('telegraf');
const dbFile = require('./database');

function handleShopCallback(ctx, data, uId, userStates, db) {
    const backToMain = [Markup.button.callback("🔙 العودة للقائمة الرئيسية", "main_menu")];
    
    if (!db.custom_store) db.custom_store = { games: {} };
    
    if (Object.keys(db.custom_store.games).length === 0) {
        db.custom_store.games = {
            "🎮 ببجي موبايل": ["60 شدة - 1.00$", "325 شدة - 5.00$", "660 شدة - 10.00$", "1800 شدة - 25.00$"],
            "🎮 فري فاير": ["100 دايموند - 2.00$", "200 دايموند - 4.00$", "400 دايموند - 7.00$"],
            "🎮 روبلوكس": ["100 روبوكس - 1.50$", "500 روبوكس - 6.00$", "1000 روبوكس - 11.00$"],
            "🎮 بطاقات ستيم": ["فئة 5$ - 5.50$", "فئة 10$ - 11.00$"],
            "🎮 بطاقات إكس بوكس": ["فئة 10$ - 10.50$", "فئة 25$ - 26.00$"]
        };
        dbFile.saveDB(db);
    }

    // ===== عرض الألعاب =====
    if (data === "m#games") {
        const games = db.custom_store.games || {};
        const keys = Object.keys(games);
        if (keys.length === 0) return ctx.reply("⚠️ لا توجد ألعاب!");
        const buttons = keys.map(g => [Markup.button.callback(g, `shop_cat#${g}`)]);
        buttons.push(backToMain);
        return ctx.editMessageText("🎮 **اختر اللعبة:**", { 
            parse_mode: 'Markdown', 
            reply_markup: Markup.inlineKeyboard(buttons) 
        });
    }

    // ===== عرض منتجات القسم =====
    if (data.startsWith("shop_cat#")) {
        const catName = data.split('#')[1];
        const list = db.custom_store.games[catName] || [];
        if (list.length === 0) return ctx.reply(`⚠️ لا توجد عروض!`);
        const rawButtons = list.map(item => {
            const price = parseFloat(item.split('-')[1]) || 0;
            return Markup.button.callback(item, `buy_item#${catName}#${item}#${price}`);
        });
        let buttons = [];
        for (let i = 0; i < rawButtons.length; i += 2) buttons.push(rawButtons.slice(i, i + 2));
        buttons.push([Markup.button.callback("🔙 رجوع", "m#games")], backToMain);
        return ctx.editMessageText(`🛒 **عروض ${catName.replace('🎮 ', '')}:**`, { 
            parse_mode: 'Markdown', 
            reply_markup: Markup.inlineKeyboard(buttons) 
        });
    }

    // ===== شراء منتج (طلب الآيدي) =====
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

    // ===== تأكيد الشراء وإرسال الكود =====
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
        dbFile.saveDB(db);
        
        const msg = `✅ **تم الشراء بنجاح!**\n🎁 المنتج: *${state.item}*\n💰 الخصم: *$${state.price}*`;
        await ctx.editMessageText(msg, { parse_mode: 'Markdown' });
        
        // إرسال إشعار للإدارة مع زر إرسال الكود
        const adminBtn = Markup.inlineKeyboard([
            [Markup.button.callback("📤 إرسال الكود للزبون", `send_code#${uId}`)]
        ]);
        await ctx.telegram.sendMessage(config.ADMIN_CHANNEL_ID,
            `🛒 **طلب شراء جديد!**\n👤 ${ctx.from.first_name}\n🆔 \`${uId}\`\n🎁 ${state.item}\n💰 $${state.price}\n🆔 الآيدي: \`${state.gameId || 'غير محدد'}\``,
            { reply_markup: adminBtn, parse_mode: 'Markdown' }
        ).catch(() => {});
        
        userStates[uId] = null;
        return;
    }

    // ===== باقي الأزرار =====
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
}

module.exports = { handleShopCallback };
