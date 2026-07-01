const { Markup } = require('telegraf');
const custom = require('./custom_items');

function handleStore(ctx, data, uId, db, userStates) {
    if (data === "m#games" || data === "m#cards") { 
        const isGame = data === "m#games"; const source = isGame ? custom.MY_CUSTOM_GAMES : custom.MY_CUSTOM_CARDS; 
        if (!source || Object.keys(source).length === 0) return ctx.reply("⚠️ لا توجد فئات متوفرة حالياً في هذا القسم.");
        let buttons = Object.keys(source).map(g => [Markup.button.callback((isGame ? "🎮 " : "🎟️ ") + g, `${isGame ? 'vg#' : 'vc#'}${g}`)]); 
        return ctx.editMessageText(isGame ? "🎮 **اختر اللعبة المطلوبة:**" : "🎟️ **اختر نوع البطاقات:**", Markup.inlineKeyboard(buttons)); 
    }
    if (data.startsWith("vg#") || data.startsWith("vc#")) { 
        const isGame = data.startsWith("vg#"); const name = data.split('#')[1];
        const source = isGame ? custom.MY_CUSTOM_GAMES : custom.MY_CUSTOM_CARDS; const list = source[name] || []; 
        let buttons = list.map(item => { let pr = parseFloat(item.split('-')[1]) || 0; return [Markup.button.callback(item, `buy#${isGame?'game':'card'}#${name}#${item}#${pr}`)]; }); 
        return ctx.editMessageText(`🎯 **العروض المتاحة لـ ${name}:**`, Markup.inlineKeyboard(buttons)); 
    }
    if (data.startsWith("buy#")) {
        const parts = data.split('#'); let type = parts[1]; let name = parts[2]; let item = parts[3]; let price = parseFloat(parts[4]);
        let userBal = db.users[uId]?.balance_usd || 0; if (userBal < price) return ctx.reply(`❌ رصيدك الحالي ($${userBal.toFixed(2)}) لا يكفي!`);
        userStates[uId] = { type, name, item, price, action: type === 'card' ? 'confirmed' : 'await_game_id' };
        if (type === 'card') return ctx.reply(`🎯 **تأكيد شراء البطاقة:**\n🎁 المنتج: ${item}\n💵 السعر: ${price}$`, Markup.inlineKeyboard([[Markup.button.callback("✔️ تأكيد ودفع فوراً", "confirm_order")]]));
        return ctx.reply(`✍️ يرجى كتابة رقم **الآيدي (ID)** الخاص بحسابك في لعبة ${name}:`);
    }
}
module.exports = { handleStore };
