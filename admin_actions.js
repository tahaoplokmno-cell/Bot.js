const { Markup } = require('telegraf');
const shop = require('./shop');
const charge = require('./charge');
const devBot = require('./dev_bot');
const settings = require('./settings');
const adminActions = require('./admin_actions');

module.exports = async function handleCallback(ctx, bot, db, userStates, saveDB) {
    const data = ctx.callbackQuery.data;
    const uId = String(ctx.from.id);

    await ctx.answerCbQuery().catch(() => {});

    // ===== أزرار الأدمن =====
    if (data.startsWith("adm#")) {
        return adminActions.handleSuperAdminCallback(ctx, data, uId, userStates, db, bot);
    }

    // ===== أزرار المتجر =====
    if (data.startsWith("shop#") || data.startsWith("buy#") || data === "confirm_order" ||
        data.startsWith("send_code#") || data === "m#phone" || data.startsWith("order#") ||
        data === "store_back") {
        return shop.handleShopCallback(ctx, data, uId, userStates, db);
    }

    // ===== إنشاء بوت =====
    if (data === "bot_order#start") {
        return devBot.initBotOrder(ctx, userStates, uId);
    }

    // ===== الشحن =====
    if (data.startsWith("ch#")) {
        return charge.askAmount(ctx, data, uId, userStates);
    }

    if (data.startsWith("amt#") || data.startsWith("amts#")) {
        const amount = data.split("#")[1];
        userStates[uId] = { action: 'await_charge_amount', amount: parseFloat(amount), isUsd: data.startsWith("amt#") };
        return ctx.reply(`📸 أرسل صورة إثبات الدفع`);
    }

    if (data.startsWith("pay_approve#") || data.startsWith("pay_reject#")) {
        return adminActions.handlePaymentDecision(ctx, data, uId, db, saveDB);
    }

    // ===== استرجاع الأموال =====
    if (data.startsWith("ref_app#") || data.startsWith("ref_rej#")) {
        const parts = data.split("#");
        const targetId = parts[1];
        const amount = parseFloat(parts[2]) || 0;
        if (data.startsWith("ref_app#")) {
            if (db.users[targetId]) {
                db.users[targetId].balance_usd = (db.users[targetId].balance_usd || 0) - amount;
                saveDB(db);
                await ctx.editMessageText(`✅ تم استرجاع $${amount}`);
                await bot.telegram.sendMessage(targetId, `✅ تم استرجاع $${amount}`);
            }
        } else {
            await ctx.editMessageText(`❌ تم رفض الاسترجاع`);
            await bot.telegram.sendMessage(targetId, "❌ عذراً، تم رفض استرجاع الأموال.");
        }
        return;
    }

    if (data.startsWith("refund#")) {
        const currency = data.split("#")[1];
        userStates[uId] = { action: 'await_refund_amount', currency };
        const msg = currency === 'usd' ? "✍️ اكتب المبلغ بالدولار:" : "✍️ اكتب المبلغ بالليرة:";
        return ctx.reply(msg);
    }

    // ===== طلب بوت =====
    if (data.startsWith("srv#")) {
        return devBot.handleServerChoice(ctx, data, uId, userStates, bot);
    }

    if (data.startsWith("bot_dec#")) {
        const parts = data.split("#");
        const action = parts[1];
        const clientId = parts[2];
        if (action === "price") {
            userStates[uId] = { action: 'await_bot_price', targetCustomerId: clientId };
            return ctx.editMessageText(`✍️ اكتب السعر للمستخدم ${clientId}:`);
        }
        if (action === "desc") {
            userStates[uId] = { action: 'await_bot_desc_admin', targetCustomerId: clientId };
            return ctx.editMessageText(`✍️ اكتب وصف إضافي`);
        }
        if (action === "time") {
            userStates[uId] = { action: 'await_bot_time', targetCustomerId: clientId };
            return ctx.editMessageText(`✍️ اكتب الوقت المتوقع`);
        }
        if (action === "file") {
            userStates[uId] = { action: 'await_bot_file', targetCustomerId: clientId };
            return ctx.editMessageText(`📤 أرسل الملف`);
        }
    }

    // ===== العودة للقائمة =====
    if (data === "main_menu") {
        const mainMenu = Markup.keyboard([
            ['🏪 المتجر'],
            ['💳 المحفظة', '💰 استرجاع الأموال'],
            ['⚙️ الإعدادات', '📞 الدعم الفني']
        ]).resize();
        return ctx.editMessageText("🎯 **القائمة الرئيسية**", {
            parse_mode: 'Markdown',
            reply_markup: mainMenu
        });
    }

    return ctx.reply("⚠️ هذا الزر غير مفعل حالياً.");
};
