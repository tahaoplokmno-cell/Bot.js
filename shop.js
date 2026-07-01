const { Markup } = require('telegraf');

function handleStore(ctx, data, uId, db, userStates) {
    const backToMain = [Markup.button.callback("🔙 العودة للقائمة الرئيسية", "main_menu")];
    if (!db.custom_store) db.custom_store = { games: {}, cards: {} };

    if (data === "m#games" || data === "m#cards") { 
        const isGame = data === "m#games"; 
        const source = isGame ? db.custom_store.games : db.custom_store.cards; 
        
        if (!source || Object.keys(source).length === 0) return ctx.reply("⚠️ لا توجد أقسام متوفرة حالياً، اصنع قسماً من لوحة الأدمن!");
        let buttons = Object.keys(source).map(g => [Markup.button.callback((isGame ? "🎮 " : "🎟️ ") + g, `${isGame ? 'vg#' : 'vc#'}${g}`)]); 
        buttons.push(backToMain);
        return ctx.editMessageText(isGame ? "🎮 **اختر القسم المطلوب للبدء والشراء:**" : "🎟️ **اختر نوع البطاقات:**", { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }).catch(()=>{}); 
    }
    
    if (data.startsWith("vg#") || data.startsWith("vc#")) { 
        const isGame = data.startsWith("vg#"); const name = data.split('#')[1];
        const source = isGame ? db.custom_store.games : db.custom_store.cards; const list = source[name] || []; 
        
        if (list.length === 0) return ctx.reply("⚠️ لا توجد عروض أسعار داخل هذا القسم حالياً!");
        let buttons = list.map(item => { let pr = parseFloat(item.split('-')[1]) || 0; return [Markup.button.callback(item, `buy#${isGame?'game':'card'}#${name}#${item}#${pr}`)]; }); 
        buttons.push([Markup.button.callback("🔙 رجوع للخلف", isGame ? "m#games" : "m#cards")], backToMain);
        return ctx.editMessageText(`🎯 **العروض المتاحة لـ ${name}:**`, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }).catch(()=>{}); 
    }
    
    if (data.startsWith("buy#")) {
        const parts = data.split('#'); let type = parts[1], name = parts[2], item = parts[3], price = parseFloat(parts[4]);
        let userBal = db.users[uId]?.balance_usd || 0; if (userBal < price) return ctx.reply(`❌ رصيدك الحالي ($${userBal.toFixed(2)}) لا يكفي لشراء [${item}]!`);
        
        userStates[uId] = { type, name, item, price, action: type === 'card' ? 'confirmed' : 'await_game_id' };
        if (type === 'card') return ctx.reply(`🎯 **تأكيد شراء البطاقة:**\n🎁 المنتج: *${item}*\n💵 السعر: *${price}$*`, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback("✔️ تأكيد ودفع فوراً", "confirm_order")]]) });
        return ctx.reply(`✍️ يرجى كتابة رقم **الآيدي (ID)** الخاص بحسابك في لعبة *${name}*:`, { parse_mode: 'Markdown' });
    }
}
module.exports = { handleStore };
