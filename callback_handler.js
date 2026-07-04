const { Markup } = require('telegraf');
const adminActions = require('./admin_actions');
const charge = require('./charge');
const shop = require('./shop');
const devBot = require('./dev_bot');
const config = require('./config');

module.exports = async function handleCallback(ctx, bot, db, userStates, saveDB) {
    const data = ctx.callbackQuery.data;
    const uId = String(ctx.from.id);

    await ctx.answerCbQuery().catch(() => {});

    // ===== 1️⃣ أزرار الأدمن الخارقة =====
    if (data.startsWith("adm#")) {
        return adminActions.handleSuperAdminCallback(ctx, data, uId, userStates, db, bot);
    }

    // ===== 2️⃣ أزرار المتجر =====
    if (data.startsWith("shop_cat#") || data.startsWith("buy_item#") ||
        data === "view_games" || data === "view_cards" ||
        data === "m#games" || data === "m#cards" || data === "m#phone" ||
        data.startsWith("order_syr_card#")) {
        return shop.handleShopCallback(ctx, data, uId, userStates, db);
    }

    // ===== 3️⃣ أزرار إنشاء بوت =====
    if (data === "bot_order#start" || data.startsWith("bot_order#")) {
        return devBot.initBotOrder(ctx, userStates, uId);
    }

    // ===== 4️⃣ أزرار الشحن =====
    if (data.startsWith("ch#")) {
        return charge.askAmount(ctx, data, uId, userStates);
    }

    // ===== 5️⃣ أزرار فئات الشحن =====
    if (data.startsWith("amt#") || data.startsWith("amts#")) {
        const amount = data.split("#")[1];
        userStates[uId] = { action: 'await_charge_amount', amount: parseFloat(amount), isUsd: data.startsWith("amt#") };
        return ctx.reply(`📸 أرسل صورة إثبات الدفع بقيمة ${amount} ${data.startsWith("amt#") ? '$' : 'ل.س'}`);
    }

    // ===== 6️⃣ أزرار قبول/رفض الدفع =====
    if (data.startsWith("pay_approve#") || data.startsWith("pay_reject#")) {
        return adminActions.handlePaymentDecision(ctx, data, uId, db, saveDB);
    }

    // ===== 7️⃣ أزرار استرجاع الأموال =====
    if (data.startsWith("ref_app#") || data.startsWith("ref_rej#")) {
        const parts = data.split("#");
        const targetId = parts[1];
        const amount = parseFloat(parts[2]) || 0;

        if (data.startsWith("ref_app#")) {
            if (db.users[targetId]) {
                db.users[targetId].balance_usd = (db.users[targetId].balance_usd || 0) - amount;
                saveDB(db);
                await ctx.editMessageText(`✅ تم استرجاع $${amount} للمستخدم ${targetId}`);
                await bot.telegram.sendMessage(targetId, `✅ تم استرجاع $${amount} إلى محفظتك!`);
            }
        } else {
            await ctx.editMessageText(`❌ تم رفض طلب الاسترجاع للمستخدم ${targetId}`);
            await bot.telegram.sendMessage(targetId, "❌ عذراً، تم رفض طلب استرجاع الأموال.");
        }
        return;
    }

    // ===== 8️⃣ أزرار السيرفر (إنشاء بوت) =====
    if (data.startsWith("srv#")) {
        return devBot.handleServerChoice(ctx, data, uId, userStates, bot);
    }

    // ===== 9️⃣ أزرار قبول/رفض طلب البوت =====
    if (data.startsWith("bot_dec#")) {
        const parts = data.split("#");
        const action = parts[1];
        const clientId = parts[2];

        if (action === "approve") {
            userStates[clientId] = { action: 'await_admin_price_time', targetCustomerId: clientId };
            await ctx.editMessageText(`✅ تم قبول طلب البوت للمستخدم ${clientId}\n✍️ اكتب السعر والوقت المقدر:`);
        } else {
            await ctx.editMessageText(`❌ تم رفض طلب البوت للمستخدم ${clientId}`);
            await bot.telegram.sendMessage(clientId, "❌ عذراً، تم رفض طلب إنشاء البوت الخاص بك.");
        }
        return;
    }

    // ===== 🔟 تأكيد الطلب =====
    if (data === "confirm_order") {
        const state = userStates[uId];
        if (!state || state.action !== 'confirmed') {
            return ctx.reply("❌ لا يوجد طلب مؤكد.");
        }
        const userBal = db.users?.[uId]?.balance_usd || 0;
        if (userBal < state.price) {
            return ctx.reply(`❌ رصيدك غير كافٍ! المطلوب $${state.price}`);
        }
        db.users[uId].balance_usd = userBal - state.price;
        saveDB(db);
        userStates[uId] = null;
        const msg = `✅ **تم الشراء بنجاح!**\n🎁 المنتج: *${state.item}*\n💰 الخصم: *$${state.price}*\n🆔 الآيدي: \`${state.gameId || 'غير محدد'}\``;
        await ctx.editMessageText(msg, { parse_mode: 'Markdown' });
        await bot.telegram.sendMessage(config.ADMIN_CHANNEL_ID,
            `🛒 **طلب شراء جديد!**\n👤 ${ctx.from.first_name}\n🆔 \`${uId}\`\n🎁 ${state.item}\n💰 $${state.price}`
        ).catch(() => {});
        return;
    }

    // ===== 1️⃣1️⃣ العودة للقائمة الرئيسية =====
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
