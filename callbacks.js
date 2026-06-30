const { Markup } = require('telegraf');

async function handleStoreDecisions(ctx, bot, db, userStates, saveDB, uId) {
    const data = ctx.callbackQuery.data;
    if (!data.startsWith("pay_approve#") && !data.startsWith("pay_reject#") && !data.startsWith("order_dec#")) return false;

    if (data.startsWith("pay_approve#") || data.startsWith("pay_reject#")) {
        let parts = data.split('#'); let cId = parts[1];
        if (data.startsWith("pay_approve#")) {
            let usdValue = parseFloat(parts[2]); if (!db.users[cId]) db.users[cId] = { balance_usd: 0 }; 
            db.users[cId].balance_usd = (db.users[cId].balance_usd || 0) + usdValue; saveDB();
            ctx.editMessageText(ctx.callbackQuery.message.text + `\n\n✅ [تمت الموافقة الآلية وشحن الحساب بمبلغ $${usdValue}]`).catch(()=>{}); 
            return bot.telegram.sendMessage(cId, `🎉 **تم قبول وصل التحويل، وتم إيداع $${usdValue} في محفظتك بنجاح.**`);
        } else { 
            ctx.editMessageText(ctx.callbackQuery.message.text + `\n\n❌ [تم رفض وإلغاء هذا الوصل بنجاح]`).catch(()=>{}); 
            return bot.telegram.sendMessage(cId, `❌ **نعتذر منك، تم رفض إثبات شحن الرصيد المرسل من قبلك لمخالفته البيانات.**`); 
        }
    }
    if (data.startsWith("order_dec#")) {
        let parts = data.split('#'); let dec = parts[1]; let cId = parts[2]; let itemPrice = parseFloat(parts[3]); let itemName = parts[4];
        if (dec === "accept") {
            let userBal = db.users[cId]?.balance_usd || 0; if (userBal < itemPrice) return ctx.reply("❌ رصيد محفظة العميل لا يكفي حالياً للخصم إطلاقاً!");
            db.users[cId].balance_usd -= itemPrice; saveDB(); 
            ctx.editMessageText(ctx.callbackQuery.message.text + `\n\n✅ [تم قبول الطلب وخصم $${itemPrice} من محفظته]\n✍️ اكتب الآن كود الشحن لإرساله للزبون:`).catch(()=>{}); 
            userStates[uId] = { action: 'admin_send_code_now', clientUId: cId, item: itemName };
        } else { 
            ctx.editMessageText(ctx.callbackQuery.message.text + `\n\n❌ [تم رفض طلب الشراء بنجاح ولم يتم خصم شيء]`).catch(()=>{}); 
            return bot.telegram.sendMessage(cId, `❌ **نعتذر منك غالي، تم إلغاء ورفض طلبك لشراء ${itemName} من قبل الإدارة.**`); 
        }
    }
    return true;
}

module.exports = { handleStoreDecisions };
