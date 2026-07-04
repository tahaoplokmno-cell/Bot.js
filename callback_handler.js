const { Markup } = require('telegraf');
const adminActions = require('./admin_actions');
const charge = require('./charge');
const shop = require('./shop');
const devBot = require('./dev_bot');

module.exports = async function handleCallback(ctx, bot, db, userStates, saveDB) {
    const data = ctx.callbackQuery.data;
    const uId = String(ctx.from.id);

    await ctx.answerCbQuery().catch(() => {});

    // ===== 1️⃣ أزرار الأدمن =====
    if (data.startsWith("adm#")) {
        return adminActions.handleAdminCallback(ctx, data, uId, userStates, db, bot);
    }

    // ===== 2️⃣ أزرار المتجر =====
    if (data.startsWith("shop_cat#") || data.startsWith("buy_item#") || 
        data === "view_games" || data === "view_cards" || 
        data === "m#games" || data === "m#cards" || 
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

    // ===== 7️⃣ تأكيد الطلب =====
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
        await bot.telegram.sendMessage(require('./config').ADMIN_CHANNEL_ID, 
            `🛒 **طلب شراء جديد!**\n👤 ${ctx.from.first_name}\n🆔 \`${uId}\`\n🎁 ${state.item}\n💰 $${state.price}`
        ).catch(() => {});
        return;
    }

    // ===== 8️⃣ العودة للقائمة الرئيسية =====
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
