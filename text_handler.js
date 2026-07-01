// text_handler.js
const admin = require('./admin');

async function handleAllTexts(bot, ctx, uId, state, userStates, db, saveDB, config, charge, devBot) {
    if (state.action === 'await_password' && ctx.message.text === config.ADMIN_PASSWORD) { 
        userStates[uId] = { action: 'admin_dashboard' }; 
        return ctx.reply("✅ تم التحقق! اكتب الآن /panel لفتح اللوحة."); 
    }
    
    if (state.action === 'await_refund_amount' && ctx.message.text) {
        let uBal = db.users[uId]?.balance_usd || 0; 
        let rate = db.exchange_rate || 14500;
        let refundMsg = `⚠️ **طلب استرجاع أموال جديد:**\n👤 الزبون: ${ctx.from.first_name}\n🆔 الآيدي: \`${uId}\`\n💰 رصيده: *$${uBal.toFixed(2)}*\n📝 **التفاصيل:**\n${ctx.message.text}`;
        await bot.telegram.sendMessage(config.ADMIN_CHANNEL_ID, refundMsg, { parse_mode: 'Markdown' }).catch(console.error);
        ctx.reply("🚀 تم إرسال طلب استرجاع الأموال للإدارة بنجاح!");
        userStates[uId] = null; return;
    }

    if (state.action === 'admin_send_code_now' && ctx.message.text) { 
        const targetClient = state.clientUId;
        if (targetClient) {
            await bot.telegram.sendMessage(targetClient, `🎁 **وصلك كود الشحن الخاص بطلبك:**\n\n\`${ctx.message.text}\`\n\n1️⃣ موقع الشحن: midasbuy.com\n⚠️ شغّل VPN إذا كنت داخل سوريا.`, { parse_mode: 'Markdown' }).catch(console.error);
            ctx.reply("✅ تم تسليم الكود بنجاح.");
        } else {
            ctx.reply("❌ خطأ: لم يتم التعرف على آيدي الزبون.");
        }
        userStates[uId] = null; return; 
    }

    if (state.action === 'await_game_id' && ctx.message.text) { 
        userStates[uId] = { ...state, action: 'confirmed', gameId: ctx.message.text }; 
        return ctx.reply(`🎯 **تأكيد الطلب:**\n🆔 الآيدي: \`${ctx.message.text}\`\n🎁 المنتج: *${state.item}*`, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: "✔️ تأكيد ودفع", callback_data: "confirm_order" }]] } }); 
    }

    if (state.action.startsWith('await_charge') || state.action === 'await_proof') return charge.handleChargeSteps(ctx, state, uId, userStates, db);
    if (state.action === 'await_bot_desc' && ctx.message.text) return devBot.askServer(ctx, ctx.message.text, uId, userStates);
}

module.exports = { handleAllTexts };
