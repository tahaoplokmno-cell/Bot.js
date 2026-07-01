const { Markup } = require('telegraf');
const config = require('./config');

function initCharge(ctx, userStates, uId) {
    userStates[uId] = { action: 'await_charge_amount' };
    ctx.reply(`💳 **قسم شحن المحفظة اليدوي:**\n━━━━━━━━━━━━━━━━━━━━\n📌 **بيانات التحويل الخاصة بي:**\n\`${config.MY_TRANSFER_CODE}\`\n━━━━━━━━━━━━━━━━━━━━\n✍️ يرجى كتابة المبلغ الذي قمت بتحويله الآن (أرقام فقط بالدولار أو الليرة):`, { parse_mode: 'Markdown' });
}

async function handleChargeSteps(ctx, state, uId, userStates) {
    if (state.action === 'await_charge_amount') {
        const amount = parseFloat(ctx.message.text);
        if (isNaN(amount) || amount <= 0) return ctx.reply("❌ عذراً، يرجى كتابة رقم صحيح وموجب للمبلغ!");
        userStates[uId] = { action: 'await_proof', amount: amount };
        return ctx.reply("📸 رائع جداً! أرسل الآن صورة إثبات الدفع (الوصل) أو اكتب رمز العملية لتأكيد طلبك:");
    }
    if (state.action === 'await_proof') {
        ctx.reply("✅ تم إرسال طلب الشحن وإثباتك للإدارة بنجاح. يرجى انتظار التفعيل!");
        let cap = `🏦 **طلب إيداع شحن جديد قيد الانتظار:**\n━━━━━━━━━━━━━━━━━━━━\n👤 الزبون: ${ctx.from.first_name}\n🆔 آيدي العميل: \`${ctx.chat.id}\`\n💰 المبلغ المراد شحنه: *${state.amount}$*`;
        let btn = Markup.inlineKeyboard([
            [Markup.button.callback("✅ قبول الشحن وإضافة الرصيد", `pay_approve#${ctx.chat.id}#${state.amount}`)],
            [Markup.button.callback("❌ رفض وإلغاء الطلب", `pay_reject#${ctx.chat.id}`)]
        ]);
        if (ctx.message.photo) { 
            await ctx.telegram.sendPhoto(config.ADMIN_CHANNEL_ID, ctx.message.photo.pop().file_id, { caption: cap, reply_markup: btn.reply_markup, parse_mode: 'Markdown' }); 
        } else { 
            await ctx.telegram.sendMessage(config.ADMIN_CHANNEL_ID, cap + `\n📝 الإثبات المكتوب: ${ctx.message.text}`, { reply_markup: btn.reply_markup, parse_mode: 'Markdown' }); 
        }
        userStates[uId] = null;
    }
}

module.exports = { initCharge, handleChargeSteps };

