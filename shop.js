const { Markup } = require('telegraf');
const custom = require('./custom_items');

function handleStore(ctx, data, uId, db, userStates) {
    // أزرار العودة والتحكم لراحة الزبون
    const backToMain = [Markup.button.callback("🔙 العودة للقائمة الرئيسية", "main_menu")];

    // 1. عرض فئات الألعاب أو البطاقات
    if (data === "m#games" || data === "m#cards") { 
        const isGame = data === "m#games"; 
        const source = isGame ? custom.MY_CUSTOM_GAMES : custom.MY_CUSTOM_CARDS; 
        
        if (!source || Object.keys(source).length === 0) {
            return ctx.reply("⚠️ لا توجد فئات متوفرة حالياً في هذا القسم.");
        }
        
        // رسم الأزرار مع إضافة زر العودة في الأسفل
        let buttons = Object.keys(source).map(g => [Markup.button.callback((isGame ? "🎮 " : "🎟️ ") + g, `${isGame ? 'vg#' : 'vc#'}${g}`)]); 
        buttons.push(backToMain); // إضافة زر العودة أسفل الألعاب
        
        return ctx.editMessageText(
            isGame ? "🎮 **اختر اللعبة المطلوبة للبدء والشراء:**" : "🎟️ **اختر نوع البطاقات المتاحة:**", 
            { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
        ).catch(console.error); 
    }
    
    // 2. عرض العروض والأسعار المتاحة للعبة أو البطاقة المحددة
    if (data.startsWith("vg#") || data.startsWith("vc#")) { 
        const isGame = data.startsWith("vg#"); 
        const name = data.split('#')[1];
        const source = isGame ? custom.MY_CUSTOM_GAMES : custom.MY_CUSTOM_CARDS; 
        const list = source[name] || []; 
        
        if (list.length === 0) {
            return ctx.reply("⚠️ لا توجد عروض متوفرة لهذه الفئة حالياً.");
        }

        let buttons = list.map(item => { 
            let pr = parseFloat(item.split('-')[1]) || 0; 
            return [Markup.button.callback(item, `buy#${isGame ? 'game' : 'card'}#${name}#${item}#${pr}`)]; 
        }); 
        
        // زر للرجوع للقسم السابق (ألعاب أو بطاقات) بدل الخروج نهائياً
        buttons.push([Markup.button.callback("🔙 رجوع للخلف", isGame ? "m#games" : "m#cards")]);
        buttons.push(backToMain);
        
        return ctx.editMessageText(
            `🎯 **العروض والأسعار المتاحة لـ ${name}:**\n━━━━━━━━━━━━━━━━━━━━`, 
            { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
        ).catch(console.error); 
    }
    
    // 3. معالجة الضغط على عرض معين وبدء عملية الشراء
    if (data.startsWith("buy#")) {
        const parts = data.split('#'); 
        let type = parts[1]; 
        let name = parts[2]; 
        let item = parts[3]; 
        let price = parseFloat(parts[4]);
        
        // فحص رصيد محفظة الزبون قبل الشراء لضمان الأمان المالي
        let userBal = db.users[uId]?.balance_usd || 0; 
        if (userBal < price) {
            return ctx.reply(`❌ نعتذر منك، رصيدك الحالي ($${userBal.toFixed(2)}) غير كافٍ لإتمام شراء [${item}]!\n\n💳 يرجى شحن محفظتك أولاً ثم إعادة الطلب.`);
        }
        
        // تخزين تفاصيل الطلب في حالة المستخدم المؤقتة
        userStates[uId] = { type, name, item, price, action: type === 'card' ? 'confirmed' : 'await_game_id' };
        
        // إذا كان منتج بطاقة رقمية، يظهر زر التأكيد الفوري والدفع
        if (type === 'card') {
            return ctx.reply(
                `🎯 **تأكيد شراء البطاقة الرقمية:**\n━━━━━━━━━━━━━━━━━━━━\n🎁 المنتج المطلوب: *${item}*\n💵 السعر الإجمالي: *${price}$*`, 
                { 
                    parse_mode: 'Markdown', 
                    ...Markup.inlineKeyboard([[Markup.button.callback("✔️ تأكيد ودفع فوراً", "confirm_order")]]) 
                }
            );
        }
        
        // إذا كان شحن ألعاب (ببجي)، يطلب منه كتابة آيدي اللعبة أولاً
        return ctx.reply(`✍️ **خطوة أخيرة:** يرجى كتابة رقم **الآيدي (ID)** الصحيح والخاص بحسابك في لعبة *${name}* لشحنها لك يدوياً:`, { parse_mode: 'Markdown' });
    }
}

module.exports = { handleStore };
