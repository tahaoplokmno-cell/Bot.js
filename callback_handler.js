const { Markup } = require('telegraf');
const adminActions = require('./admin_actions');
const charge = require('./charge');

module.exports = async function handleCallback(ctx, bot, db, userStates, saveDB) {
    const data = ctx.callbackQuery.data;
    const uId = String(ctx.from.id);

    // تجاهل أي استدعاء أولاً
    await ctx.answerCbQuery().catch(() => {});

    // ✅ أزرار الأدمن (تبدأ بـ "adm#")
    if (data.startsWith("adm#")) {
        return adminActions.handleAdminCallback(ctx, data, uId, userStates, db);
    }

    // ✅ أزرار الشحن (تبدأ بـ "ch#")
    if (data.startsWith("ch#")) {
        // ch#usd أو ch#syr
        return charge.askAmount(ctx, data, uId, userStates);
    }

    // ✅ أزرار قبول/رفض الدفع (تبدأ بـ "pay_approve#" أو "pay_reject#")
    if (data.startsWith("pay_approve#") || data.startsWith("pay_reject#")) {
        return adminActions.handlePaymentDecision(ctx, data, uId, db, saveDB);
    }

    // ✅ أزرار العودة للقائمة الرئيسية
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
