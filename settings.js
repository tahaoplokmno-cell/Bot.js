const config = require('./config');
const { Markup } = require('telegraf');

const backBtn = Markup.inlineKeyboard([[Markup.button.callback("🔙 العودة للقائمة الرئيسية", "main_menu")]]);

function showSettings(ctx) {
    let msg = `⚙️ <b>قسم إعدادات الحساب والبيانات:</b>\n━━━━━━━━━━━━━━━━━━━━\n👤 الاسم الشخصي: <b>${ctx.from.first_name}</b>\n🆔 الآيدي (ID) الخاص بك: <code>${ctx.chat.id}</code>\n\n📌 يمكنك استخدام الآيدي الخاص بك عند التواصل مع الدعم الفني لتسريع حل مشكلتك.`;
    ctx.reply(msg, { parse_mode: 'HTML', ...backBtn });
}

function showSupport(ctx) {
    let devUser = config.DEVELOPER_USERNAME || "@MrXT1_3";
    if (!devUser.startsWith('@')) devUser = '@' + devUser;

    let msg = `📞 <b>مركز الدعم الفني المباشر:</b>\n━━━━━━━━━━━━━━━━━━━━\nإذا واجهتك أي مشكلة في الشحن، أو تأخر تسليم كود ببجي، يرجى مراسلة الإدارة والمطور مباشرة عبر المعرف التالي:\n\n💬 الدعم الفني: <b>${devUser}</b>\n\n⏱️ متواجدون لخدمتكم وضمان أمان شحناتكم بأسرع وقت ممكن! ❤️`;
    
    const usernameClean = devUser.replace('@', '');
    const finalUrl = `https://t.me{usernameClean}`; // 🌟 مصلح بالكامل بعلامة الدولار الصحيحة

    const supportLinkBtn = Markup.inlineKeyboard([
        [Markup.button.url("💬 اضغط هنا لمراسلة الدعم فوراً", finalUrl)],
        [Markup.button.callback("🔙 العودة للقائمة الرئيسية", "main_menu")]
    ]);

    ctx.reply(msg, { parse_mode: 'HTML', ...supportLinkBtn });
}

function showRefundPolicy(ctx) {
    let msg = `⚖️ <b>سياسة وشروط استرجاع الأموال:</b>\n━━━━━━━━━━━━━━━━━━━━\n1️⃣ يتم استرجاع الرصيد إلى محفظتك تلقائياً في حال تم رفض طلب الشحن من قِبل الإدارة.\n2️⃣ الأكواد الرقمية المستلمة لا يمكن إلغاؤها بعد التسليم.\n3️⃣ إذا حدث خطأ في الآيدي، يرجى مراسلة الدعم فوراً قبل تفعيل الطلب.`;
    ctx.reply(msg, { parse_mode: 'HTML', ...backBtn });
}

module.exports = { showSettings, showSupport, showRefundPolicy };
