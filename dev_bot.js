const { Markup } = require('telegraf');
const config = require('./config');

function initBotOrder(ctx, userStates, uId) {
    userStates[uId] = { action: 'await_bot_desc' };
    let msg = `🤖 **قسم إنشاء وتصميم البوتات الخاصة:**\n━━━━━━━━━━━━━━━━━━━━\n💰 **تفاصيل الأسعار المتوفرة:**\n• البوت العادي: يبدأ من *1$ إلى 25$*\n• البوت المتطور جداً والمحترف: يكلف *50$*\n━━━━━━━━━━━━━━━━━━━━\n✍️ اكتب الآن نوع البوت والمواصفات التي تريد برمجتها ورقم تواصلك بوضوح في رسالة واحدة:`;
    ctx.reply(msg, { parse_mode: 'Markdown' });
}

function handleServerChoice(ctx, data, uId, userStates) {
    const srvType = data.split('#')[1]; const state = userStates[uId]; if (!state) return;
    let srvName = srvType === 'strong' ? '🔥 سيرفر قوي 24 ساعة منظم' : '💤 سيرفر غير مدعوم بالكامل 12-18 ساعة';
    let adminMsg = `📥 **طلب تصميم بوت جديد للمطور:**\n━━━━━━━━━━━━━━━━━━━━\n👤 الزبون: ${ctx.from.first_name}\n🆔 آيدي التليجرام: \`${uId}\`\n📝 مواصفات البوت: *${state.desc}*\n🖥️ نوع السيرفر المختار: *${srvName}*`;
    
    ctx.telegram.sendMessage(config.ADMIN_CHANNEL_ID, adminMsg, { parse_mode: 'Markdown' });
    ctx.reply("🚀 تم إرسال مواصفات البوت واختيار السيرفر للمطور بنجاح تام! سيتم التواصل معك قريباً.");
    userStates[uId] = null;
}

function askServer(ctx, text, uId, userStates) {
    userStates[uId] = { desc: text, action: 'await_srv_choice' };
    let btn = Markup.inlineKeyboard([
        [Markup.button.callback("🔥 سيرفر قوي 24 ساعة منظم (5$ خاص / 2$ شهرياً + أسبوع مجاني)", "srv#strong")],
        [Markup.button.callback("💤 سيرفر عادي 12 إلى 18 ساعة", "srv#normal")]
    ]);
    ctx.reply("🖥️ **الآن اختر نوع السيرفر الذي تريد تشغيل البوت عليه:**", btn);
}

module.exports = { initBotOrder, handleServerChoice, askServer };

