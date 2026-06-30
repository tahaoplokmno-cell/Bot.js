const { Markup } = require('telegraf');

function getAdminPanel(db) {
    let stats = `👑 **لوحة التحكم الملكية العظمى للمدير** 👑\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `👥 **عدد زبائن المتجر:** ${Object.keys(db.users || {}).length} زبون\n` +
                `📈 **سعر الصرف الحالي:** 1$ = ${db.exchange_rate || 15000} ل.س\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `🎛️ **خيارات التحكم السريع بالسيستم:**`;
                
    return {
        text: stats,
        markup: Markup.inlineKeyboard([
            [Markup.button.callback("📈 تعديل سعر الصرف اليومي", "adm#edit_rate")],
            [Markup.button.callback("🎁 شحن / إهداء رصيد لزبون", "adm#gift_user")],
            [Markup.button.callback("📢 عمل إذاعة عامة (برودكاست)", "adm#broadcast")],
            [Markup.button.callback("💳 سحب نسخة احتياطية للفلوس", "adm#get_backup")],
            [Markup.button.callback("❌ إغلاق اللوحة الملكية", "adm#close_panel")]
        ])
    };
}

module.exports = { getAdminPanel };
