// order_handler.js
const { Markup } = require('telegraf');

function handleOrderCallbacks(bot, ctx, data, uId, userStates, saveDB, db, config) {
    if (!data.startsWith("order_dec#")) return false;
    
    const parts = data.split("#");
    const action = parts[1];
    const clientUId = parts[2];
    const price = parseFloat(parts[3]);

    if (action === "accept") {
        if (db.users && db.users[clientUId]) {
            const currentBal = db.users[clientUId].balance_usd || 0;
            if (currentBal >= price) {
                db.users[clientUId].balance_usd = currentBal - price;
                saveDB();
                userStates[uId] = { action: 'admin_send_code_now', clientUId: clientUId };
                ctx.reply(`✅ تم قبول الطلب وخصم $${price} من الزبون.\n\n✍️ أرسل كود الشحن الآن لتسليمه فوراً:`);
            } else {
                ctx.reply("⚠️ رصيد الزبون غير كافٍ حالياً!");
            }
        } else {
            ctx.reply("❌ لم يتم العثور على حساب الزبون.");
        }
    } else if (action === "reject") {
        bot.telegram.sendMessage(clientUId, "❌ نعتذر منك، لقد تم رفض طلب الشراء من قِبل الإدارة.").catch(()=>{});
        ctx.reply("❌ تم رفض الطلب وإبلاغ الزبون.");
    }
    return true;
}

module.exports = { handleOrderCallbacks };
