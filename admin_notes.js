function handleAdminCallback(ctx, data, uId, userStates, db) {
    if (data === "adm#edit_notes") { userStates[uId] = { action: 'await_new_notes' }; return ctx.reply("✍️ أرسل الآن الملاحظة أو النص الجديد لحفظه في دفتر الملاحظات:"); }
    if (data === "adm#close_panel") return ctx.deleteMessage().catch(()=>{});
    if (data === "adm#edit_rate") { userStates[uId] = { action: 'await_new_rate' }; return ctx.reply("📈 اكتب الآن سعر الصرف الجديد للدولار بالليرة السورية (أرقام فقط):"); }
    if (data === "adm#broadcast") { userStates[uId] = { action: 'await_broadcast_txt' }; return ctx.reply("📢 اكتب الآن نص الرسالة الإذاعية لإرسالها لجميع الزبائن:"); }
    if (data === "adm#ban_user") { userStates[uId] = { action: 'await_ban_uid' }; return ctx.reply("🚫 أرسل الآن آيدي (ID) الزبون المراد حظره نهائياً من السيستم:"); }
    if (data === "adm#gift_user") { userStates[uId] = { action: 'await_gift_uid' }; return ctx.reply("🎁 أرسل الآن آيدي (ID) الزبون الذي تريد شحن رصيده يدوياً:"); }
    ctx.reply("⚠️ هذه الميزة قيد الربط البرمجي الفرعي.");
}
module.exports = { handleAdminCallback };
