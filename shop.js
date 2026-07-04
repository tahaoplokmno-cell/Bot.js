const { Markup } = require('telegraf');

function handleShopCallback(ctx, data, uId, userStates, db) {
    const backToMain = [Markup.button.callback("🔙 العودة للقائمة الرئيسية", "main_menu")];
    if (!db.custom_store) db.custom_store = { games: {} };

    // الألعاب الافتراضية
    if (Object.keys(db.custom_store.games).length === 0) {
        db.custom_store.games = {
            "ببجي موبايل": ["60 شدة - 1.00", "325 شدة - 5.00", "660 شدة - 10.00", "1800 شدة - 25.00"],
            "فري فاير": ["100 دايموند - 2.00", "200 دايموند - 4.00", "400 دايموند - 7.00"],
            "روبلوكس": ["100 روبوكس - 1.50", "500 روبوكس - 6.00", "1000 روبوكس - 11.00"],
            "كود فري فاير": ["كود 5$ - 5.00", "كود 10$ - 10.00"],
            "بطاقات ستيم STEAM": ["فئة 5$ - 5.50", "فئة 10$ - 11.00"],
            "بطاقات إكس بوكس XBOX": ["فئة 10$ - 10.50", "فئة 25$ - 26.00"]
        };
    }

    // ===== عرض الألعاب =====
    if (data === "view_games" || data === "m#games") {
        let buttons = Object.keys(db.custom_store.games).map(g => 
            [Markup.button.callback("🎮 " + g, `shop_cat#g#${g}`)]
        );
        buttons.push(backToMain);
        return ctx.editMessageText("🎮 **اختر اللعبة:**", { 
            parse_mode: 'Markdown', 
            reply_markup: Markup.inlineKeyboard(buttons) 
        });
    }

    // ===== عرض البطاقات (ستيم وإكس بوكس) =====
    if (data === "view_cards" || data === "m#cards") {
        let buttons = [
            [Markup.button.callback("🎮 بطاقات ستيم", "shop_cat#g#بطاقات ستيم STEAM")],
            [Markup.button.callback("🎮 بطاقات إكس بوكس", "shop_cat#g#بطاقات إكس بوكس XBOX")],
            backToMain
        ];
        return ctx.editMessageText("🎟️ **اختر نوع البطاقة:**", { 
            parse_mode: 'Markdown', 
            reply_markup: Markup.inlineKeyboard(buttons) 
        });
    }

    // ===== شحن رصيد الهاتف =====
    if (data === "m#phone") {
        let buttons = [
            [Markup.button.callback("📱 سيريتل", "order_syr_card#syr")],
            [Markup.button.callback("📱 إم تي إن", "order_syr_card#mtn")],
            backToMain
        ];
        return ctx.editMessageText("📱 **اختر شبكة الهاتف:**", { 
            parse_mode: 'Markdown', 
            reply_markup: Markup.inlineKeyboard(buttons) 
        });
    }

    // ===== باقي الكود كما هو =====
    if (data.startsWith("shop_cat#")) {
        const parts = data.split('#'); const catName = parts[2];
        const list = db.custom_store.games[catName] || [];
        if (list.length === 0) return ctx.reply("⚠️ لا توجد عروض حالياً!");

        let rawButtons = list.map(item => {
            let pr = parseFloat(item.split('-')[1]) || 0;
            return Markup.button.callback(item, `buy_item#game#${catName}#${item}#${pr}`);
        });

        let buttons = [];
        for (let i = 0; i < rawButtons.length; i += 2) { buttons.push(rawButtons.slice(i, i + 2)); }
        buttons.push([Markup.button.callback("🔙 رجوع للأقسام", "view_games")], backToMain);
        return ctx.editMessageText(`🎯 **العروض لـ [${catName}]:**`, { 
            parse_mode: 'Markdown', 
            reply_markup: Markup.inlineKeyboard(buttons) 
        });
    }

    if (data.startsWith("order_syr_card#")) {
        const type = data.split('#')[1];
        userStates[uId] = { action: 'await_syr_phone', cardType: type };
        return ctx.reply(`✍️ اكتب رقم الهاتف المراد شحنه (${type.toUpperCase()}):`);
    }

    if (data.startsWith("buy_item#")) {
        const parts = data.split('#'); let catName = parts[2], item = parts[3], price = parseFloat(parts[4]);
        let userBal = db.users[uId]?.balance_usd || 0;
        if (userBal < price) return ctx.reply(`❌ رصيدك ($${userBal.toFixed(2)}) لا يكفي!`);

        userStates[uId] = { type: 'game', name: catName, item, price, action: 'await_game_id' };
        return ctx.reply(`✍️ اكتب الآيدي (ID) الخاص بحسابك في *${catName}*:`, { parse_mode: 'Markdown' });
    }
}

module.exports = { handleShopCallback };
