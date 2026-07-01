const { Markup } = require('telegraf');

async function handleCodeAndOrders(ctx, bot, userStates, uId, state) {
    if (state.action === 'admin_send_code_now' && ctx.message.text) { 
        await bot.telegram.sendMessage(state.clientUId, 
`🎁 **وصلك كود الشحن الخاص بطلبك بنجاح:**\n\n\`${ctx.message.text}\`\n\n━━━━━━━━━━━━━━━━━━━━\n🚀 **رابط استرداد الأكواد الفوري للببجي والألعاب:**\n1️⃣ يرجى الدخول للموقع المعتمد: [midasbuy.com](https://midasbuy.com)\n2️⃣ ضع آيدي حسابك والكود المستلم لتفعيله فوراً.\n3️⃣ **ملاحظة:** يجب تشغيل الـ VPN إذا كنت داخل سوريا ليفتح الموقع بنجاح!`, 
        { parse_mode: 'Markdown', disable_web_page_preview: false }).catch(console.error);
        ctx.reply("✅ تم تسليم الكود وتغليق الطلب بنجاح."); 
        userStates[uId] = null; return true; 
    }
    if (state.action === 'await_game_id' && ctx.message.text) { 
        userStates[uId] = { ...state, action: 'confirmed', gameId: ctx.message.text }; 
        return ctx.reply(`🎯 **تأكيد طلب الشحن:**\n\n🆔 آيدي حسابك: \`${ctx.message.text}\`\n🎁 المنتج: *${state.item}*\n💵 السعر: *${state.price}$*`, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback("✔️ تأكيد ودفع فوراً", "confirm_order")]]) }); 
    }
    return false;
}
module.exports = { handleCodeAndOrders };
