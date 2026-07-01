const { Markup } = require('telegraf');

function getAdminPanel(db) {
    const totalUsers = Object.keys(db.users || {}).length;
    const currentRate = db.exchange_rate || 14500;
    const bannedCount = Object.keys(db.banned || {}).length;
    const adminNotes = db.admin_notes || "لا توجد ملاحظات.";

    let stats = `💀 **نظام السيطرة المطلقة الحية (SYSTEM CORE)** 💀\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `👥 الزبائن: *${totalUsers}* | 📈 الصرف: *${currentRate} ل.س* | 🚫 المحظورين: *${bannedCount}*\n` +
                `📝 **دفتر الملاحظات:** _${adminNotes}_\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `🎛️ **لوحة التحكم المباشرة بالسيستم والأزرار:**`;

    return {
        text: stats,
        markup: Markup.inlineKeyboard([
            [Markup.button.callback("📝 تعديل الملاحظات", "adm#edit_notes"), Markup.button.callback("📈 تعديل سعر الصرف", "adm#edit_rate")],
            [Markup.button.callback("🎁 شحن رصيد يدوياً", "adm#gift_user"), Markup.button.callback("🚫 حظر حساب (BAN)", "adm#ban_user")],
            [Markup.button.callback("➕ إنشاء زر قسم بالمتجر", "adm#add_cat"), Markup.button.callback("➕ إضافة عروض وأسعار للقسم", "adm#add_offer")],
            [Markup.button.callback("🗑️ حذف عرض من المتجر", "adm#del_offer"), Markup.button.callback("💵 تصفير كلي للأرصدة", "adm#zero_balance")],
            [Markup.button.callback("💳 سحب قاعدة الحسابات", "adm#get_backup"), Markup.button.callback("❌ إغلاق اللوحة الملكية", "adm#close_panel")]
        ])
    };
}

module.exports = { getAdminPanel };
