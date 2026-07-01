const { Markup } = require('telegraf');
const config = require('./config');

function initBotOrder(ctx, userStates, uId) {
    userStates[uId] = { action: 'await_bot_desc' };
    ctx.reply(`🤖 **قسم إنشاء وتصميم البوتات الخاصة:**\n━━━━━━━━━━━━━━━━━━━━\n💰 **تفاصيل الأسعار:**\n• البوت العادي: من *1$ إلى 25$*\n• البوت المتطور جداً: يكلف *50$*\n━━━━━━━━━━━━━━━━━━━━\n✍️ اكتب الآن المواصفات ورقم تواصلك بوضوح في رسالة واحدة:`, { parse_mode: 'Markdown' });
}
function askServer(ctx, text, uId, userStates) {
    userStates[uId] = { desc: text, action: 'await_srv_choice' };
    let btn = Markup.inlineKeyboard([
        [Markup.button.callback("🔥 سيرفر قوي 24 ساعة منظم (5$/الشهر + أسبوع مجاناً)", "srv#strong")],
        [Markup.button.callback("💤 سيرفر عادي 12-18 ساعة (2$/الشهر)", "srv#normal")]
    ]);
    ctx.reply("🖥️ **الآن اختر نوع السيرفر الذي تريد تشغيل البوت عليه:**", btn);
}
function handleServerChoice(ctx, data, uId, userStates) {
    const srvType = data.split('#')[1]; const state = userStates[uId]; if (!state) return;
    let srvName = srvType === 'strong' ? '🔥 قوي 24 ساعة منظم (5$)' : '💤 عادي 12-18 ساعة (2$)';
    let adminMsg = `📥 **طلب بوت جديد للمطور:**\n👤 الزبون: ${ctx.from.first_name}\n🆔 الآيدي: \`${uId}\`\n📝 المواصفات: *${state.desc}*\n🖥️ السيرفر: *${srvName}*`;
    ctx.telegram.sendMessage(config.ADMIN_CHANNEL_ID, adminMsg, { parse_mode: 'Markdown' });
    ctx.reply("🚀 تم إرسال مواصفات البوت واختيار السيرفر للمطور بنجاح تام! سيتم التواصل معك قريباً.");
    userStates[uId] = null;
}
module.exports = { initBotOrder, askServer, handleServerChoice };

