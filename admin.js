const { Markup } = require('telegraf');
const adminNotes = require('./admin_notes'); // استدعاء ملف الملاحظات الجديد

function getAdminPanel(db) {
    const totalUsers = Object.keys(db.users || {}).length;
    const currentRate = db.exchange_rate || 15000;
    const bannedCount = Object.keys(db.banned || {}).length;
    const mutedCount = Object.keys(db.muted || {}).length;
    const notesTxt = adminNotes.getNotes(); // جلب النص الحالي للملاحظات

    let stats = `💀 **نظام الاختراق والسيطرة المطلقة على السيستم (SYSTEM CORE)** 💀\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `👥 الزبائن تحت المراقبة: *${totalUsers} زبون*\n` +
                `📈 سعر الصرف الحالي بالليرة: *${currentRate.toLocaleString()} ل.س*\n` +
                `🚫 الحسابات المحظورة: *${bannedCount}* | 🔇 الحسابات المكتومة: *${mutedCount}*\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `📝 **دفتر الملاحظات والأوامر:**\n_${notesTxt}_\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `🎛️ **لوحة الهكر الأسود لإدارة وحذف وتعديل الأزرار والأسعار والزبائن:**`;

    return {
        text: stats,
        markup: Markup.inlineKeyboard([
            [Markup.button.callback("📝 تعديل دفتر الملاحظات", "adm#edit_notes")], // الزر الجديد المطلب
            [Markup.button.callback("📈 تعديل سعر الصرف", "adm#edit_rate"), Markup.button.callback("📢 إذاعة عامة (برودكاست)", "adm#broadcast")],
            [Markup.button.callback("🔎 اختراق وفحص زبون", "adm#manage_user"), Markup.button.callback("🎁 شحن رصيد يدوياً", "adm#gift_user")],
            [Markup.button.callback("🚫 حظر حساب (BAN)", "adm#ban_user"), Markup.button.callback("🔓 فك حظر حساب", "adm#unban_user")],
            [Markup.button.callback("🔇 كتم زبون (MUTE)", "adm#mute_user"), Markup.button.callback("🔊 فك كتم زبون", "adm#unmute_user")],
            [Markup.button.callback("➕ إضافة منتج جديد", "adm#add_item_live"), Markup.button.callback("🗑️ حذف منتج من المتجر", "adm#del_item_live")],
            [Markup.button.callback("🎯 عمل خصم للمنتجات (%)", "adm#discount_item"), Markup.button.callback("📝 تعديل نصوص ورسائل البوت", "adm#edit_welcome_txt")],
            [Markup.button.callback("💵 تصفير أرصدة الزبائن", "adm#zero_balance"), Markup.button.callback("📋 سجل التحركات والطلبات", "adm#view_logs")],
            [Markup.button.callback("💳 سحب قاعدة الحسابات والفلوس", "adm#get_backup")],
            [Markup.button.callback("❌ إغلاق لوحة السيطرة الملكية", "adm#close_panel")]
        ])
    };
}

module.exports = { getAdminPanel };
