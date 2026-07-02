const { Markup } = require('telegraf');

function handleShopCallback(ctx, data, uId, userStates, db) {
    const backToMain = [Markup.button.callback("🔙 العودة للقائمة الرئيسية", "main_menu")];
    if (!db.custom_store) db.custom_store = { games: {}, cards: {} };

    // 1️⃣ فتح الأقسام الرئيسية (ألعاب أو بطاقات) بناءً على ضغطة المستخدم من menus.js
    if (data === "view_games" || data === "view_cards" || data === "m#games" || data === "m#cards") { 
        const isGame = (data === "view_games" || data === "m#games"); 
        const source = isGame ? db.custom_store.games : db.custom_store.cards; 
        
        if (!source || Object.keys(source).length === 0) {
            return ctx.reply("⚠️ لا توجد أقسام متوفرة حالياً، اصنع قسماً وعروضاً من لوحة الأدمن أولاً!");
        }
        
        let buttons = Object.keys(source).map(g => [Markup.button.callback((isGame ? "🎮 " : "🎟️ ") + g, `shop_cat#${isGame ? 'g' : 'c'}#${g}`)]); 
        buttons.push(backToMain);
        
        return ctx.editMessageText(isGame ? "🎮 **اختر اللعبة أو القسم المطلوب للبدء والشراء:**" : "🎟️ **اختر نوع البطاقات الرقمية المتوفرة:**", { 
            parse_mode: 'Markdown', 
            reply_markup: Markup.inlineKeyboard(buttons).reply_markup 
        }).catch(()=>{}); 
    }
    
    // 2️⃣ الدخول للفئة (مثل ببجي) وعرض الحزم الأربعة بتنسيق مصفوفة ثنائية متجاورة
    if (data.startsWith("shop_cat#")) { 
        const parts = data.split('#');
        const isGame = parts[1] === 'g'; 
        const catName = parts[2];
        const source = isGame ? db.custom_store.games : db.custom_store.cards; 
        const list = source[catName] || []; 
        
        if (list.length === 0) return ctx.reply("⚠️ لا توجد عروض أسعار متوفرة داخل هذا القسم حالياً!");
        
        // بناء الأزرار للحزم والعروض الأربعة
        let rawButtons = list.map(item => { 
            let itemParts = item.split('-');
            let pr = parseFloat(itemParts[1]) || 0; 
            return Markup.button.callback(item, `buy_item#${isGame ? 'game' : 'card'}#${catName}#${item}#${pr}`); 
        }); 
        
        // 🌟 التقسيم الرباعي الذكي: دمج كل عرضين متجاورين في سطر واحد لسهولة التصفح
        let buttons = [];
        for (let i = 0; i < rawButtons.length; i += 2) {
            buttons.push(rawButtons.slice(i, i + 2));
        }
        
        // إضافة أزرار التنقل والرجوع في أسفل المصفوفة
        buttons.push([Markup.button.callback("🔙 رجوع للأقسام", isGame ? "view_games" : "view_cards")]);
        buttons.push(backToMain);
        
        return ctx.editMessageText(`🎯 **العروض والكميات المتاحة لـ [${catName}]:**\n\nالرجاء اختيار الحزمة المناسبة لرصيدك بالدولار الرقمي لشحنها حياً:`, { 
            parse_mode: 'Markdown', 
            reply_markup: Markup.inlineKeyboard(buttons).reply_markup 
        }).catch(()=>{}); 
    }
    
    // 3️⃣ بدء عملية الشراء والتأكد من توافق رصيد المحفظة الإلكترونية للعميل
    if (data.startsWith("buy_item#")) {
        const parts = data.split('#'); 
        let type = parts[1], catName = parts[2], item = parts[3], price = parseFloat(parts[4]);
        let userBal = db.users[uId]?.balance_usd || 0; 
        
        if (userBal < price) {
            return ctx.reply(`❌ رصيدك الحالي ($${userBal.toFixed(2)}) لا يكفي لإتمام عملية شراء [${item}] السعر المطلوب هو $${price}! اشحن محفظتك أولاً.`);
        }
        
        // حفظ بيانات الطلب مؤقتاً في جلسة المستخدم
        userStates[uId] = { type, name: catName, item, price, action: type === 'card' ? 'confirmed' : 'await_game_id' };
        
        if (type === 'card') {
            return ctx.reply(`🎯 **تأكيد شراء البطاقة الرقمية الفوري:**\n━━━━━━━━━━━━━━━━━━━━\n🎁 المنتج: *${item}*\n💵 السعر المطلوب: *${price}$*\n━━━━━━━━━━━━━━━━━━━━\nسيتم الخصم التلقائي وتوجيه الطلب للإدارة لتسليمك الكود فوراً!`, { 
                parse_mode: 'Markdown', 
                ...Markup.inlineKeyboard([[Markup.button.callback("✔️ تأكيد الدفع والخصم فوراً", "confirm_order")]]) 
            });
        }
        
        return ctx.reply(`✍️ يرجى كتابة رقم **الآيدي (ID)** الرقمي الصحيح والخاص بحسابك في لعبة *${catName}* للتحقق وإرسال الطلب:`, { parse_mode: 'Markdown' });
    }
}

module.exports = { handleShopCallback };
