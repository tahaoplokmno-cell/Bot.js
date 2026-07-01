const fs = require('fs');

function handleAdminCallback(ctx, data, uId, userStates, db) {
    if (data === "adm#edit_notes") { userStates[uId] = { action: 'await_new_notes' }; return ctx.reply("✍️ أرسل الآن الملاحظة الجديدة لحفظها في الدفتر:"); }
    if (data === "adm#close_panel") return ctx.deleteMessage().catch(()=>{});
    if (data === "adm#edit_rate") { userStates[uId] = { action: 'await_new_rate' }; return ctx.reply("📈 اكتب سعر الصرف الجديد (رقم فقط):"); }
    if (data === "adm#broadcast") { userStates[uId] = { action: 'await_broadcast_txt' }; return ctx.reply("📢 اكتب نص الرسالة الإذاعية لإرسالها للجميع:"); }
    if (data === "adm#ban_user") { userStates[uId] = { action: 'await_ban_uid' }; return ctx.reply("🚫 أرسل آيدي (ID) الزبون المراد حظره:"); }
    if (data === "adm#unban_user") { userStates[uId] = { action: 'await_unban_uid' }; return ctx.reply("🔓 أرسل آيدي (ID) الزبون لإلغاء حظره:"); }
    if (data === "adm#gift_user") { userStates[uId] = { action: 'await_gift_uid' }; return ctx.reply("🎁 أرسل آيدي الزبون المراد شحنه يدوياً:"); }
    if (data === "adm#zero_balance") { 
        if (db.users) { Object.keys(db.users).forEach(id => db.users[id].balance_usd = 0.0); }
        fs.writeFileSync('./database.json', JSON.stringify(db, null, 4)); return ctx.reply("💵 تم تصفير أرصدة جميع الزبائن بنجاح تام!");
    }
    if (data === "adm#get_backup") { return ctx.replyWithDocument({ source: './database.json' }).catch(()=>{ ctx.reply("❌ حدث خطأ في سحب القاعدة."); }); }
    ctx.reply("⚠️ الميزة قيد المعالجة المباشرة.");
}
module.exports = { handleAdminCallback };
