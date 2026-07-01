const { Markup } = require('telegraf');
const config = require('./config');

function initCharge(ctx, userStates, uId, db) {
    if (!db.users) db.users = {};
    if (!db.users[uId]) db.users[uId] = { balance_usd: 0.0 };
    const rate = db.exchange_rate || 14500;
    const usd = db.users[uId].balance_usd || 0;
    let btn = Markup.inlineKeyboard([
        [Markup.button.callback("💵 شحن بالدولار", "ch#usd"), Markup.button.callback("🇸🇾 شحن بالليرة السورية", "ch#syr")]
    ]);
    let msg = `💳 **مركز التحكم بالمحفظة الحية:**\n━━━━━━━━━━━━━━━━━━━━\n💰 **رصيدك الحالي داخل البوت:**\n💵 بالدولار: *${usd.toFixed(2)}$*\n🇸🇾 بالليرة السورية: * ${(usd * rate).toLocaleString()} ل.س*\n━━━━━━━━━━━━━━━━━━━━\nالرجاء اختيار فئة العملة التي ترغب في الشحن بها الآن:`;
    ctx.reply(msg, { parse_mode: 'Markdown', ...btn });
}

function askAmount(ctx, data, uId, userStates) {
    const isUsd = data === "ch#usd";
    userStates[uId] = { action: 'await_charge_amount', isUsd };
    let code = isUsd ? config.MY_TRANSFER_CODE_USD : config.MY_TRANSFER_CODE_SYR;
    ctx.reply(`📌 **بيانات تحويل الشام كاش الخاصة بنا:**\n\`${code}\`\n━━━━━━━━━━━━━━━━━━━━\n✍️ اكتب الآن المبلغ الرقمي الذي قمت بتحويله (أرقام فقط):`, { parse_mode: 'Markdown' });
}

async function handleChargeSteps(ctx, state, uId, userStates, db) {
    if (state.action === 'await_charge_amount') {
        const amount = parseFloat(ctx.message.text);
        if (isNaN(amount) || amount <= 0) return ctx.reply("❌ يرجى كتابة رقم صحيح وموجب!");
        userStates[uId] = { action: 'await_proof', amount, isUsd: state.isUsd };
        return ctx.reply("📸 أرسل الآن صورة إثبات الدفع (الوصل) أو اكتب رمز العملية لتأكيد طلبك:");
    }
    if (state.action === 'await_proof') {
        ctx.reply("✅ تم إرسال طلب الشحن وإثباتك للإدارة بنجاح. انتظر التفعيل!");
        let currency = state.isUsd ? "$" : "ل.س";
        let cap = `🏦 **طلب إيداع شحن جديد قيد الانتظار:**\n━━━━━━━━━━━━━━━━━━━━\n👤 الزبون: ${ctx.from.first_name}\n🆔 الآيدي: \`${ctx.chat.id}\`\n💰 المبلغ المرسل: *${state.amount} ${currency}*`;
        let btn = Markup.inlineKeyboard([
            [Markup.button.callback("✅ قبول الشحن وإضافة الرصيد", `pay_approve#${ctx.chat.id}#${state.amount}#${state.isUsd ? 'usd' : 'syr'}`)],
            [Markup.button.callback("❌ رفض وإلغاء الطلب", `pay_reject#${ctx.chat.id}`)]
        ]);
        if (ctx.message.photo) { await ctx.telegram.sendPhoto(config.ADMIN_CHANNEL_ID, ctx.message.photo.pop().file_id, { caption: cap, reply_markup: btn.reply_markup, parse_mode: 'Markdown' }); }
        else { await ctx.telegram.sendMessage(config.ADMIN_CHANNEL_ID, cap + `\n📝 الإثبات: ${ctx.message.text}`, { reply_markup: btn.reply_markup, parse_mode: 'Markdown' }); }
        userStates[uId] = null;
    }
}
module.exports = { initCharge, askAmount, handleChargeSteps };
