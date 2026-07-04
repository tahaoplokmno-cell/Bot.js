
const { Markup } = require('telegraf');
const adminActions = require('./admin_actions');
const charge = require('./charge');
const shop = require('./shop');  // ✅ أضف هذا السطر

module.exports = async function handleCallback(ctx, bot, db, userStates, saveDB) {
    const data = ctx.callbackQuery.data;
    const uId = String(ctx.from.id);

    await ctx.answerCbQuery().catch(() => {});

    // ✅ أزرار الأدمن
    if (data.startsWith("adm#")) {
        return adminActions.handleAdminCallback(ctx, data, uId, userStates, db);
    }

    // ✅ أزرار المتجر (من shop.js)
    if (data.startsWith("shop_cat#") || data.startsWith("buy_item#") || 
        data === "view_games" || data === "view_cards" || 
        data === "m#games" || data === "m#cards" || 
        data.startsWith("order_syr_card#")) {
        return shop.handleShopCallback(ctx, data, uId, userStates, db);
    }

    // ✅ أزرار الشحن
    if (data.startsWith("ch#")) {
        return charge.askAmount(ctx, data, uId, userStates);
    }

    // ✅ أزرار قبول/رفض الدفع
    if (data.startsWith("pay_approve#") || data.startsWith("pay_reject#")) {
        return adminActions.handlePaymentDecision(ctx, data, uId, db, saveDB);
    }

    // ✅ تأكيد الطلب
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
            `🛒 **طلب شراء جديد:**\n👤 ${ctx.from.first_name}\n🆔 \`${uId}\`\n🎁 ${state.item}\n💰 $${state.price}`
        ).catch(() => {});
        return;
    }

    // ✅ العودة للقائمة الرئيسية
    if (data === "main_menu") {
        const mainMenu = Markup.keyboard([
            ['🏪 المتجر'],
            ['💳 شحن الرصيد والمحفظة', '💰 استرجاع الأموال'],
            ['⚙️ الإعدادات', '📞 الدعم الفني']
        ]).resize();
        return ctx.editMessageText("🎯 **القائمة الرئيسية**", {
            parse_mode: 'Markdown',
            reply_markup: mainMenu
        });
    }

    // ✅ أي زر آخر غير معروف
    return ctx.reply("⚠️ هذا الزر غير مفعل حالياً.");
};
