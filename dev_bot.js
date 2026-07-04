const { Markup } = require('telegraf');
const config = require('./config');

function initBotOrder(ctx, userStates, uId) {
    userStates[uId] = { action: 'await_bot_desc' };
    ctx.reply(`🤖 **مرحباً بك في قسم إنشاء البوتات:**\n━━━━━━━━━━━━━━━━━━━━\n✍️ اكتب مواصفات البوت الذي تريده:`);
}

function askContact(ctx, text, uId, userStates) {
    userStates[uId] = { desc: text, action: 'await_bot_contact' };
    ctx.reply(`✍️ أرسل رقم تواصلك أو Username:`);
}

function askServer(ctx, text, uId, userStates) {
    const state = userStates[uId];
    userStates[uId] = { ...state, contact: text, action: 'await_srv_choice' };
    const btn = Markup.inlineKeyboard([
        [Markup.button.callback("🔥 سيرفر قوي 24 ساعة", "srv#strong")],
        [Markup.button.callback("💤 سيرفر عادي 12-18 ساعة", "srv#normal")]
    ]);
    ctx.reply(`🖥️ **اختر نوع السيرفر:**\n• السعر يبدأ من 1$ إلى 25$\n• البوت المتطور 50$`, btn);
}

function handleServerChoice(ctx, data, uId, userStates, bot) {
    const srvType = data.split('#')[1];
    const state = userStates[uId];
    if (!state) return ctx.reply("❌ انتهت الجلسة، أعد المحاولة.");

    const srvName = srvType === 'strong' 
        ? '🔥 قوي ومحمي 24 ساعة (5$/الشهر + أسبوع مجاناً)'
        : '💤 متوسط 12-18 ساعة (2$/الشهر)';

    ctx.reply("🚀 جاري تأكيد طلبك وإرساله للإدارة...");

    const adminMsg = `📥 **طلب إنشاء بوت جديد:**\n━━━━━━━━━━━━━━━━━━━━\n👤 الزبون: ${ctx.from.first_name}\n🆔 الآيدي: \`${uId}\`\n💬 التواصل: *${state.contact}*\n📝 المواصفات: *${state.desc}*\n🖥️ السيرفر: *${srvName}*`;

    const btn = Markup.inlineKeyboard([
        [Markup.button.callback("💰 السعر", `bot_dec#price#${uId}`)],
        [Markup.button.callback("📝 الوصف", `bot_dec#desc#${uId}`)],
        [Markup.button.callback("⏰ الوقت", `bot_dec#time#${uId}`)],
        [Markup.button.callback("📂 إرسال ملف", `bot_dec#file#${uId}`)]
    ]);

    bot.telegram.sendMessage(config.ADMIN_CHANNEL_ID, adminMsg, {
        reply_markup: btn.reply_markup,
        parse_mode: 'Markdown'
    }).catch(() => {});
    
    userStates[uId] = null;
}

module.exports = { initBotOrder, askContact, askServer, handleServerChoice };
