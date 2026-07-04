const { Markup } = require('telegraf');

// ===== عرض لوحة الأدمن =====
function getAdminPanel(db) {
    const usersCount = db.users ? Object.keys(db.users).length : 0;
    const totalBalance = db.users ? Object.values(db.users).reduce((sum, u) => sum + (u.balance_usd || 0), 0) : 0;

    return {
        text: `🔐 **لوحة التحكم الإدارية**\n━━━━━━━━━━━━━━━━━━━━\n👥 عدد المستخدمين: *${usersCount}*\n💰 إجمالي الأرصدة: *$${totalBalance.toFixed(2)}*\n━━━━━━━━━━━━━━━━━━━━\n📌 اختر خياراً:`,
        markup: Markup.inlineKeyboard([
            [Markup.button.callback("📊 الإحصائيات", "adm#stats")],
            [Markup.button.callback("📢 إرسال إعلان", "adm#broadcast")],
            [Markup.button.callback("💳 إدارة المحفظة", "adm#wallet")],
            [Markup.button.callback("🎮 إدارة الألعاب", "adm#games")],
            [Markup.button.callback("📱 شحن سام كاش", "adm#sham")],
            [Markup.button.callback("💰 استرجاع الأموال", "adm#refund")],
            [Markup.button.callback("🔙 العودة للقائمة", "main_menu")]
        ])
    };
}

// ===== معالجة أزرار الأدمن =====
async function handleAdminCallback(ctx, data, uId, userStates, db, bot) {
    const parts = data.split("#");
    const action = parts[1];

    // 1️⃣ الإحصائيات
    if (action === "stats") {
        const usersCount = db.users ? Object.keys(db.users).length : 0;
        const totalBalance = db.users ? Object.values(db.users).reduce((sum, u) => sum + (u.balance_usd || 0), 0) : 0;
        return ctx.editMessageText(
            `📊 **الإحصائيات:**\n👥 المستخدمين: *${usersCount}*\n💰 إجمالي الرصيد: *$${totalBalance.toFixed(2)}*`,
            { parse_mode: 'Markdown' }
        );
    }

    // 2️⃣ إرسال إعلان
    if (action === "broadcast") {
        userStates[uId] = { action: 'await_broadcast_txt' };
        return ctx.editMessageText("✍️ اكتب الرسالة التي تريد إرسالها:");
    }

    // 3️⃣ إدارة المحفظة
    if (action === "wallet") {
        return ctx.editMessageText("💳 **إدارة المحفظة:**",
            Markup.inlineKeyboard([
                [Markup.button.callback("💰 إهداء رصيد", "adm#gift")],
                [Markup.button.callback("📊 عرض رصيد", "adm#view_balance")]
            ])
        );
    }

    // 4️⃣ إدارة الألعاب
    if (action === "games") {
        return ctx.editMessageText("🎮 **إدارة الألعاب:**",
            Markup.inlineKeyboard([
                [Markup.button.callback("➕ إضافة لعبة", "adm#add_game")],
                [Markup.button.callback("🗑️ حذف لعبة", "adm#del_game")]
            ])
        );
    }

    // 5️⃣ إهداء رصيد
    if (action === "gift") {
        userStates[uId] = { action: 'await_gift_uid' };
        return ctx.editMessageText("✍️ اكتب آيدي المستخدم:");
    }

    // 6️⃣ شحن سام كاش
    if (action === "sham") {
        userStates[uId] = { action: 'await_sham_amount' };
        return ctx.editMessageText("✍️ اكتب المبلغ بالدولار:");
    }

    // 7️⃣ استرجاع الأموال
    if (action === "refund") {
        userStates[uId] = { action: 'await_refund_amount' };
        return ctx.editMessageText("✍️ اكتب المبلغ بالدولار:");
    }

    // 8️⃣ عرض رصيد
    if (action === "view_balance") {
        userStates[uId] = { action: 'await_view_balance_uid' };
        return ctx.editMessageText("✍️ اكتب آيدي المستخدم:");
    }

    return ctx.reply("🔐 هذا زر خاص بالأدمن.");
}

// ===== معالجة قبول/رفض الدفع =====
async function handlePaymentDecision(ctx, data, uId, db, saveDB) {
    const parts = data.split("#");
    const action = parts[0];
    const targetId = parts[1];
    const amount = parseFloat(parts[2]) || 0;
    const currency = parts[3] || 'usd';

    if (action === "pay_approve") {
        if (!db.users[targetId]) db.users[targetId] = { balance_usd: 0 };
        const rate = db.exchange_rate || 14500;
        let usdAmount = currency === 'usd' ? amount : amount / rate;
        db.users[targetId].balance_usd = (db.users[targetId].balance_usd || 0) + usdAmount;
        saveDB(db);

        await ctx.editMessageText(`✅ تم قبول الشحن وإضافة ${amount} ${currency === 'usd' ? '$' : 'ل.س'}`);
        await ctx.telegram.sendMessage(targetId, `✅ تم إضافة ${amount} ${currency === 'usd' ? '$' : 'ل.س'} إلى محفظتك!`);
    } else if (action === "pay_reject") {
        await ctx.editMessageText(`❌ تم رفض طلب الشحن`);
        await ctx.telegram.sendMessage(targetId, "❌ عذراً، تم رفض طلب الشحن.");
    }
}

module.exports = { handlePaymentDecision, handleAdminCallback, getAdminPanel };
