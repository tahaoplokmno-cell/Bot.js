const config = require('./config');
const { Markup } = require('telegraf');

// زر العودة السريع للقائمة الرئيسية لسهولة التصفح
const backBtn = Markup.inlineKeyboard([[Markup.button.callback("🔙 العودة للقائمة الرئيسية", "main_menu")]]);

function showSettings(ctx) {
    let msg = `⚙️ **قسم إعدادات الحساب والبيانات:**\n━━━━━━━━━━━━━━━━━━━━\n👤 الاسم الشخصي: *${ctx.from.first_name}*\n🆔 الآيدي (ID) الخاص بك: \`${ctx.chat.id}\`\n\n📌 يمكنك استخدام الآيدي الخاص بك عند التواصل مع الدعم الفني لتسريع حل مشكلتك.`;
    ctx.reply(msg, { parse_mode: 'Markdown', ...backBtn });
}

function showSupport(ctx) {
    // جلب معرف المطور من ملف الكونفج بشكل آمن وضمان وجود علامة @
    let devUser = config.DEVELOPER_USERNAME || "@ShamInGame_Support";
    if (!devUser.startsWith('@')) devUser = '@' + devUser;

    let msg = `📞 **مركز الدعم الفني المباشر:**\n━━━━━━━━━━━━━━━━━━━━\nإذا واجهتك أي مشكلة في الشحن، أو تأخر تسليم كود ببجي، يرجى مراسلة الإدارة والمطور مباشرة عبر المعرف التالي:\n\n💬 الدعم الفني: ${devUser}\n\n⏱️ متواجدون لخدمتكم وضمان أمان شحناتكم بأسرع وقت ممكن! ❤️`;
    
    // إنشاء زر ينقل الزبون مباشرة لمحادثة الدعم الخاصة بك
    const supportLinkBtn = Markup.inlineKeyboard([
        [Markup.button.url("💬 اضغط هنا لمراسلة الدعم فوراً", `https://t.me{devUser.replace('@', '')}`)],
        [Markup.button.callback("🔙 العودة للقائمة الرئيسية", "main_menu")]
    ]);

    ctx.reply(msg, { parse_mode: 'Markdown', ...supportLinkBtn });
}

function showRefundPolicy(ctx) {
    let msg = `⚖️ **سياسة وشروط استرجاع الأموال:**\n━━━━━━━━━━━━━━━━━━━━\n1️⃣ يتم استرجاع الرصيد إلى محفظتك تلقائياً في حال تم رفض طلب الشحن من قِبل الإدارة.\n2️⃣ الأكواد الرقمية المستلمة (شدات، بطاقات) لا يمكن إلغاؤها أو إرجاعها بعد التسليم لضمان أمان النظام.\n3️⃣ إذا حدث خطأ في كتابة آيدي اللعبة الخاص بك، يرجى مراسلة الدعم الفني فوراً قبل قبول الطلب وتفعيله.`;
    ctx.reply(msg, { parse_mode: 'Markdown', ...backBtn });
}

module.exports = { showSettings, showSupport, showRefundPolicy };
