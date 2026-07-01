const fs = require('fs');

function handleAdminCallback(ctx, data, uId, userStates, db) {
    const saveDatabase = () => fs.writeFileSync('./database.json', JSON.stringify(db, null, 4));

    // الأوامر الأساسية الشغالة سابقاً
    if (data === "adm#edit_notes") { userStates[uId] = { action: 'await_new_notes' }; return ctx.reply("✍️ أرسل الآن الملاحظة الجديدة لحفظها في الدفتر:"); }
    if (data === "adm#close_panel") return ctx.deleteMessage().catch(()=>{});
    if (data === "adm#edit_rate") { userStates[uId] = { action: 'await_new_rate' }; return ctx.reply("📈 اكتب سعر الصرف الجديد (رقم فقط):"); }
    if (data === "adm#broadcast") { userStates[uId] = { action: 'await_broadcast_txt' }; return ctx.reply("📢 اكتب نص الرسالة الإذاعية لإرسالها للجميع:"); }
    if (data === "adm#ban_user") { userStates[uId] = { action: 'await_ban_uid' }; return ctx.reply("🚫 أرسل آيدي (ID) الزبون المراد حظره:"); }
    if (data === "adm#unban_user") { userStates[uId] = { action: 'await_unban_uid' }; return ctx.reply("🔓 أرسل آيدي (ID) الزبون لإلغاء حظره:"); }
    if (data === "adm#gift_user") { userStates[uId] = { action: 'await_gift_uid' }; return ctx.reply("🎁 أرسل آيدي الزبون المراد شحنه يدوياً:"); }
    if (data === "adm#get_backup") { return ctx.replyWithDocument({ source: './database.json' }).catch(()=>{ ctx.reply("❌ حدث خطأ في سحب القاعدة."); }); }
    
    if (data === "adm#zero_balance") { 
        if (db.users) { Object.keys(db.users).forEach(id => db.users[id].balance_usd = 0.0); }
        saveDatabase(); 
        return ctx.reply("💵 تم تصفير أرصدة جميع الزبائن بنجاح تام!");
    }

    // 🟢 تفعيل الأزرار المكسورة والمعطلة وإضافة وظائفها بالكامل:

    // 1. فحص واختراق حساب زبون ومعرفة رصيده المالي وضبطه
    if (data === "adm#manage_user") {
        userStates[uId] = { action: 'await_inspect_uid' };
        return ctx.reply("🔎 **قسم فحص الزبائن:**\nأرسل آيدي (ID) الزبون لمعاينة رصيده وحالته بالسيستم:");
    }

    // 2. كتم وفك كتم زبون لمنعه من إرسال رسائل أو طلبات بالبوت
    if (data === "adm#mute_user") {
        userStates[uId] = { action: 'await_mute_uid' };
        return ctx.reply("🔇 أرسل آيدي الزبون المراد كتمه من إرسال الطلبات:");
    }
    if (data === "adm#unmute_user") {
        userStates[uId] = { action: 'await_unmute_uid' };
        return ctx.reply("🔊 أرسل آيدي الزبون لإلغاء الكتم عنه:");
    }

    // 3. إضافة منتج جديد حياً ومباشرة للمتجر دون تعديل ملفات
    if (data === "adm#add_item_live") {
        userStates[uId] = { action: 'await_new_item_name' };
        return ctx.reply("➕ **إضافة منتج جديد:**\nاكتب اسم المنتج أولاً (مثال: شحن 60 شدة ببجي):");
    }

    // 4. حذف منتج من المتجر
    if (data === "adm#del_item_live") {
        userStates[uId] = { action: 'await_del_item_name' };
        return ctx.reply("🗑️ **حذف منتج:**\nاكتب الاسم الدقيق للمنتج الذي تريد إزالته نهائياً من المتجر:");
    }

    // 5. عمل خصم مئوي (%) على كل المنتجات فوراً
    if (data === "adm#discount_item") {
        userStates[uId] = { action: 'await_discount_percent' };
        return ctx.reply("🎯 **عمل خصم عام:**\nاكتب نسبة الخصم المرادة كرقم فقط (مثال: اكتب 10 لعمل خصم 10% على الأسعار):");
    }

    // 6. تعديل نصوص ورسائل الترحيب الخاصة بالبوت
    if (data === "adm#edit_welcome_txt") {
        userStates[uId] = { action: 'await_new_welcome_text' };
        return ctx.reply("📝 **تعديل نص الترحيب والتعليمات:**\nاكتب الرسالة الجديدة بالكامل التي تظهر للمشتركين عند تشغيل البوت:");
    }

    // 7. سجل التحركات والطلبات الأخيرة بالسيستم
    if (data === "adm#view_logs") {
        const logs = db.logs || ["لا توجد طلبات أو تحركات مسجلة حالياً."];
        let logsMsg = `📋 **سجل التحركات والطلبات الأخيرة:**\n━━━━━━━━━━━━━━━━━━━━\n` + logs.slice(-10).join("\n");
        return ctx.reply(logsMsg);
    }

    // رسالة الأمان الاحتياطية في حال وجود زر غير معروف
    ctx.reply("⚠️ ميزة غير معرفة أو تحتاج لتحديث ملف الإعدادات الخاص بها.");
}

module.exports = { handleAdminCallback };
