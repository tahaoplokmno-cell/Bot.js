const { Markup } = require('telegraf');
const dbFile = require('./database');

// ============================================================
// ===== لوحة التحكم الرئيسية (Super Admin) =====
// ============================================================
function getSuperAdminPanel(db) {
    const totalUsers = Object.keys(db.users || {}).length;
    const totalBalance = Object.values(db.users || {}).reduce((sum, u) => sum + (u.balance_usd || 0), 0);
    const totalOrders = (db.orders || []).length;
    const totalProducts = Object.keys(db.custom_store?.games || {}).length;
    const totalBotOrders = (db.bot_orders || []).length;
    const bannedCount = Object.keys(db.banned || {}).length;
    const mutedCount = Object.keys(db.muted || {}).length;
    const totalInstallments = (db.installments || []).length;

    return {
        text: `🛸 **نظام التحكم المطلق (OMEGA)** 🛸\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
              `👥 المستخدمين: *${totalUsers}*\n` +
              `💰 الأرصدة: *$${totalBalance.toFixed(2)}*\n` +
              `📦 الطلبات: *${totalOrders}*\n` +
              `🛒 الأقسام: *${totalProducts}*\n` +
              `🤖 طلبات البوتات: *${totalBotOrders}*\n` +
              `🚫 المحظورين: *${bannedCount}*\n` +
              `🔇 المكتمين: *${mutedCount}*\n` +
              `📅 الأقساط: *${totalInstallments}*\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
              `📌 اختر الإجراء:`,
        markup: Markup.inlineKeyboard([
            [Markup.button.callback("👥 المستخدمين", "adm#users")],
            [Markup.button.callback("🛒 المتجر", "adm#store")],
            [Markup.button.callback("📦 الطلبات", "adm#orders")],
            [Markup.button.callback("🤖 طلبات البوتات", "adm#bot_orders")],
            [Markup.button.callback("📊 الإحصائيات", "adm#stats")],
            [Markup.button.callback("⚙️ الإعدادات", "adm#settings")],
            [Markup.button.callback("🎨 الأزرار والواجهة", "adm#buttons")],
            [Markup.button.callback("💾 قاعدة البيانات", "adm#database")],
            [Markup.button.callback("📅 الأقساط", "adm#installments")],
            [Markup.button.callback("📢 البث والإعلانات", "adm#broadcast")],
            [Markup.button.callback("🔐 الأمان", "adm#security")],
            [Markup.button.callback("🔙 القائمة الرئيسية", "main_menu")]
        ])
    };
}

// ============================================================
// ===== المعالج الرئيسي =====
// ============================================================
async function handleSuperAdminCallback(ctx, data, uId, userStates, db, bot) {
    const parts = data.split("#");
    const action = parts[1];

    // ===== 1️⃣ إدارة المستخدمين =====
    if (action === "users") {
        return ctx.editMessageText("👥 **إدارة المستخدمين:**\n━━━━━━━━━━━━━━━━━━━━\nاختر الإجراء:",
            Markup.inlineKeyboard([
                [Markup.button.callback("📋 عرض الكل", "adm#list_users")],
                [Markup.button.callback("💰 إهداء رصيد", "adm#gift")],
                [Markup.button.callback("🚫 حظر", "adm#ban")],
                [Markup.button.callback("🟢 فك حظر", "adm#unban")],
                [Markup.button.callback("🔇 كتم", "adm#mute")],
                [Markup.button.callback("🔊 فك كتم", "adm#unmute")],
                [Markup.button.callback("📊 رصيد مستخدم", "adm#balance")],
                [Markup.button.callback("📋 سجل المستخدم", "adm#user_log")],
                [Markup.button.callback("🗑️ حذف مستخدم", "adm#delete_user")],
                [Markup.button.callback("🔙 رجوع", "adm#main")]
            ])
        );
    }

    // ===== 2️⃣ إدارة المتجر =====
    if (action === "store") {
        return ctx.editMessageText("🛒 **إدارة المتجر:**\n━━━━━━━━━━━━━━━━━━━━\nاختر الإجراء:",
            Markup.inlineKeyboard([
                [Markup.button.callback("📋 الأقسام", "adm#list_cats")],
                [Markup.button.callback("➕ إضافة قسم", "adm#add_cat")],
                [Markup.button.callback("✏️ تعديل قسم", "adm#edit_cat")],
                [Markup.button.callback("🗑️ حذف قسم", "adm#del_cat")],
                [Markup.button.callback("📋 المنتجات", "adm#list_prod")],
                [Markup.button.callback("➕ إضافة منتج", "adm#add_prod")],
                [Markup.button.callback("✏️ تعديل منتج", "adm#edit_prod")],
                [Markup.button.callback("🗑️ حذف منتج", "adm#del_prod")],
                [Markup.button.callback("📦 العروض الخاصة", "adm#offers")],
                [Markup.button.callback("🔙 رجوع", "adm#main")]
            ])
        );
    }

    // ===== 3️⃣ إدارة الطلبات =====
    if (action === "orders") {
        const orders = db.orders || [];
        let list = "📦 **الطلبات:**\n━━━━━━━━━━━━━━━━━━━━\n";
        if (orders.length === 0) list += "لا توجد طلبات.";
        else {
            orders.slice(-10).reverse().forEach((o, i) => {
                list += `${i+1}. ${o.userName} - ${o.item} - $${o.price}\n`;
            });
        }
        return ctx.editMessageText(list, {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback("📥 تصدير", "adm#export_orders")],
                [Markup.button.callback("🗑️ مسح الكل", "adm#clear_orders")],
                [Markup.button.callback("📊 تقرير الطلبات", "adm#orders_report")],
                [Markup.button.callback("🔙 رجوع", "adm#main")]
            ])
        });
    }

    // ===== 4️⃣ طلبات البوتات =====
    if (action === "bot_orders") {
        const orders = db.bot_orders || [];
        let list = "🤖 **طلبات البوتات:**\n━━━━━━━━━━━━━━━━━━━━\n";
        if (orders.length === 0) list += "لا توجد طلبات.";
        else {
            orders.forEach((o, i) => {
                list += `${i+1}. ${o.userName || o.userId} - ${o.server || 'غير محدد'}\n`;
            });
        }
        return ctx.editMessageText(list, {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback("📂 التفاصيل", "adm#bot_details")],
                [Markup.button.callback("🗑️ مسح الكل", "adm#clear_bot_orders")],
                [Markup.button.callback("📊 تقرير البوتات", "adm#bots_report")],
                [Markup.button.callback("🔙 رجوع", "adm#main")]
            ])
        });
    }

    // ===== 5️⃣ الإحصائيات المتقدمة =====
    if (action === "stats") {
        const totalUsers = Object.keys(db.users || {}).length;
        const totalBalance = Object.values(db.users || {}).reduce((sum, u) => sum + (u.balance_usd || 0), 0);
        const totalOrders = (db.orders || []).length;
        const totalProducts = Object.keys(db.custom_store?.games || {}).length;
        const bannedCount = Object.keys(db.banned || {}).length;
        const mutedCount = Object.keys(db.muted || {}).length;
        const totalBotOrders = (db.bot_orders || []).length;
        const totalInstallments = (db.installments || []).length;

        return ctx.editMessageText(
            `📊 **الإحصائيات المتقدمة:**\n━━━━━━━━━━━━━━━━━━━━\n` +
            `👥 المستخدمين: *${totalUsers}*\n` +
            `💰 الأرصدة: *$${totalBalance.toFixed(2)}*\n` +
            `📦 الطلبات: *${totalOrders}*\n` +
            `🛒 الأقسام: *${totalProducts}*\n` +
            `🤖 طلبات البوتات: *${totalBotOrders}*\n` +
            `🚫 المحظورين: *${bannedCount}*\n` +
            `🔇 المكتمين: *${mutedCount}*\n` +
            `📅 الأقساط: *${totalInstallments}*\n` +
            `📈 متوسط الرصيد: *$${(totalBalance / (totalUsers || 1)).toFixed(2)}*`,
            { parse_mode: 'Markdown',
              reply_markup: Markup.inlineKeyboard([
                  [Markup.button.callback("📊 تقرير مفصل", "adm#full_report")],
                  [Markup.button.callback("🔙 رجوع", "adm#main")]
              ])
            }
        );
    }

    // ===== 6️⃣ الإعدادات =====
    if (action === "settings") {
        const status = db.bot_maintenance ? "🛑 معطل" : "✅ شغال";
        return ctx.editMessageText(`⚙️ **الإعدادات:**\n━━━━━━━━━━━━━━━━━━━━\nحالة البوت: *${status}*\nسعر الصرف: *${db.exchange_rate || 14500} ل.س*\n━━━━━━━━━━━━━━━━━━━━\nاختر الإجراء:`,
            Markup.inlineKeyboard([
                [Markup.button.callback("⏹️ إيقاف", "adm#stop")],
                [Markup.button.callback("▶️ تشغيل", "adm#start")],
                [Markup.button.callback("📈 سعر الصرف", "adm#rate")],
                [Markup.button.callback("📝 الملاحظات", "adm#notes")],
                [Markup.button.callback("🔄 إعادة تشغيل", "adm#restart")],
                [Markup.button.callback("📊 سجل النظام", "adm#system_log")],
                [Markup.button.callback("🔙 رجوع", "adm#main")]
            ])
        );
    }

    // ===== 7️⃣ إدارة الأزرار =====
    if (action === "buttons") {
        return ctx.editMessageText("🎨 **إدارة الأزرار:**\n━━━━━━━━━━━━━━━━━━━━\nاختر الإجراء:",
            Markup.inlineKeyboard([
                [Markup.button.callback("➕ إضافة زر", "adm#add_btn")],
                [Markup.button.callback("✏️ تعديل زر", "adm#edit_btn")],
                [Markup.button.callback("🗑️ حذف زر", "adm#del_btn")],
                [Markup.button.callback("📋 عرض الكل", "adm#list_btns")],
                [Markup.button.callback("⬆️ ترتيب الأزرار", "adm#order_btns")],
                [Markup.button.callback("📂 إدارة القوائم", "adm#menus")],
                [Markup.button.callback("🔙 رجوع", "adm#main")]
            ])
        );
    }

    // ===== 8️⃣ قاعدة البيانات =====
    if (action === "database") {
        return ctx.editMessageText("💾 **إدارة قاعدة البيانات:**\n━━━━━━━━━━━━━━━━━━━━\nاختر الإجراء:",
            Markup.inlineKeyboard([
                [Markup.button.callback("📥 نسخة احتياطية", "adm#backup")],
                [Markup.button.callback("📤 استعادة", "adm#restore")],
                [Markup.button.callback("🧹 تنظيف", "adm#clean")],
                [Markup.button.callback("📊 حجم DB", "adm#db_size")],
                [Markup.button.callback("🔍 فحص DB", "adm#check_db")],
                [Markup.button.callback("📋 تصدير JSON", "adm#export_json")],
                [Markup.button.callback("🔙 رجوع", "adm#main")]
            ])
        );
    }

    // ===== 9️⃣ الأقساط =====
    if (action === "installments") {
        const installments = db.installments || [];
        let list = "📅 **الأقساط:**\n━━━━━━━━━━━━━━━━━━━━\n";
        if (installments.length === 0) list += "لا توجد أقساط.";
        else {
            installments.forEach((o, i) => {
                list += `${i+1}. ${o.userName} - ${o.amount}$ - ${o.date}\n`;
            });
        }
        return ctx.editMessageText(list, {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback("➕ إضافة قسط", "adm#add_installment")],
                [Markup.button.callback("✏️ تعديل قسط", "adm#edit_installment")],
                [Markup.button.callback("🗑️ حذف قسط", "adm#del_installment")],
                [Markup.button.callback("📊 تقرير الأقساط", "adm#installments_report")],
                [Markup.button.callback("🔙 رجوع", "adm#main")]
            ])
        });
    }

    // ===== 🔟 البث والإعلانات =====
    if (action === "broadcast") {
        return ctx.editMessageText("📢 **البث والإعلانات:**\n━━━━━━━━━━━━━━━━━━━━\nاختر الإجراء:",
            Markup.inlineKeyboard([
                [Markup.button.callback("📨 إرسال للكل", "adm#broadcast_all")],
                [Markup.button.callback("📨 إرسال لمستخدم", "adm#broadcast_user")],
                [Markup.button.callback("📨 إرسال لمجموعة", "adm#broadcast_group")],
                [Markup.button.callback("📋 سجل الإعلانات", "adm#broadcast_log")],
                [Markup.button.callback("🔙 رجوع", "adm#main")]
            ])
        );
    }

    // ===== 1️⃣1️⃣ الأمان =====
    if (action === "security") {
        return ctx.editMessageText("🔐 **الأمان:**\n━━━━━━━━━━━━━━━━━━━━\nاختر الإجراء:",
            Markup.inlineKeyboard([
                [Markup.button.callback("🔑 تغيير كلمة السر", "adm#change_pass")],
                [Markup.button.callback("📋 سجل الدخول", "adm#login_log")],
                [Markup.button.callback("🚫 حظر IP", "adm#ban_ip")],
                [Markup.button.callback("🟢 فك حظر IP", "adm#unban_ip")],
                [Markup.button.callback("📊 تقرير الأمان", "adm#security_report")],
                [Markup.button.callback("🔙 رجوع", "adm#main")]
            ])
        );
    }

    // ============================================================
    // ===== تنفيذ الأوامر الفرعية =====
    // ============================================================

    // عرض المستخدمين
    if (action === "list_users") {
        const users = db.users || {};
        let list = "👥 **جميع المستخدمين:**\n━━━━━━━━━━━━━━━━━━━━\n";
        let count = 0;
        for (const id in users) {
            count++;
            list += `${count}. ${users[id].name} (${id}) - $${users[id].balance_usd || 0}\n`;
            if (count >= 20) {
                list += `\n... و ${Object.keys(users).length - 20} آخرين`;
                break;
            }
        }
        return ctx.editMessageText(list, {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback("📥 تصدير CSV", "adm#export_users_csv")],
                [Markup.button.callback("🔙 رجوع", "adm#users")]
            ])
        });
    }

    // عرض الأقسام
    if (action === "list_cats") {
        const games = db.custom_store?.games || {};
        let list = "📂 **الأقسام:**\n━━━━━━━━━━━━━━━━━━━━\n";
        for (const cat in games) {
            list += `📂 *${cat}* (${games[cat].length} منتج)\n`;
        }
        if (Object.keys(games).length === 0) list += "⚠️ لا توجد أقسام.";
        return ctx.editMessageText(list, {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback("🔙 رجوع", "adm#store")]
            ])
        });
    }

    // عرض المنتجات
    if (action === "list_prod") {
        const games = db.custom_store?.games || {};
        let list = "🛒 **جميع المنتجات:**\n━━━━━━━━━━━━━━━━━━━━\n";
        let count = 0;
        for (const cat in games) {
            games[cat].forEach(item => {
                count++;
                list += `${count}. ${cat} → ${item}\n`;
            });
        }
        if (count === 0) list += "لا توجد منتجات.";
        return ctx.editMessageText(list, {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback("🔙 رجوع", "adm#store")]
            ])
        });
    }

    // ===== إضافة قسم =====
    if (action === "add_cat") {
        userStates[uId] = { action: 'await_add_cat' };
        return ctx.editMessageText("✍️ اكتب اسم القسم الجديد:");
    }

    // ===== حذف قسم =====
    if (action === "del_cat") {
        const games = db.custom_store?.games || {};
        if (Object.keys(games).length === 0) return ctx.reply("⚠️ لا توجد أقسام!");
        const buttons = Object.keys(games).map(cat => [Markup.button.callback(`🗑️ ${cat}`, `adm#del_cat_${cat}`)]);
        buttons.push([Markup.button.callback("🔙 رجوع", "adm#store")]);
        return ctx.editMessageText("🗑️ **اختر القسم للحذف:**", {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard(buttons)
        });
    }

    // ===== إضافة منتج =====
    if (action === "add_prod") {
        const games = db.custom_store?.games || {};
        if (Object.keys(games).length === 0) return ctx.reply("⚠️ لا توجد أقسام!");
        const buttons = Object.keys(games).map(cat => [Markup.button.callback(cat, `adm#add_prod_${cat}`)]);
        buttons.push([Markup.button.callback("🔙 رجوع", "adm#store")]);
        return ctx.editMessageText("➕ **اختر القسم:**", {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard(buttons)
        });
    }

    // ===== حذف منتج =====
    if (action === "del_prod") {
        const games = db.custom_store?.games || {};
        if (Object.keys(games).length === 0) return ctx.reply("⚠️ لا توجد أقسام!");
        const buttons = Object.keys(games).map(cat => [Markup.button.callback(cat, `adm#del_prod_${cat}`)]);
        buttons.push([Markup.button.callback("🔙 رجوع", "adm#store")]);
        return ctx.editMessageText("🗑️ **اختر القسم:**", {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard(buttons)
        });
    }

    // ===== العودة =====
    if (action === "main") {
        const p = getSuperAdminPanel(db);
        return ctx.editMessageText(p.text, { parse_mode: 'Markdown', ...p.markup });
    }

    // ============================================================
    // ===== أوامر إضافية =====
    // ============================================================

    // إيقاف
    if (action === "stop") {
        db.bot_maintenance = true;
        dbFile.saveDB(db);
        return ctx.editMessageText("⏹️ تم إيقاف البوت.");
    }

    // تشغيل
    if (action === "start") {
        db.bot_maintenance = false;
        dbFile.saveDB(db);
        return ctx.editMessageText("▶️ تم تشغيل البوت.");
    }

    // سعر الصرف
    if (action === "rate") {
        userStates[uId] = { action: 'await_rate' };
        return ctx.editMessageText("✍️ اكتب سعر الصرف الجديد (مثال: 15000):");
    }

    // الملاحظات
    if (action === "notes") {
        userStates[uId] = { action: 'await_notes' };
        return ctx.editMessageText("✍️ اكتب الملاحظة الجديدة:");
    }

    // نسخة احتياطية
    if (action === "backup") {
        const backup = dbFile.loadDB();
        const json = JSON.stringify(backup, null, 2);
        await ctx.replyWithDocument({
            source: Buffer.from(json, 'utf8'),
            filename: `backup_${Date.now()}.json`
        });
        return ctx.editMessageText("✅ تم إرسال النسخة.");
    }

    // تنظيف
    if (action === "clean") {
        let count = 0;
        if (db.users) {
            for (const id in db.users) {
                if (db.users[id].balance_usd <= 0 && !db.banned?.[id]) {
                    delete db.users[id];
                    count++;
                }
            }
            dbFile.saveDB(db);
        }
        return ctx.editMessageText(`🧹 تم تنظيف ${count} مستخدم.`);
    }

    // حجم DB
    if (action === "db_size") {
        const size = JSON.stringify(db).length;
        const kb = (size / 1024).toFixed(2);
        const mb = (size / 1024 / 1024).toFixed(2);
        return ctx.editMessageText(`📊 **حجم DB:** ${kb} KB (${mb} MB)`);
    }

    // ============================================================
    // ===== حذف الأقسام والمنتجات =====
    // ============================================================

    if (action.startsWith("del_cat_")) {
        const cat = action.replace("del_cat_", "");
        if (db.custom_store?.games?.[cat]) {
            delete db.custom_store.games[cat];
            dbFile.saveDB(db);
            return ctx.editMessageText(`🗑️ تم حذف القسم [${cat}]`);
        }
        return ctx.reply("⚠️ القسم غير موجود.");
    }

    if (action.startsWith("add_prod_")) {
        const cat = action.replace("add_prod_", "");
        userStates[uId] = { action: 'await_add_prod', category: cat };
        return ctx.editMessageText(`✍️ اكتب المنتج الجديد لـ [${cat}]:\nالصيغة: الاسم - السعر$\nمثال: شدة 60 - 1.00$`);
    }

    if (action.startsWith("del_prod_")) {
        const cat = action.replace("del_prod_", "");
        const items = db.custom_store?.games?.[cat] || [];
        if (items.length === 0) return ctx.reply("⚠️ لا توجد منتجات.");
        const buttons = items.map(item => [Markup.button.callback(`🗑️ ${item}`, `adm#del_prod_item_${cat}_${item}`)]);
        buttons.push([Markup.button.callback("🔙 رجوع", "adm#store")]);
        return ctx.editMessageText(`🗑️ **اختر المنتج من [${cat}]:**`, {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard(buttons)
        });
    }

    if (action.startsWith("del_prod_item_")) {
        const parts = action.replace("del_prod_item_", "").split("_");
        const cat = parts[0];
        const item = parts.slice(1).join("_");
        if (db.custom_store?.games?.[cat]) {
            const index = db.custom_store.games[cat].indexOf(item);
            if (index !== -1) {
                db.custom_store.games[cat].splice(index, 1);
                dbFile.saveDB(db);
                return ctx.editMessageText(`🗑️ تم حذف [${item}] من [${cat}]`);
            }
        }
        return ctx.reply("⚠️ المنتج غير موجود.");
    }

    // إهداء
    if (action === "gift") {
        userStates[uId] = { action: 'await_gift_uid' };
        return ctx.editMessageText("✍️ اكتب آيدي المستخدم:");
    }

    // حظر
    if (action === "ban") {
        userStates[uId] = { action: 'await_ban_uid' };
        return ctx.editMessageText("✍️ اكتب آيدي المستخدم:");
    }

    // فك حظر
    if (action === "unban") {
        userStates[uId] = { action: 'await_unban_uid' };
        return ctx.editMessageText("✍️ اكتب آيدي المستخدم:");
    }

    // كتم
    if (action === "mute") {
        userStates[uId] = { action: 'await_mute_uid' };
        return ctx.editMessageText("✍️ اكتب آيدي المستخدم:");
    }

    // فك كتم
    if (action === "unmute") {
        userStates[uId] = { action: 'await_unmute_uid' };
        return ctx.editMessageText("✍️ اكتب آيدي المستخدم:");
    }

    // عرض رصيد
    if (action === "balance") {
        userStates[uId] = { action: 'await_balance_uid' };
        return ctx.editMessageText("✍️ اكتب آيدي المستخدم:");
    }

    return ctx.reply("🔐 هذا الزر خاص بالأدمن.");
}

// ============================================================
// ===== معالجة الدفع =====
// ============================================================
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

        await ctx.editMessageText(`✅ تم قبول الشحن`);
        await ctx.telegram.sendMessage(targetId, `✅ تم إضافة ${amount} ${currency === 'usd' ? '$' : 'ل.س'} إلى محفظتك!`);
    } else if (action === "pay_reject") {
        await ctx.editMessageText(`❌ تم رفض الشحن`);
        await ctx.telegram.sendMessage(targetId, "❌ عذراً، تم رفض طلب الشحن.");
    }
}

module.exports = {
    getSuperAdminPanel,
    handleSuperAdminCallback,
    handlePaymentDecision
};
