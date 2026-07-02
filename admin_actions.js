const fs = require('fs');

function handleAdminCallback(ctx, data, uId, userStates, db) {
    const save = () => { try { fs.writeFileSync('./database.json', JSON.stringify(db, null, 4)); } catch (err) { console.error("❌ خطأ تخزين قاعدة البيانات:", err); } };

    // 1️⃣ إعدادات لوحة التحكم الأساسية والتصفير
    if (data === "adm#edit_notes") { userStates[uId] = { action: 'await_new_notes' }; return ctx.reply("✍️ أرسل الملاحظة أو رسالة الترحيب الجديدة لحفظها فوراً:"); }
    if (data === "adm#edit_rate") { userStates[uId] = { action: 'await_new_rate' }; return ctx.reply("📈 اكتب سعر الصرف الجديد (أرقام فقط):"); }
    if (data === "adm#gift_user") { userStates[uId] = { action: 'await_gift_uid' }; return ctx.reply("🎁 أرسل آيدي الزبون المراد شحن رصيده ومكافأته:"); }
    if (data === "adm#ban_user") { userStates[uId] = { action: 'await_ban_uid' }; return ctx.reply("🚫 أرسل آيدي الزبون المراد حظره وطرده نهائياً:"); }
    if (data === "adm#unban_user") { userStates[uId] = { action: 'await_unban_uid' }; return ctx.reply("🟢 أرسل آيدي الزبون المراد فك الحظر عنه:"); }
    if (data === "adm#close_panel") return ctx.deleteMessage().catch(()=>{});
    if (data === "adm#get_backup") { return ctx.replyWithDocument({ source: './database.json' }).catch(()=>{ ctx.reply("❌ فشل سحب نسخة الـ Backup."); }); }
    if (data === "adm#zero_balance") { if (db.users) Object.keys(db.users).forEach(id => db.users[id].balance_usd = 0.0); save(); return ctx.reply("💵 تم تصفير كافة أرصدة المحافظ بنجاح!"); }

    // 2️⃣ 🌟 الميزات العملاقة والجديدة المطلوبة (تحكم كامل وبثبات)
    if (data === "adm#pin_msg") {
        userStates[uId] = { action: 'await_broadcast_pin' };
        return ctx.reply("📌 **إرسال وتثبيت رسالة إدارية:**\nاكتب الآن نص الرسالة الموجهة لجميع مستخدمي البوت لتثبيتها في شاشاتهم حياً:");
    }
    if (data === "adm#edit_btn_text") {
        userStates[uId] = { action: 'await_old_btn_text' };
        return ctx.reply("✍️ **تعديل نصوص الأزرار حياً:**\nاكتب أولاً النص الحالي للزر الذي ترغب بتعديله بدقة (مثال: 🏪 المتجر):");
    }
    if (data === "adm#delete_any_btn") {
        userStates[uId] = { action: 'await_btn_delete_name' };
        return ctx.reply("🗑️ **حذف أي زر أو قسم من السيستم:**\nاكتب الاسم الدقيق للزر أو العرض المراد إزالته نهائياً وحذفه حياً:");
    }
    if (data === "adm#toggle_bot") {
        db.bot_maintenance = !db.bot_maintenance;
        save();
        return ctx.reply(db.bot_maintenance ? "🛑 تم إيقاف البوت وتحويل السيستم لوضع الصيانة المؤقتة!" : "🚀 تم تشغيل البوت مجدداً وإعادة استقبال عمليات الشحن والطلبات بنجاح!");
    }

    // 3️⃣ أزرار صيانة وتحكم المتجر الرقمي حياً
    if (data === "adm#add_cat") { userStates[uId] = { action: 'await_cat_type' }; return ctx.reply("➕ **إنشاء قسم رئيسي جديد:**\nأرسل نوع الفئة بالإنجليزية (games للألعاب أو cards للبطاقات):"); }
    if (data === "adm#add_offer") { userStates[uId] = { action: 'await_offer_cat' }; return ctx.reply("➕ **إضافة حزمة جديدة:**\nاكتب اسم الفئة المراد وضع العرض بداخلها (مثال: ببجي موبايل):"); }
    if (data === "adm#del_offer") { userStates[uId] = { action: 'await_del_offer_name' }; return ctx.reply("🗑️ **حذف عرض سعر أو فئة:**\nاكتب اسم الفئة المراد مسحها وعروضها (مثال: ببجي موبايل):"); }
}

module.exports = { handleAdminCallback };
