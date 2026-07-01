const { Markup } = require('telegraf');
const custom = require('./custom_items');

function handleStore(ctx, data, uId, db, userStates) {
    if (data === "m#games" || data === "m#cards") { 
        const isGame = data === "m#games"; const source = isGame ? custom.MY_CUSTOM_GAMES : custom.MY_CUSTOM_CARDS; 
        let buttons = Object.keys(source).map(g => [Markup.button.callback((isGame ? "🎮 " : "🎟️ ") + g, `vg#${g}`)]); 
        return ctx.editMessageText(isGame ? "🎮 **اختر اللعبة المطلوبة:**" : "🎟️ **اختر نوع البطاقات:**", Markup.inlineKeyboard(buttons)); 
    }
    if (data.startsWith("vg#")) { 
        const name = data.split('#')[1]; const list = custom.MY_CUSTOM_GAMES[name] || []; 
        let buttons = list.map(item => { let pr = parseFloat(item.split('-')[1]) || 0; return [Markup.button.callback(item, `buy#game#${name}#${item}#${pr}`)]; }); 
        return ctx.editMessageText(`🎯 **العروض والأسعار المتوفرة لـ ${name}:**`, Markup.inlineKeyboard(buttons)); 
    }
    if (data.startsWith("buy#")) {
        const parts = data.split('#'); let type = parts[1]; let name = parts[2]; let item = parts[3]; let price = parseFloat(parts[4]);
        let userBal = db.users[uId]?.balance_usd || 0;
        if (userBal < price) return ctx.reply(`❌ رصيدك الحالي ($${userBal.toFixed(2)}) لا يكفي لشراء هذا المنتج البالغ سعره $${price}! يرجى شحن محفظتك أولاً.`);
        userStates[uId] = { type, name, item, price, action: 'await_game_id' };
        return ctx.reply(`✍️ يرجى كتابة رقم **الآيدي (ID)** الخاص بحسابك في لعبة ${name} بدقة للمتابعة:`);
    }
}
module.exports = { handleStore };
