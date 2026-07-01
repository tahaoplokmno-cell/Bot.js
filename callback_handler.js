const { Markup } = require('telegraf');
const config = require('./config');
const charge = require('./charge');
const adminActions = require('./admin_actions');
const devBot = require('./dev_bot');
const shop = require('./shop');

async function handleAllCallbacks(ctx, bot, db, userStates, saveDB) {
    const data = ctx.callbackQuery.data; const uId = String(ctx.from.id); await ctx.answerCbQuery().catch(()=>{});
    if (await charge.handleStoreDecisions(ctx, bot, db, userStates, saveDB, uId)) return;
    if (data.startsWith("adm#")) return adminActions.handleAdminCallback(ctx, data, uId, userStates, db);
    if (data.startsWith("ch#")) return charge.askAmount(ctx, data, uId, userStates);
    if (data.startsWith("srv#")) return devBot.handleServerChoice(ctx, data, uId, userStates);
    if (data === "confirm_order") {
        const state = userStates[uId]; if (!state) return ctx.reply("❌ لا يوجد طلب نشط.");
        let uBal = db.users[uId]?.balance_usd || 0; let rate = db.exchange_rate || 14500;
        let chanBtn = Markup.inlineKeyboard([[Markup.button.callback("✅ قبول وتفعيل الكود", `order_dec#accept#${uId}#${state.price}`)], [Markup.button.callback("❌ رفض وإلغاء", `order_dec#reject#${uId}`)]]);
        await bot.telegram.sendMessage(config.ADMIN_CHANNEL_ID, `📥 **طلب شراء جديد:**\n━━━━━━━━━━━━━━━━━━━━\n👤 الزبون: ${ctx.from.first_name}\n🆔 آيدي التليجرام: \`${uId}\`\n💰 رصيده: *$${uBal.toFixed(2)}* (${(uBal * rate).toLocaleString()} ل.س)\n🎯 المنتج: *${state.item}*\n💵 السعر: *${state.price}$*\n🆔 آيدي اللعبة: \`${state.gameId}\``, { reply_markup: chanBtn.reply_markup, parse_mode: 'Markdown' }).catch(console.error);
        ctx.reply("🚀 تم إرسال طلب الشراء الخاص بك بنجاح إلى الإدارة! انتظر موافقة المسؤول هنا ليظهر لك الكود."); userStates[uId] = null; return;
    }
    shop.handleStore(ctx, data, uId, db, userStates);
}
module.exports = { handleAllCallbacks };
