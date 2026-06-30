const { Markup } = require('telegraf');

/**
 * توليد اللوحة الخارقة والملكية المطلقة للمدير (MAIN SYSTEM CONTROL PANEL)
 */
function getAdminPanel(db) {
    // جلب الإحصائيات الحية لتعزيز نظام المراقبة
    const totalUsers = Object.keys(db.users || {}).length;
    const currentRate = db.exchange_rate || 15000;
    const bannedCount = Object.keys(db.banned || {}).length;
    const mutedCount = Object.keys(db.muted || {}).length;

    let stats = `💀 **نظام الاختراق والسيطرة المطلقة على السيستم (SYSTEM CORE)** 💀\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `👥 الزبائن تحت المراقبة: *${totalUsers} زبون*\n` +
                `📈 سعر الصرف الحالي بالليرة: *${currentRate.toLocaleString()} ل.س*\n` +
                `🚫 الحسابات المحظورة: *${bannedCount}* | 🔇 الحسابات المكتومة: *${mutedCount}*\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `🎛️ **لوحة الهكر الأسود لإدارة وحذف وتعديل الأزرار والأسعار والزبائن:**`;
                
    return {
        text: stats,
        markup: Markup.inlineKeyboard([
            // [السطر 1]: التحكم المالي الفوري بالسيستم
            [
                Markup.button.callback("📈 تعديل سعر الصرف", "adm#edit_rate"), 
                Markup.button.callback("📢 إذاعة عامة (برودكاست)", "adm#broadcast")
            ],
            
            // [السطر 2]: السيطرة الأمنية التامة على حسابات المشتركين
            [
                Markup.button.callback("🔎 اختراق وفحص زبون", "adm#manage_user"), 
                Markup.button.callback("🎁 شحن رصيد يدوياً", "adm#gift_user")
            ],
            
            // [السطر 3]: نظام العقوبات الفوري للزبائن
            [
                Markup.button.callback("🚫 حظر حساب (BAN)", "adm#ban_user"), 
                Markup.button.callback("🔓 فك حظر حساب", "adm#unban_user")
            ],
            [
                Markup.button.callback("🔇 كتم زبون (MUTE)", "adm#mute_user"), 
                Markup.button.callback("🔊 فك كتم زبون", "adm#unmute_user")
            ],
            
            // [السطر 4]: التحكم الحي بالأزرار والأسعار والخصومات (الهكر المطور)
            [
                Markup.button.callback("➕ إضافة منتج جديد", "adm#add_item_live"), 
                Markup.button.callback("🗑️ حذف منتج من المتجر", "adm#del_item_live")
            ],
            [
                Markup.button.callback("🎯 عمل خصم للمنتجات (%)", "adm#discount_item"), 
                Markup.button.callback("📝 تعديل نصوص ورسائل البوت", "adm#edit_welcome_txt")
            ],
            
            // [السطر 5]: تصفير الميزانية والمراقبة الشاملة للأرصدة
            [
                Markup.button.callback("💵 تصفير أرصدة الزبائن", "adm#zero_balance"),
                Markup.button.callback("📋 سجل التحركات والطلبات", "adm#view_logs")
            ],
            
            // [السطر 6]: حماية البيانات والخروج الآمن
            [
                Markup.button.callback("💳 سحب قاعدة الحسابات والفلوس", "adm#get_backup")],
            [
                Markup.button.callback("❌ إغلاق لوحة السيطرة الملكية", "adm#close_panel")
            ]
        ])
    };
}

module.exports = { getAdminPanel };
