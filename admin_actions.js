const { Markup } = require('telegraf');
const dbFile = require('./database');

// ===== لوحة التحكم الرئيسية =====
function getSuperAdminPanel(db) {
    const totalUsers = Object.keys(db.users || {}).length;
    const totalOrders = (db.orders || []).length;
    const totalBotOrders = (db.bot_orders || []).length;
    const totalBalance = Object.values(db.users || {}).reduce((sum, u) => sum + (u.balance_usd || 0), 0);

    return {
        text: `🛸 **لوحة التحكم الخارقة (SUPER ADMIN)** 🛸\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
              `👥 المستخدمين: *${totalUsers}*\n` +
              `💰 إجمالي الأرصدة: *$${totalBalance.toFixed(2)}*\n` +
              `📦 العمليات: *${totalOrders}*\n` +
              `🤖 طلبات البوتات: *${totalBotOrders}*\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
              `📌 اختر قسم الإدارة:`,
        markup: Markup.inlineKeyboard([
            [Markup.button.callback("👥 إدارة المستخدمين", "adm#users")],
            [Markup.button.callback("📦 إدارة العمليات", "adm#orders")],
            [Markup.button.callback("🛒 إدارة المتجر (الأقسام والمنتجات)", "adm#store")],
            [Markup.button.callback("🤖 إدارة طلبات البوتات", "adm#bot_orders")],
            [Markup.button.callback("📅 إدارة الأقساط", "adm#installments")],
            [Markup.button.callback("🎨 إدارة الواجهة (النصوص والأزرار)", "adm#interface")],
            [Markup.button.callback("📊 الإحصائيات المتقدمة", "adm#advanced_stats")],
            [Markup.button.callback("💾 إدارة قاعدة البيانات", "adm#database")],
            [Markup.button.callback("🔙 العودة للقائمة الرئيسية", "main_menu")]
        ])
    };
}

// ===== معالج الأزرار الخارق =====
async function handleSuperAdminCallback(ctx, data, uId, userStates, db, bot) {
    const parts = data.split("#");
    const action = parts[1];

    // ===== 1️⃣ إدارة المستخدمين =====
    if (action === "users") {
        const users = db.users || {};
        let list = "👥 **قائمة المستخدمين:**\n━━━━━━━━━━━━━━━━━━━━\n";
        let count = 0;
        for (const id in users) {
            count++;
            list += `${count}. ${users[id].name} (${id}) - $${users[id].balance_usd || 0}\n`;
            if (count >= 20) { list += `\n... وعرض ${Object.keys(users).length - 20} مستخدمين آخرين`; break; }
        }
        return ctx.editMessageText(list, {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback("💰 إهداء رصيد", "adm#gift_user")],
                [Markup.button.callback("🚫 حظر مستخدم", "adm#ban_user")],
                [Markup.button.callback("🟢 فك حظر", "adm#unban_user")],
                [Markup.button.callback("📊 عرض رصيد مستخدم", "adm#view_balance")],
                [Markup.button.callback("🔙 رجوع للوحة", "adm#main")]
            ])
        });
    }

    // ===== 2️⃣ إدارة العمليات =====
    if (action === "orders") {
        const orders = db.orders || [];
        let list = "📦 **العمليات الأخيرة:**\n━━━━━━━━━━━━━━━━━━━━\n";
        if (orders.length === 0) {
            list += "لا توجد عمليات حالياً.";
        } else {
            const recent = orders.slice(-10).reverse();
            recent.forEach((o, i) => {
                list += `${i+1}. ${o.type} - $${o.amount} - ${o.userId}\n`;
            });
        }
        return ctx.editMessageText(list, {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback("📥 تصدير العمليات", "adm#export_orders")],
                [Markup.button.callback("🔙 رجوع للوحة", "adm#main")]
            ])
        });
    }

    // ===== 3️⃣ إدارة المتجر =====
    if (action === "store") {
        const games = db.custom_store?.games || {};
        let list = "🛒 **الأقسام والمنتجات:**\n━━━━━━━━━━━━━━━━━━━━\n";
        for (const cat in games) {
            list += `📂 *${cat}* (${games[cat].length} منتج)\n`;
        }
        return ctx.editMessageText(list, {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback("➕ إضافة قسم", "adm#add_category")],
                [Markup.button.callback("🗑️ حذف قسم", "adm#delete_category")],
                [Markup.button.callback("➕ إضافة منتج", "adm#add_product")],
                [Markup.button.callback("✏️ تعديل منتج", "adm#edit_product")],
                [Markup.button.callback("🗑️ حذف منتج", "adm#delete_product")],
                [Markup.button.callback("🔙 رجوع للوحة", "adm#main")]
            ])
        });
    }

    // ===== 4️⃣ إدارة طلبات البوتات =====
    if (action === "bot_orders") {
        const botOrders = db.bot_orders || [];
        let list = "🤖 **طلبات البوتات:**\n━━━━━━━━━━━━━━━━━━━━\n";
        if (botOrders.length === 0) {
            list += "لا توجد طلبات بوتات حالياً.";
        } else {
            botOrders.forEach((o, i) => {
                list += `${i+1}. ${o.userName} - السيرفر: ${o.server} - الحالة: ${o.status}\n`;
            });
        }
        return ctx.editMessageText(list, {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback("📂 عرض الطلبات", "adm#view_bot_orders")],
                [Markup.button.callback("🔙 رجوع للوحة", "adm#main")]
            ])
        });
    }

    // ===== 5️⃣ إدارة الأقساط =====
    if (action === "installments") {
        return ctx.editMessageText("📅 **إدارة الأقساط:**\n━━━━━━━━━━━━━━━━━━━━\nاختر خياراً:",
            Markup.inlineKeyboard([
                [Markup.button.callback("➕ إضافة قسط", "adm#add_installment")],
                [Markup.button.callback("📋 عرض الأقساط", "adm#view_installments")],
                [Markup.button.callback("🔙 رجوع للوحة", "adm#main")]
            ])
        );
    }

    // ===== 6️⃣ إدارة الواجهة =====
    if (action === "interface") {
        return ctx.editMessageText("🎨 **إدارة الواجهة:**\n━━━━━━━━━━━━━━━━━━━━\n✍️ اكتب النص الجديد للرسالة الترحيبية:",
            Markup.inlineKeyboard([
                [Markup.button.callback("🔙 رجوع للوحة", "adm#main")]
            ])
        );
    }

    // ===== 7️⃣ الإحصائيات المتقدمة =====
    if (action === "advanced_stats") {
        const totalUsers = Object.keys(db.users || {}).length;
        const totalBalance = Object.values(db.users || {}).reduce((sum, u) => sum + (u.balance_usd || 0), 0);
        const totalOrders = (db.orders || []).length;
        const totalBotOrders = (db.bot_orders || []).length;
        const totalInstallments = (db.installments || []).length;
        const bannedCount = Object.keys(db.banned || {}).length;

        return ctx.editMessageText(
            `📊 **الإحصائيات المتقدمة:**\n━━━━━━━━━━━━━━━━━━━━\n` +
            `👥 المستخدمين: *${totalUsers}*\n` +
            `💰 إجمالي الأرصدة: *$${totalBalance.toFixed(2)}*\n` +
            `📦 العمليات: *${totalOrders}*\n` +
            `🤖 طلبات البوتات: *${totalBotOrders}*\n` +
            `📅 الأقساط: *${totalInstallments}*\n` +
            `🚫 المحظورين: *${bannedCount}*`,
            { parse_mode: 'Markdown',
              reply_markup: Markup.inlineKeyboard([[Markup.button.callback("🔙 رجوع للوحة", "adm#main")]])
            }
        );
    }

    // ===== 8️⃣ إدارة قاعدة البيانات =====
    if (action === "database") {
        return ctx.editMessageText("💾 **إدارة قاعدة البيانات:**\n━━━━━━━━━━━━━━━━━━━━\nاختر خياراً:",
            Markup.inlineKeyboard([
                [Markup.button.callback("📥 سحب نسخة احتياطية", "adm#backup")],
                [Markup.button.callback("📤 استعادة نسخة", "adm#restore")],
                [Markup.button.callback("🧹 تنظيف قاعدة البيانات", "adm#clean_db")],
                [Markup.button.callback("🔙 رجوع للوحة", "adm#main")]
            ])
        );
    }

    // ===== 9️⃣ العودة للوحة الرئيسية =====
    if (action === "main") {
        const p = getSuperAdminPanel(db);
        return ctx.editMessageText(p.text, { parse_mode: 'Markdown', ...p.markup });
    }

    // ===== 🔟 أوامر إضافية (إضافة، حذف، تعديل) =====
    if (action === "add_category") {
        userStates[uId] = { action: 'await_add_category' };
        return ctx.editMessageText("✍️ اكتب اسم القسم الجديد:");
    }

    if (action === "delete_category") {
        userStates[uId] = { action: 'await_delete_category' };
        return ctx.editMessageText("✍️ اكتب اسم القسم الذي تريد حذفه:");
    }

    if (action === "add_product") {
        userStates[uId] = { action: 'await_add_product' };
        return ctx.editMessageText("✍️ اكتب اسم المنتج بالصيغة: `القسم|اسم_المنتج|السعر`");
    }

    if (action === "edit_product") {
        userStates[uId] = { action: 'await_edit_product' };
        return ctx.editMessageText("✍️ اكتب المنتج المراد تعديله بالصيغة: `القسم|المنتج_القديم|المنتج_الجديد|السعر_الجديد`");
    }

    if (action === "delete_product") {
        userStates[uId] = { action: 'await_delete_product' };
        return ctx.editMessageText("✍️ اكتب اسم المنتج المراد حذفه بالصيغة: `القسم|اسم_المنتج`");
    }

    if (action === "gift_user") {
        userStates[uId] = { action: 'await_gift_uid' };
        return ctx.editMessageText("✍️ اكتب آيدي المستخدم الذي تريد إهداءه:");
    }

    if (action === "ban_user") {
        userStates[uId] = { action: 'await_ban_uid' };
        return ctx.editMessageText("✍️ اكتب آيدي المستخدم الذي تريد حظره:");
    }

    if (action === "unban_user") {
        userStates[uId] = { action: 'await_unban_uid' };
        return ctx.editMessageText("✍️ اكتب آيدي المستخدم الذي تريد فك حظره:");
    }

    if (action === "view_balance") {
        userStates[uId] = { action: 'await_view_balance_uid' };
        return ctx.editMessageText("✍️ اكتب آيدي المستخدم لعرض رصيده:");
    }

    if (action === "backup") {
        const backup = dbFile.loadDB();
        const json = JSON.stringify(backup, null, 2);
        await ctx.replyWithDocument({
            source: Buffer.from(json, 'utf8'),
            filename: `backup_${Date.now()}.json`
        });
        return ctx.editMessageText("✅ تم إرسال النسخة الاحتياطية.");
    }

    if (action === "clean_db") {
        // تنظيف المستخدمين الذين ليس لديهم رصيد
        if (db.users) {
            for (const id in db.users) {
                if (db.users[id].balance_usd <= 0 && !db.banned?.[id]) {
                    delete db.users[id];
                }
            }
            dbFile.saveDB(db);
        }
        return ctx.editMessageText("🧹 تم تنظيف قاعدة البيانات.");
    }

    // ===== أي زر غير معروف =====
    return ctx.reply("🔐 هذا زر خاص بالأدمن.");
}

// ===== تصدير الدوال =====
module.exports = {
    getSuperAdminPanel,
    handleSuperAdminCallback
};
