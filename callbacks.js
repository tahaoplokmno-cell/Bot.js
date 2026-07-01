const { Markup } = require('telegraf');

async function handleStoreDecisions(ctx, bot, db, userStates, saveDB, uId) {
    const data = ctx.callbackQuery.data;
    if (!data.startsWith("pay_approve#") && !data.startsWith("pay_reject#") && !data.startsWith("order_dec#")) return false;
    let parts = data.split('#');
    if (data.startsWith("pay_approve#") || data.startsWith("pay_reject#")) {
        let cId = parts[1];
        if (data.startsWith("pay_approve#")) {
            let val = parseFloat(parts[2]); let isUsd = parts[3] === 'usd';
            if (!db.users[cId]) db.users[cId] = { balance_usd: 0 }; 
            let finalUsd = isUsd ? val : (val / (db.exchange_rate || 15000));
            db.users[cId].balance_usd = (db.users[cId].balance_usd || 0) + finalUsd; saveDB();
            ctx.editMessageText(ctx.callbackQuery.message.text + `\n\n✅ [تم قبول الوصل وشحن الحساب بـ $${finalUsd.toFixed(2)}]`).catch(()=>{}); 
            return bot.telegram.sendMessage(cId, `🎉 **تم قبول وصل التحويل، وتم إيداع $${finalUsd.toFixed(2)} في محفظتك بنجاح.**`);
        } else { 
            ctx.editMessageText(ctx.callbackQuery.message.text + `\n\n❌ [تم رفض وإلغاء هذا الوصل]`).catch(()=>{}); 
            return bot.telegram.sendMessage(cId, `❌ **تم رفض إثبات شحن الرصيد المرسل من قبلك لمخالفته البيانات.**`); 
        }
    }
    if (data.startsWith("order_dec#")) {
        let dec = parts[1]; let cId = parts[2]; let pr = parseFloat(parts[3]);
        if (dec === "accept") {
            let userBal = db.users[cId]?.balance_usd || 0; if (userBal < pr) return ctx.reply("❌ رصيد محفظة العميل لا يكفي للخصم حالياً!");
            db.users[cId].balance_usd -= pr; saveDB(); 
            ctx.editMessageText(ctx.callbackQuery.message.text + `\n\n✅ [تم قبول الطلب وخصم $${pr} من محفظته]\n✍️ اكتب الآن كود الشحن لإرساله للزبون مباشرة:`).catch(()=>{}); 
            userStates[uId] = { action: 'admin_send_code_now', clientUId: cId };
        } else { 
            ctx.editMessageText(ctx.callbackQuery.message.text + `\n\n❌ [تم رفض طلب الشراء بنجاح ولم يتم خصم شيء]`).catch(()=>{}); 
            return bot.telegram.sendMessage(cId, `❌ **نعتذر منك غالي، تم إلغاء ورفض طلبك لشراء المنتج من قبل الإدارة.**`); 
        }
    }
    return true;
}
module.exports = { handleStoreDecisions };
