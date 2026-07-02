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
    const srvType = data.split('#')[1]; 
    const state = userStates[uId]; 
    if (!state) return ctx.reply("❌ انتهت الجلسة، أعد المحاولة.");
    
    let srvName = srvType === 'strong' ? '🔥 قوي 24 ساعة منظم (5$)' : '💤 عادي 12-18 ساعة (2$)';
    userStates[uId] = { ...state, srvName, action: 'await_admin_price_time' };

    // توجيه الأدمن لكتابة السعر والوقت لتأكيد الطلب
    ctx.reply(`✍️ **حسناً الأدمن الملكي:**\nيرجى كتابة السعر والوقت المقدرين لتصميم البوت الآن لإرسالهما في قناة الإدارة مع الطلب (مثال: السعر 20$ والوقت يومين):`);
}

// دالة إرسال الطلب النهائي لقناة الإدارة بعد تحديد السعر والوقت من الأدمن
async function sendToAdminChannel(ctx, txt, uId, userStates, bot) {
    const state = userStates[uId];
    if (!state) return;

    ctx.reply("🚀 تم إرسال مواصفات البوت واختيار السيرفر، السعر، والوقت للمطور بنجاح تام! سيتم التواصل معك والبدء قريباً.");
    
    let adminMsg = `📥 **طلب إنشاء بوت جديد قيد التأثير:**\n━━━━━━━━━━━━━━━━━━━━\n👤 الزبون: ${ctx.from.first_name}\n🆔 الآيدي: \`${uId}\`\n📝 المواصفات: *${state.desc}*\n🖥️ السيرفر المحدد: *${state.srvName}*\n💰 السعر والوقت المحددين: *${txt}*`;
    
    // أزرار القبول والرفض والأرشفة التلقائية لقناة الإدارة
    let btn = Markup.inlineKeyboard([
        [Markup.button.callback("✔️ موافقة وأرشفة الطلب لإرسال الملف لاحقاً", `bot_dec#approve#${uId}#${txt.replace(/#/g, '')}`)],
        [Markup.button.callback("❌ رفض وإلغاء الطلب نهائياً", `bot_dec#reject#${uId}`)]
    ]);

    await bot.telegram.sendMessage(config.ADMIN_CHANNEL_ID, adminMsg, { reply_markup: btn.reply_markup, parse_mode: 'Markdown' }).catch(()=>{});
    userStates[uId] = null;
}

module.exports = { initBotOrder, askServer, handleServerChoice, sendToAdminChannel };
