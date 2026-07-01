const config = require('./config');

function showSettings(ctx) {
    let msg = `⚙️ **قسم إعدادات الحساب والبيانات:**\n━━━━━━━━━━━━━━━━━━━━\n👤 الاسم الشخصي: *${ctx.from.first_name}*\n🆔 الآيدي (ID) الخاص بك: \`${ctx.chat.id}\`\n\n📌 يمكنك استخدام الآيدي الخاص بك عند التواصل مع الدعم الفني.`;
    ctx.reply(msg, { parse_mode: 'Markdown' });
}
function showSupport(ctx) {
    let msg = `📞 مركز الدعم الفني المباشر:\n━━━━━━━━━━━━━━━━━━━━\nإذا واجهتك أي مشكلة في الشحن، أو تأخر تسليم الكود، يرجى مراسلة الأدمن والمطور مباشرة عبر المعرف التالي:\n\n💬 الدعم الفني: ${config.DEVELOPER_USERNAME}\n\n⏱️ متواجدون لخدمتكم بأسرع وقت ممكن!`;
    ctx.reply(msg);
}
function showRefundPolicy(ctx) {
    let msg = `⚖️ **سياسة وشروط استرجاع الأموال:**\n━━━━━━━━━━━━━━━━━━━━\n1️⃣ يتم استرجاع الرصيد إلى محفظتك في حال تم رفض الطلب من قِبل الإدارة.\n2️⃣ الأكواد الرقمية المستلمة لا يمكن إلغاؤها بعد التسليم لضمان الأمان.\n3️⃣ إذا حدث خطأ في كتابة الآيدي الخاص بك، يرجى مراسلة الدعم الفني فوراً قبل معالجة الطلب.`;
    ctx.reply(msg, { parse_mode: 'Markdown' });
}
module.exports = { showSettings, showSupport, showRefundPolicy };
