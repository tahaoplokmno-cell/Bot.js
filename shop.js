const { Markup } = require('telegraf');
const dbFile = require('./database');

function handleShopCallback(ctx, data, uId, userStates, db) {
    const backToMain = [Markup.button.callback("🔙 العودة للقائمة الرئيسية", "main_menu")];
    
    // ===== التأكد من وجود المتجر =====
    if (!db.custom_store) db.custom_store = { games: {} };
    
    // ===== الألعاب الافتراضية (إذا كانت فارغة) =====
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
        // 🔥 التأكد من وجود بيانات قبل العرض
        const games = db.custom_store.games || {};
        const keys = Object.keys(games);
        
        if (keys.length === 0) {
            return ctx.reply("⚠️ لا توجد ألعاب حالياً!");
        }

        let buttons = keys.map(g => 
            [Markup.button.callback(g, `shop_cat#${g}`)]
        );
        buttons.push(backToMain);
        
        return ctx.editMessageText("🎮 **اختر اللعبة أو البطاقة:**", { 
            parse_mode: 'Markdown', 
            reply_markup: Markup.inlineKeyboard(buttons) 
        });
    }

    // ===== عرض منتجات القسم =====
    if (data.startsWith("shop_cat#")) {
        const catName = data.split('#')[1];
        const list = db.custom_store.games[catName] || [];
        
        if (list.length === 0) {
            return ctx.reply(`⚠️ لا توجد عروض في [${catName}]`);
        }

        let rawButtons = list.map(item => {
            let price = parseFloat(item.split('-')[1]) || 0;
            return Markup.button.callback(item, `buy_item#${catName}#${item}#${price}`);
        });

        let buttons = [];
        for (let i = 0; i < rawButtons.length; i += 2) {
            buttons.push(rawButtons.slice(i, i + 2));
        }
        buttons.push([Markup.button.callback("🔙 رجوع للأقسام", "m#games")], backToMain);
        
        return ctx.editMessageText(`🛒 **عروض [${catName.replace('🎮 ', '')}]:**`, { 
            parse_mode: 'Markdown', 
            reply_markup: Markup.inlineKeyboard(buttons) 
        });
    }

    // ===== شراء منتج =====
    if (data.startsWith("buy_item#")) {
        const parts = data.split('#');
        const catName = parts[1];
        const item = parts[2];
        const price = parseFloat(parts[3]) || 0;
        
        const userBal = db.users[uId]?.balance_usd || 0;
        if (userBal < price) {
            return ctx.reply(`❌ رصيدك ($${userBal.toFixed(2)}) لا يكفي لشراء [${item}]!`);
        }

        userStates[uId] = { 
            type: 'game', 
            name: catName, 
            item, 
            price, 
            action: 'await_game_id' 
        };
        return ctx.reply(`✍️ اكتب الآيدي (ID) الخاص بحسابك في *${catName.replace('🎮 ', '')}*:`, { 
            parse_mode: 'Markdown' 
        });
    }

    // ===== البطاقات =====
    if (data === "m#cards") {
        let buttons = [
            [Markup.button.callback("🎮 بطاقات ستيم", "shop_cat#🎮 بطاقات ستيم")],
            [Markup.button.callback("🎮 بطاقات إكس بوكس", "shop_cat#🎮 بطاقات إكس بوكس")],
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
            [Markup.button.callback("📱 سيريتل (Syriatel)", "order_syr#syr")],
            [Markup.button.callback("📱 إم تي إن (MTN)", "order_syr#mtn")],
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
        return ctx.reply(`✍️ اكتب رقم الهاتف المراد شحنه (${type.toUpperCase()}):`);
    }
}

module.exports = { handleShopCallback };
