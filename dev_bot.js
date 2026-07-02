const { Markup } = require('telegraf');
const config = require('./config');

function initBotOrder(ctx, userStates, uId) {
    userStates[uId] = { action: 'await_bot_desc' };
    ctx.reply(`🤖 **مرحباً بك في قسم إنشاء وتصميم البوتات الخاصة:**\n━━━━━━━━━━━━━━━━━━━━\n✍️ للبدء، يرجى كتابة **مواصفات البوت** الذي تريده بوضوح في رسالة واحدة:`);
}

function askContact(ctx, text, uId, userStates) {
    userStates[uId] = { desc: text, action: 'await_bot_contact' };
    ctx.reply(`✍️ **ممتاز، الآن أرسل رقم تواصلك أو اسم المستخدم (Username) الخاص بك:**`);
}

function askServer(ctx, text, uId, userStates) {
    const state = userStates[uId];
    userStates[uId] = { ...state, contact: text, action: 'await_srv_choice' };
    
    let btn = Markup.inlineKeyboard([
        [Markup.button.callback("🔥 سيرفر محمي 24 ساعة قوي ومنظم", "srv#strong")],
        [Markup.button.callback("💤 سيرفر متوسط إلى عادي 12-18 ساعة", "srv#normal")]
    ]);
    ctx.reply(`🖥️ **الآن اختر نوع السيرفر الذي تريد تشغيل البوت عليه:**\n\n• السعر يبدأ من 1$ إلى 25$\n• البوت المتطور (VIP) يكلف 50$`, btn);
}

function handleServerChoice(ctx, data, uId, userStates, bot) {
    const srvType = data.split('#')[1]; 
    const state = userStates[uId]; 
    if (!state) return ctx.reply("❌ انتهت الجلسة، أعد المحاولة.");
    
    let srvName = '';
    if (srvType === 'strong') {
        srvName = '🔥 قوي ومحمي 24 ساعة (5$/الشهر + أسبوع مجاناً)';
    } else {
        srvName = '💤 متوسط إلى عادي 12-18 ساعة (2$/الشهر)';
    }
    
    // إرسال رسالة التأكيد الفورية للزبون
    ctx.reply("🚀 **جاري تأكيد طلبك وإرسال السعر والوقت لك من قبل الإدارة...**");

    // إرسال الطلب المنظم لقناة الإدارة مع أزرار التحكم والقبول والرفض
    let adminMsg = `📥 **طلب إنشاء بوت جديد للمطور:**\n━━━━━━━━━━━━━━━━━━━━\n👤 الزبون: ${ctx.from.first_name}\n🆔 الآيدي: \`${uId}\`\n💬 التواصل: *${state.contact}*\n📝 المواصفات: *${state.desc}*\n🖥️ السيرفر: *${srvName}*`;
    
    let btn = Markup.inlineKeyboard([
        [Markup.button.callback("✔️ موافقة وتحديد السعر والوقت", `bot_dec#approve#${uId}`)],
        [Markup.button.callback("❌ رفض وإلغاء الطلب نهائياً", `bot_dec#reject#${uId}`)]
    ]);

    bot.telegram.sendMessage(config.ADMIN_CHANNEL_ID, adminMsg, { reply_markup: btn.reply_markup, parse_mode: 'Markdown' }).catch(()=>{});
    userStates[uId] = null;
}

module.exports = { initBotOrder, askContact, askServer, handleServerChoice };
