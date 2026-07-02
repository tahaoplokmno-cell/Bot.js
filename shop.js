const { Markup } = require('telegraf');

function handleShopCallback(ctx, data, uId, userStates, db) {
    const backToMain = [Markup.button.callback("🔙 العودة للقائمة الرئيسية", "main_menu")];
    if (!db.custom_store) db.custom_store = { games: {} };

    // حقن وتأمين فئة الألعاب إذا كانت قاعدة البيانات فارغة
    if (Object.keys(db.custom_store.games).length === 0) {
        db.custom_store.games = { 
            "ببجي موبايل": ["60 شدة - 1.00", "325 شدة - 5.00", "660 شدة - 10.00", "1800 شدة - 25.00"],
            "بطاقات ستيم STEAM": ["فئة 5$ - 5.50", "فئة 10$ - 11.00"],
            "بطاقات إكس بوكس XBOX": ["فئة 10$ - 10.50", "فئة 25$ - 26.00"]
        };
    }

    // 1️⃣ تصفح الأقسام الرئيسية للمتجر
    if (data === "view_games" || data === "m#games") { 
        let buttons = Object.keys(db.custom_store.games).map(g => [Markup.button.callback("🎮 " + g, `shop_cat#g#${g}`)]); 
        buttons.push(backToMain);
        return ctx.editMessageText("🎮 **اختر اللعبة أو بطاقة الستور المطلوبة للشراء:**", { parse_mode: 'Markdown', reply_markup: Markup.inlineKeyboard(buttons).reply_markup }).catch(()=>{}); 
    }
    
    if (data === "view_cards" || data === "m#cards") {
        let buttons = [
            [Markup.button.callback("🇸🇾 شحن رصيد سيريتل (Syriatel)", "order_syr_card#syr")],
            [Markup.button.callback("🇸🇾 شحن رصيد إم تي إن (MTN)", "order_syr_card#mtn")],
            backToMain
        ];
        return ctx.editMessageText("🎟️ **اختر شبكة الاتصال المراد شحن رصيدها حياً:**", { parse_mode: 'Markdown', reply_markup: Markup.inlineKeyboard(buttons).reply_markup }).catch(()=>{});
    }

    // 2️⃣ الدخول لعروض الألعاب والتقسيم الرباعي المتجاور
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
        return ctx.editMessageText(`🎯 **العروض والكميات المتاحة لـ [${catName}]:**`, { parse_mode: 'Markdown', reply_markup: Markup.inlineKeyboard(buttons).reply_markup }).catch(()=>{}); 
    }
    
    // 3️⃣ تفعيل ميزة كتابة رصيد سيريتل وإم تي إن المطور
    if (data.startsWith("order_syr_card#")) {
        const type = data.split('#')[1];
        userStates[uId] = { action: 'await_syr_phone', cardType: type };
        return ctx.reply(`✍️ **حسناً يا غالي:**\nالرجاء كتابة رقم الهاتف المراد شحنه بالكامل الآن (رقم الـ ${type.toUpperCase()}):`);
    }

    // 4️⃣ بدء معالجة عروض الألعاب الثابتة
    if (data.startsWith("buy_item#")) {
        const parts = data.split('#'); let catName = parts[2], item = parts[3], price = parseFloat(parts[4]);
        let userBal = db.users[uId]?.balance_usd || 0; 
        if (userBal < price) return ctx.reply(`❌ رصيدك الحالي ($${userBal.toFixed(2)}) لا يكفي لشراء [${item}]!`);
        
        userStates[uId] = { type: 'game', name: catName, item, price, action: 'await_game_id' };
        return ctx.reply(`✍️ يرجى كتابة رقم **الآيدي (ID)** الخاص بحسابك في لعبة *${catName}*:`, { parse_mode: 'Markdown' });
    }
}

module.exports = { handleShopCallback };
