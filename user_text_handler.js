const config = require('./config');
const devBot = require('./dev_bot');

async function handleUserTexts(ctx, bot, db, userStates, saveDB, uId, state) {
    if (state.action === 'await_gift_uid') { 
        userStates[uId] = { action: 'await_gift_amount', targetUid: ctx.message.text }; 
        return ctx.reply("💰 اكتب الآن المبلغ بالدولار لشحنه له مباشرة:"); 
    }
    if (state.action === 'await_gift_amount') { 
        let amt = parseFloat(ctx.message.text); 
        if(!isNaN(amt)){ 
            db.users[state.targetUid].balance_usd = (db.users[state.targetUid].balance_usd || 0) + amt; saveDB(); 
            ctx.reply("✅ تم إضافة الرصيد يدوياً!"); 
            bot.telegram.sendMessage(state.targetUid, `🎉 تم إيداع رصيد هدية بقيمة $${amt}`); 
        } 
        userStates[uId] = { action: 'admin_dashboard' }; return; 
    }
    if (state.action === 'await_bot_desc' && ctx.message.text) return devBot.askServer(ctx, ctx.message.text, uId, userStates);
    
    if (state.action === 'await_refund_amount' && ctx.message.text) {
        let uBal = db.users[uId]?.balance_usd || 0; let rate = db.exchange_rate || 14500;
        let refundMsg = `⚠️ **طلب استرجاع أموال جديد:**\n━━━━━━━━━━━━━━━━━━━━\n👤 الزبون: ${ctx.from.first_name}\n🆔 الآيدي: \`${uId}\`\n💰 **إجمالي رصيده:** *$${uBal.toFixed(2)}* (${(uBal * rate).toLocaleString()} ل.س)\n📝 **المبلغ والتفاصيل:**\n${ctx.message.text}`;
        await bot.telegram.sendMessage(config.ADMIN_CHANNEL_ID, refundMsg, { parse_mode: 'Markdown' }).catch(console.error);
        ctx.reply("🚀 تم إرسال طلب استرجاع الأموال بنجاح! سيتم مراجعة رصيدك وتحويل المستحقات قريباً.");
        userStates[uId] = null; return;
    }
}
module.exports = { handleUserTexts };
