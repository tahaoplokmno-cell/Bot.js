const { Markup } = require('telegraf');
const config = require('./config');

function initCharge(ctx, userStates, uId, db) {
    if (!db.users) db.users = {};
    if (!db.users[uId]) db.users[uId] = { balance_usd: 0.0 };

    const rate = db.exchange_rate || 14500;
    const usd = db.users[uId].balance_usd || 0;

    const btn = Markup.inlineKeyboard([
        [Markup.button.callback("💵 شحن بالدولار", "ch#usd"),
         Markup.button.callback("🇸🇾 شحن بالليرة", "ch#syr")],
        [Markup.button.callback("🔙 العودة للقائمة", "main_menu")]
    ]);

    const msg = `💳 **مركز المحفظة:**\n━━━━━━━━━━━━━━━━━━━━\n💰 رصيدك: $${usd.toFixed(2)} | ${(usd * rate).toLocaleString()} ل.س\n📈 سعر الصرف: 1$ = ${rate.toLocaleString()} ل.س\n━━━━━━━━━━━━━━━━━━━━\nاختر العملة:`;
    ctx.reply(msg, { parse_mode: 'Markdown', ...btn });
}

function askAmount(ctx, data, uId, userStates) {
    const isUsd = data === "ch#usd";
    userStates[uId] = { action: 'await_charge_amount', isUsd };
    const code = isUsd ? config.MY_TRANSFER_CODE_USD : config.MY_TRANSFER_CODE_SYR;

    ctx.reply(`📌 **بيانات التحويل:**\n\`${code}\`\n━━━━━━━━━━━━━━━━━━━━\n✍️ اكتب المبلغ (أرقام فقط):`, {
        parse_mode: 'Markdown'
    });
}

async function handleChargeSteps(ctx, state, uId, userStates, db) {
    if (state.action === 'await_charge_amount') {
        const amount = parseFloat(ctx.message.text);
        if (isNaN(amount) || amount <= 0) {
            return ctx.reply("❌ اكتب رقماً صحيحاً!");
        }
        userStates[uId] = { action: 'await_proof', amount, isUsd: state.isUsd };
        return ctx.reply("📸  أرسل صورة إثبات الدفع أو رقم العملية:");
    }

    if (state.action === 'await_proof') {
        const currency = state.isUsd ? "$" : "ل.س";
        const cap = `🏦 **طلب شحن جديد:**\n👤 ${ctx.from.first_name}\n🆔 \`${ctx.chat.id}\`\n💰 المبلغ: *${state.amount} ${currency}*`;

        const btn = Markup.inlineKeyboard([
            [Markup.button.callback("✅ قبول", `pay_approve#${ctx.chat.id}#${state.amount}#${state.isUsd ? 'usd' : 'syr'}`)],
            [Markup.button.callback("❌ رفض", `pay_reject#${ctx.chat.id}`)]
        ]);

        if (ctx.message.photo) {
            await ctx.telegram.sendPhoto(config.ADMIN_CHANNEL_ID,
                ctx.message.photo.pop().file_id,
                { caption: cap, reply_markup: btn.reply_markup, parse_mode: 'Markdown' }
            );
        } else {
            await ctx.telegram.sendMessage(config.ADMIN_CHANNEL_ID,
                cap + `\n📝 الإثبات: ${ctx.message.text}`,
                { reply_markup: btn.reply_markup, parse_mode: 'Markdown' }
            );
        }
        ctx.reply("🚀 تم إرسال طلب الشحن للإدارة!");
        userStates[uId] = null;
    }
}

module.exports = { initCharge, askAmount, handleChargeSteps };
