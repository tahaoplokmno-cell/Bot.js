let currentNotes = "لا توجد ملاحظات أو أوامر مسجلة حالياً في الدفتر.";

function getNotes() {
    return currentNotes;
}

function handleNotesCallback(ctx, userStates, uId) {
    userStates[uId] = { action: 'await_new_notes' };
    return ctx.reply("✍️ أرسل الآن الملاحظة أو النص الجديد لحفظه في دفتر الملاحظات الملكي:");
}

function saveNewNotes(ctx, text, uId, userStates, db, getAdminPanel) {
    currentNotes = text;
    userStates[uId] = { action: 'admin_dashboard' };
    ctx.reply("✅ تم تحديث وحفظ دفتر الملاحظات بنجاح!");
    
    // إعادة فتح اللوحة محدثة تلقائياً بعد الحفظ
    const panel = getAdminPanel(db);
    return ctx.reply(panel.text, { parse_mode: 'Markdown', ...panel.markup });
}

module.exports = { getNotes, handleNotesCallback, saveNewNotes };
