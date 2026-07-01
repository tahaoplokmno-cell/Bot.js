const fs = require('fs');

function handleAdminCallback(ctx, data, uId, userStates, db) {
    const save = () => fs.writeFileSync('./database.json', JSON.stringify(db, null, 4));

    if (data === "adm#edit_notes") { userStates[uId] = { action: 'await_new_notes' }; return ctx.reply("✍️ أرسل الملاحظة الجديدة لحفظها بالدفتر:"); }
    if (data === "adm#edit_rate") { userStates[uId] = { action: 'await_new_rate' }; return ctx.reply("📈 اكتب سعر الصرف الجديد (أرقام فقط):"); }
    if (data === "adm#gift_user") { userStates[uId] = { action: 'await_gift_uid' }; return ctx.reply("🎁 أرسل آيدي الزبون المراد شحنه وإرسال الأموال له:"); }
    if (data === "adm#ban_user") { userStates[uId] = { action: 'await_ban_uid' }; return ctx.reply("🚫 أرسل آيدي (ID) الزبون لحظره نهائياً:"); }
    if (data === "adm#close_panel") return ctx.deleteMessage().catch(()=>{});
    if (data === "adm#get_backup") { return ctx.replyWithDocument({ source: './database.json' }).catch(()=>{ ctx.reply("❌ فشل سحب القاعدة."); }); }
    if (data === "adm#zero_balance") { if (db.users) Object.keys(db.users).forEach(id => db.users[id].balance_usd = 0.0); save(); return ctx.reply("💵 تم تصفير كافة الأرصدة!"); }

    // 🟢 أزرار التحكم الكامل بالبوت (إضافة وتعديل وحذف الفئات والعروض حياً)
    if (data === "adm#add_cat") {
        userStates[uId] = { action: 'await_cat_type' };
        return ctx.reply("➕ **إنشاء قسم رئيسي جديد:**\nأرسل الآن نوع القسم ككلمة واحدة:\n1️⃣ اكتب `games` لقسم الألعاب\n2️⃣ اكتب `cards` لقسم البطاقات");
    }
    if (data === "adm#add_offer") {
        userStates[uId] = { action: 'await_offer_cat' };
        return ctx.reply("➕ **إضافة عرض سعر أو بطاقة جديدة:**\nاكتب اسم الفئة الدقيق المراد وضع العرض بداخلها (مثال: ببجي موبايل أو سيرفر 1):");
    }
    if (data === "adm#del_offer") {
        userStates[uId] = { action: 'await_del_offer_name' };
        return ctx.reply("🗑️ **حذف عرض سعر أو بطاقة:**\nاكتب اسم الفئة أولاً (مثال: ببجي موبايل):");
    }
}

module.exports = { handleAdminCallback };
