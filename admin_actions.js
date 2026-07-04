const { Markup } = require('telegraf');
const dbFile = require('./database');

// ===== لوحة التحكم الخارقة =====
function getSuperAdminPanel(db) {
    const totalUsers = Object.keys(db.users || {}).length;
    const totalOrders = (db.orders || []).length;
    const totalBotOrders = (db.bot_orders || []).length;
    const totalBalance = Object.values(db.users || {}).reduce((sum, u) => sum + (u.balance_usd || 0), 0);
    const lastUser = db.users ? Object.keys(db.users).pop() : "لا يوجد";

    return {
        text: `🛸 **لوحة التحكم الخارقة** 🛸\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
              `👥 المستخدمين: *${totalUsers}*\n` +
              `💰 إجمالي الأرصدة: *$${totalBalance.toFixed(2)}*\n` +
              `📦 العمليات: *${totalOrders}*\n` +
              `🤖 طلبات البوتات: *${totalBotOrders}*\n` +
              `👤 آخر مستخدم: \`${lastUser}\`\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
              `📌 اختر الإجراء:`,
        markup: Markup.inlineKeyboard([
            [Markup.button.callback("👥 إدارة المستخدمين", "adm#users")],
            [Markup.button.callback("🛒 إدارة المتجر", "adm#store")],
            [Markup.button.callback("🤖 طلبات البوتات", "adm#bot_orders")],
            [Markup.button.callback("💳 إدارة المحفظة", "adm#wallet")],
            [Markup.button.callback("📊 الإحصائيات", "adm#stats")],
            [Markup.button.callback("⚙️ إعدادات البوت", "adm#settings")],
            [Markup.button.callback("🔙 القائمة الرئيسية", "main_menu")]
        ])
    };
}

// ===== المعالج الرئيسي =====
async function handleSuperAdminCallback(ctx, data, uId, userStates, db, bot) {
    const parts = data.split("#");
    const action = parts[1];

    // ===== 1️⃣ إدارة المستخدمين =====
    if (action === "users") {
        return ctx.editMessageText("👥 **إدارة المستخدمين:**\n━━━━━━━━━━━━━━━━━━━━\nاختر الإجراء:",
            Markup.inlineKeyboard([
                [Markup.button.callback("📋 عرض المستخدمين", "adm#list_users")],
                [Markup.button.callback("💰 إهداء رصيد", "adm#gift")],
                [Markup.button.callback("🚫 حظر مستخدم", "adm#ban")],
                [Markup.button.callback("🟢 فك الحظر", "adm#unban")],
                [Markup.button.callback("🔙 رجوع", "adm#main")]
            ])
        );
    }

    // ===== 2️⃣ إدارة المتجر =====
    if (action === "store") {
        return ctx.editMessageText("🛒 **إدارة المتجر:**\n━━━━━━━━━━━━━━━━━━━━\nاختر الإجراء:",
            Markup.inlineKeyboard([
                [Markup.button.callback("📋 عرض الأقسام", "adm#list_categories")],
                [Markup.button.callback("➕ إضافة قسم", "adm#add_category")],
                [Markup.button.callback("🗑️ حذف قسم", "adm#delete_category")],
                [Markup.button.callback("➕ إضافة منتج", "adm#add_product")],
                [Markup.button.callback("✏️ تعديل منتج", "adm#edit_product")],
                [Markup.button.callback("🗑️ حذف منتج", "adm#delete_product")],
                [Markup.button.callback("🔙 رجوع", "adm#main")]
            ])
        );
    }

    // ===== 3️⃣ طلبات البوتات =====
    if (action === "bot_orders") {
        const orders = db.bot_orders || [];
        let list = "🤖 **طلبات البوتات:**\n━━━━━━━━━━━━━━━━━━━━\n";
        if (orders.length === 0) {
            list += "لا توجد طلبات.";
        } else {
            orders.forEach((o, i) => {
                list += `${i+1}. ${o.userName || o.userId} - ${o.server || 'غير محدد'}\n`;
            });
        }
        return ctx.editMessageText(list, {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback("📂 عرض التفاصيل", "adm#view_bot_orders")],
                [Markup.button.callback("🔙 رجوع", "adm#main")]
            ])
        });
    }

    // ===== 4️⃣ إدارة المحفظة =====
    if (action === "wallet") {
        return ctx.editMessageText("💳 **إدارة المحفظة:**\n━━━━━━━━━━━━━━━━━━━━\nاختر الإجراء:",
            Markup.inlineKeyboard([
                [Markup.button.callback("💰 إهداء رصيد", "adm#gift")],
                [Markup.button.callback("📊 عرض أرصدة", "adm#view_balances")],
                [Markup.button.callback("🔙 رجوع", "adm#main")]
            ])
        );
    }

    // ===== 5️⃣ الإحصائيات =====
    if (action === "stats") {
        const totalUsers = Object.keys(db.users || {}).length;
        const totalBalance = Object.values(db.users || {}).reduce((sum, u) => sum + (u.balance_usd || 0), 0);
        const totalOrders = (db.orders || []).length;
        const totalBotOrders = (db.bot_orders || []).length;
        const bannedCount = Object.keys(db.banned || {}).length;
        const lastUser = db.users ? Object.keys(db.users).pop() : "لا يوجد";

        return ctx.editMessageText(
            `📊 **الإحصائيات:**\n━━━━━━━━━━━━━━━━━━━━\n` +
            `👥 المستخدمين: *${totalUsers}*\n` +
            `💰 إجمالي الأرصدة: *$${totalBalance.toFixed(2)}*\n` +
            `📦 العمليات: *${totalOrders}*\n` +
            `🤖 طلبات البوتات: *${totalBotOrders}*\n` +
            `🚫 المحظورين: *${bannedCount}*\n` +
            `👤 آخر مستخدم: \`${lastUser}\``,
            { parse_mode: 'Markdown',
              reply_markup: Markup.inlineKeyboard([[Markup.button.callback("🔙 رجوع", "adm#main")]])
            }
        );
    }

    // ===== 6️⃣ إعدادات البوت =====
    if (action === "settings") {
        const status = db.bot_maintenance ? "🛑 معطل" : "✅ شغال";
        return ctx.editMessageText(`⚙️ **إعدادات البوت:**\n━━━━━━━━━━━━━━━━━━━━\nحالة البوت: *${status}*\nسعر الصرف: *${db.exchange_rate || 14500} ل.س*\n━━━━━━━━━━━━━━━━━━━━\nاختر الإجراء:`,
            Markup.inlineKeyboard([
                [Markup.button.callback("⏹️ إيقاف البوت", "adm#stop_bot")],
                [Markup.button.callback("▶️ تشغيل البوت", "adm#start_bot")],
                [Markup.button.callback("📈 تعديل سعر الصرف", "adm#edit_rate")],
                [Markup.button.callback("📝 تعديل الملاحظات", "adm#edit_notes")],
                [Markup.button.callback("🔙 رجوع", "adm#main")]
            ])
        );
    }

    // ===== 7️⃣ إيقاف البوت =====
    if (action === "stop_bot") {
        db.bot_maintenance = true;
        dbFile.saveDB(db);
        return ctx.editMessageText("⏹️ تم إيقاف البوت مؤقتاً. استخدم /start لتفعيله.");
    }

    // ===== 8️⃣ تشغيل البوت =====
    if (action === "start_bot") {
        db.bot_maintenance = false;
        dbFile.saveDB(db);
        return ctx.editMessageText("▶️ تم تشغيل البوت.");
    }

    // ===== 9️⃣ تعديل سعر الصرف =====
    if (action === "edit_rate") {
        userStates[uId] = { action: 'await_new_rate' };
        return ctx.editMessageText("✍️ اكتب سعر الصرف الجديد (مثال: 15000):");
    }

    // ===== 🔟 تعديل الملاحظات =====
    if (action === "edit_notes") {
        userStates[uId] = { action: 'await_new_notes' };
        return ctx.editMessageText("✍️ اكتب الملاحظة الجديدة:");
    }

    // ===== 1️⃣1️⃣ إهداء رصيد =====
    if (action === "gift") {
        userStates[uId] = { action: 'await_gift_uid' };
        return ctx.editMessageText("✍️ اكتب آيدي المستخدم:");
    }

    // ===== 1️⃣2️⃣ حظر =====
    if (action === "ban") {
        userStates[uId] = { action: 'await_ban_uid' };
        return ctx.editMessageText("✍️ اكتب آيدي المستخدم للحظر:");
    }

    // ===== 1️⃣3️⃣ فك الحظر =====
    if (action === "unban") {
        userStates[uId] = { action: 'await_unban_uid' };
        return ctx.editMessageText("✍️ اكتب آيدي المستخدم لفك الحظر:");
    }

    // ===== 1️⃣4️⃣ العودة للوحة الرئيسية =====
    if (action === "main") {
        const p = getSuperAdminPanel(db);
        return ctx.editMessageText(p.text, { parse_mode: 'Markdown', ...p.markup });
    }

    // ===== 1️⃣5️⃣ عرض قائمة المستخدمين =====
    if (action === "list_users") {
        const users = db.users || {};
        let list = "👥 **قائمة المستخدمين:**\n━━━━━━━━━━━━━━━━━━━━\n";
        let count = 0;
        for (const id in users) {
            count++;
            list += `${count}. ${users[id].name} (${id}) - $${users[id].balance_usd || 0}\n`;
            if (count >= 20) { 
                list += `\n... وعرض ${Object.keys(users).length - 20} مستخدمين آخرين`; 
                break; 
            }
        }
        return ctx.editMessageText(list, {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback("🔙 رجوع", "adm#users")]
            ])
        });
    }

    // ===== 1️⃣6️⃣ عرض الأقسام =====
    if (action === "list_categories") {
        const games = db.custom_store?.games || {};
        let list = "📂 **الأقسام:**\n━━━━━━━━━━━━━━━━━━━━\n";
        for (const cat in games) {
            list += `📂 *${cat}* (${games[cat].length} منتج)\n`;
        }
        return ctx.editMessageText(list, {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback("🔙 رجوع", "adm#store")]
            ])
        });
    }

    // ===== 1️⃣7️⃣ عرض أرصدة =====
    if (action === "view_balances") {
        const users = db.users || {};
        let list = "💰 **الأرصدة:**\n━━━━━━━━━━━━━━━━━━━━\n";
        let count = 0;
        for (const id in users) {
            count++;
            list += `${count}. ${users[id].name}: $${users[id].balance_usd || 0}\n`;
            if (count >= 20) break;
        }
        return ctx.editMessageText(list, {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback("🔙 رجوع", "adm#wallet")]
            ])
        });
    }

    // ===== 1️⃣8️⃣ عرض طلبات البوتات =====
    if (action === "view_bot_orders") {
        const orders = db.bot_orders || [];
        let list = "🤖 **تفاصيل الطلبات:**\n━━━━━━━━━━━━━━━━━━━━\n";
        if (orders.length === 0) {
            list += "لا توجد طلبات.";
        } else {
            orders.forEach((o, i) => {
                list += `${i+1}. 👤 ${o.userName || o.userId}\n`;
                list += `📝 ${o.desc || 'لا يوجد وصف'}\n`;
                list += `🖥️ السيرفر: ${o.server || 'غير محدد'}\n`;
                list += `📞 التواصل: ${o.contact || 'غير متوفر'}\n━━━━━━━━━━━━━━━━━━━━\n`;
            });
        }
        return ctx.editMessageText(list, {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback("🔙 رجوع", "adm#bot_orders")]
            ])
        });
    }

    // ===== 1️⃣9️⃣ إضافة قسم =====
    if (action === "add_category") {
        userStates[uId] = { action: 'await_add_category' };
        return ctx.editMessageText("✍️ اكتب اسم القسم الجديد:");
    }

    // ===== 2️⃣0️⃣ حذف قسم =====
    if (action === "delete_category") {
        userStates[uId] = { action: 'await_delete_category' };
        return ctx.editMessageText("✍️ اكتب اسم القسم الذي تريد حذفه:");
    }

    // ===== 2️⃣1️⃣ إضافة منتج =====
    if (action === "add_product") {
        userStates[uId] = { action: 'await_add_product' };
        return ctx.editMessageText("✍️ اكتب المنتج بالصيغة: `القسم|اسم_المنتج|السعر`\nمثال: ببجي موبايل|شدة 60|1.00");
    }

    // ===== 2️⃣2️⃣ تعديل منتج =====
    if (action === "edit_product") {
        userStates[uId] = { action: 'await_edit_product' };
        return ctx.editMessageText("✍️ اكتب المنتج المراد تعديله بالصيغة: `القسم|المنتج_القديم|المنتج_الجديد|السعر_الجديد`");
    }

    // ===== 2️⃣3️⃣ حذف منتج =====
    if (action === "delete_product") {
        userStates[uId] = { action: 'await_delete_product' };
        return ctx.editMessageText("✍️ اكتب المنتج المراد حذفه بالصيغة: `القسم|اسم_المنتج`");
    }

    // ===== أي زر غير معروف =====
    return ctx.reply("🔐 هذا الزر خاص بالأدمن.");
}

// ===== معالجة الدفع (قبول/رفض) =====
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

// ===== معالجة الـ Callback من text_handler =====
async function handleTextActions(ctx, data, uId, userStates, db, bot) {
    // هذه الدالة ستستخدم لمعالجة الأوامر النصية من الأدمن
    // مثل إضافة منتج، حذف منتج، إلخ
    return ctx.reply("⚠️ جاري التطوير...");
}

module.exports = { 
    getSuperAdminPanel, 
    handleSuperAdminCallback, 
    handlePaymentDecision,
    handleTextActions 
};
