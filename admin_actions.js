const { Markup } = require('telegraf');
const adminPanel = require('./admin'); // استيراد لوحة الأدمن

// ===== عرض لوحة الأدمن =====
function getAdminPanel(db) {
    return adminPanel.getAdminPanel(db);
}

// ===== معالجة أزرار الأدمن =====
async function handleAdminCallback(ctx, data, uId, userStates, db, bot) {
    const parts = data.split("#");
    const action = parts[1];

    // 1️⃣ تعديل الملاحظات
    if (action === "edit_notes") {
        userStates[uId] = { action: 'await_new_notes' };
        return ctx.editMessageText("✍️ اكتب الملاحظة الجديدة التي تريد حفظها:");
    }

    // 2️⃣ تعديل سعر الصرف
    if (action === "edit_rate") {
        userStates[uId] = { action: 'await_new_rate' };
        return ctx.editMessageText("✍️ اكتب سعر الصرف الجديد (مثال: 15000):");
    }

    // 3️⃣ شحن رصيد يدوياً (إهداء)
    if (action === "gift_user") {
        userStates[uId] = { action: 'await_gift_uid' };
        return ctx.editMessageText("✍️ اكتب آيدي المستخدم الذي تريد شحنه:");
    }

    // 4️⃣ بث رسالة
    if (action === "pin_msg") {
        userStates[uId] = { action: 'await_broadcast_pin' };
        return ctx.editMessageText("✍️ اكتب الرسالة التي تريد بثها وتثبيتها:");
    }

    // 5️⃣ حظر مستخدم
    if (action === "ban_user") {
        userStates[uId] = { action: 'await_ban_uid' };
        return ctx.editMessageText("✍️ اكتب آيدي المستخدم الذي تريد حظره:");
    }

    // 6️⃣ فك الحظر
    if (action === "unban_user") {
        userStates[uId] = { action: 'await_unban_uid' };
        return ctx.editMessageText("✍️ اكتب آيدي المستخدم الذي تريد فك حظره:");
    }

    // 7️⃣ تشغيل/إيقاف الصيانة
    if (action === "toggle_bot") {
        db.bot_maintenance = !db.bot_maintenance;
        require('./database').saveDB(db);
        return ctx.editMessageText(`✅ تم ${db.bot_maintenance ? 'تفعيل' : 'إيقاف'} وضع الصيانة.`);
    }

    // 8️⃣ إضافة قسم جديد
    if (action === "add_cat") {
        userStates[uId] = { action: 'await_add_cat' };
        return ctx.editMessageText("✍️ اكتب اسم القسم الجديد (مثال: كود فري فاير):");
    }

    // 9️⃣ إضافة عرض جديد
    if (action === "add_offer") {
        userStates[uId] = { action: 'await_add_offer' };
        return ctx.editMessageText("✍️ اكتب العرض الجديد بالصيغة: `اسم_القسم|اسم_العرض|السعر` (مثال: ببجي موبايل|شدة 60|1.00)");
    }

    // 🔟 حذف قسم
    if (action === "del_offer") {
        userStates[uId] = { action: 'await_del_offer' };
        return ctx.editMessageText("✍️ اكتب اسم القسم الذي تريد حذفه بالكامل:");
    }

    // 1️⃣1️⃣ تصفير الأرصدة
    if (action === "zero_balance") {
        if (db.users) {
            Object.keys(db.users).forEach(id => { db.users[id].balance_usd = 0; });
            require('./database').saveDB(db);
        }
        return ctx.editMessageText("✅ تم تصفير جميع الأرصدة بنجاح.");
    }

    // 1️⃣2️⃣ سحب قاعدة البيانات
    if (action === "get_backup") {
        const dbFile = require('./database');
        const backup = dbFile.loadDB();
        const json = JSON.stringify(backup, null, 2);
        // إرسال الملف كـ Document
        await ctx.replyWithDocument({
            source: Buffer.from(json, 'utf8'),
            filename: `backup_${Date.now()}.json`
        });
        return ctx.editMessageText("✅ تم إرسال نسخة احتياطية من قاعدة البيانات.");
    }

    // 1️⃣3️⃣ إغلاق لوحة التحكم
    if (action === "close_panel") {
        userStates[uId] = { action: 'admin_dashboard' };
        return ctx.editMessageText("🔒 تم إغلاق لوحة التحكم. اكتب /panel لإعادة فتحها.");
    }

    // 1️⃣4️⃣ معالجة إضافة قسم (من text_handler)
    if (action === "add_cat_confirm") {
        // تتم في text_handler
        return ctx.reply("✅ جاري المعالجة...");
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

        await ctx.editMessageText(`✅ تم قبول الشحن وإضافة ${amount} ${currency === 'usd' ? '$' : 'ل.س'} للمستخدم ${targetId}`);
        await ctx.telegram.sendMessage(targetId, `✅ تم إضافة ${amount} ${currency === 'usd' ? '$' : 'ل.س'} إلى محفظتك بنجاح!`);

    } else if (action === "pay_reject") {
        await ctx.editMessageText(`❌ تم رفض طلب الشحن للمستخدم ${targetId}`);
        await ctx.telegram.sendMessage(targetId, "❌ عذراً، تم رفض طلب الشحن الخاص بك. يرجى التواصل مع الدعم.");
    }
}

module.exports = { handlePaymentDecision, handleAdminCallback, getAdminPanel };
