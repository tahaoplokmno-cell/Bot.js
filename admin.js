const { Markup } = require('telegraf');

function getAdminPanel(db) {
    const totalUsers = Object.keys(db.users || {}).length;
    const currentRate = db.exchange_rate || 14500;
    const bannedCount = Object.keys(db.banned || {}).length;
    const adminNotes = db.admin_notes || "لا توجد ملاحظات مسجلة حالياً.";
    const maintenanceStatus = db.bot_maintenance ? "🛑 (قيد الصيانة حالياً)" : "🚀 (يعمل بنجاح)";

    let stats = `💀 **نظام السيطرة المطلقة الحية (SYSTEM CORE)** 💀\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `👥 الزبائن تحت المراقبة: *${totalUsers} زبون*\n` +
                `📈 سعر الصرف الحالي: *${currentRate.toLocaleString()} ل.س*\n` +
                `🚫 الحسابات المحظورة: *${bannedCount}*\n` +
                `⚙️ حالة السيستم العامة: *${maintenanceStatus}*\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `📝 **دفتر الملاحظات والأوامر:**\n_${adminNotes}_\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `🎛️ **لوحة التحكم المباشرة بالسيستم والأزرار وعروض المتجر:**`;

    return {
        text: stats,
        markup: Markup.inlineKeyboard([
            [Markup.button.callback("📝 تعديل الملاحظات", "adm#edit_notes"), Markup.button.callback("📈 تعديل سعر الصرف", "adm#edit_rate")],
            [Markup.button.callback("🎁 شحن رصيد يدوياً", "adm#gift_user"), Markup.button.callback("📌 بث وتثبيت رسالة", "adm#pin_msg")],
            [Markup.button.callback("🚫 حظر حساب (BAN)", "adm#ban_user"), Markup.button.callback("🟢 فك حظر حساب", "adm#unban_user")],
            [Markup.button.callback("⚙️ إيقاف/تشغيل البوت (الصيانة)", "adm#toggle_bot")],
            [Markup.button.callback("➕ إنشاء زر قسم بالمتجر", "adm#add_cat"), Markup.button.callback("➕ إضافة شدات وعروض", "adm#add_offer")],
            [Markup.button.callback("🗑️ حذف قسم بالكامل", "adm#del_offer"), Markup.button.callback("💵 تصفير كلي للأرصدة", "adm#zero_balance")],
            [Markup.button.callback("💳 سحب قاعدة البيانات", "adm#get_backup"), Markup.button.callback("❌ إغلاق لوحة التحكم", "adm#close_panel")]
        ])
    };
}

module.exports = { getAdminPanel };
