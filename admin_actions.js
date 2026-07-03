async function handlePaymentDecision(ctx, data, uId, db, saveDB) {
    const parts = data.split("#");
    const action = parts[0]; // pay_approve أو pay_reject
    const targetId = parts[1];
    const amount = parseFloat(parts[2]) || 0;
    const currency = parts[3] || 'usd';

    if (action === "pay_approve") {
        // إضافة الرصيد للمستخدم
        if (!db.users[targetId]) db.users[targetId] = { balance_usd: 0 };
        const rate = db.exchange_rate || 14500;
        let usdAmount = currency === 'usd' ? amount : amount / rate;
        db.users[targetId].balance_usd = (db.users[targetId].balance_usd || 0) + usdAmount;
        saveDB(db);

        await ctx.editMessageText(`✅ تم قبول الشحن وإضافة ${amount} ${currency === 'usd' ? '$' : 'ل.س'} للمستخدم ${targetId}`);
        await ctx.telegram.sendMessage(targetId, `✅ تم إضافة ${amount} ${currency === 'usd' ? '$' : 'ل.س'} إلى محفظتك بنجاح!`);
        
    } else if (action === "pay_reject") {
        await ctx.editMessageText(`❌ تم رفض طلب الشحن للمستخدم ${targetId}`);
        await ctx.telegram.sendMessage(targetId, "❌ عذراً، تم رفض طلب الشحن الخاص بك. يرجى التواصل مع الدعم.");
    }
}

async function handleAdminCallback(ctx, data, uId, userStates, db) {
    // هنا دوال الأدمن الأخرى (إذا وجدت)
    // حالياً ترجع رسالة افتراضية
    return ctx.reply("🔐 هذا زر خاص بالأدمن.");
}

module.exports = { handlePaymentDecision, handleAdminCallback };
