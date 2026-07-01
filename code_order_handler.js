const { Markup } = require('telegraf');

async function handleCodeAndOrders(ctx, bot, userStates, uId, state) {
    // 1. تسليم كود ببجي والتعليمات فوراً للمشترك بمجرد إرسال الأدمن للكود
    if (state.action === 'admin_send_code_now' && ctx.message.text) { 
        const targetClient = state.clientUId || state.targetUid;
        
        if (targetClient) {
            await bot.telegram.sendMessage(targetClient, 
`🎁 **وصلك كود الشحن الخاص بطلبك بنجاح:**

\`${ctx.message.text}\`

━━━━━━━━━━━━━━━━━━━━
🚀 **رابط استرداد الأكواد الفوري للببجي والألعاب:**
1️⃣ يرجى الدخول للموقع المعتمد: [midasbuy.com](https://midasbuy.com)
2️⃣ ضع آيدي حسابك والكود المستلم لتفعيله فوراً.
3️⃣ **ملاحظة:** يجب تشغيل الـ VPN إذا كنت داخل سوريا ليفتح الموقع بنجاح! ❤️`, 
            { parse_mode: 'Markdown', disable_web_page_preview: false }).catch(console.error);
            
            ctx.reply("✅ تم تسليم الكود وإغلاق الطلب بنجاح."); 
        } else {
            ctx.reply("❌ حدث خطأ: لم يتم التعرف على آيدي الزبون في الذاكرة المؤقتة.");
        }
        
        userStates[uId] = null; 
        return true; 
    }
    
    // 2. استقبال آيدي اللعبة من الزبون عند الشراء ورسم زر التأكيد
    if (state.action === 'await_game_id' && ctx.message.text) { 
        userStates[uId] = { ...state, action: 'confirmed', gameId: ctx.message.text }; 
        
        return ctx.reply(
            `🎯 **تأكيد طلب الشحن:**\n\n🆔 آيدي حسابك: \`${ctx.message.text}\`\n🎁 المنتج: *${state.item}*\n💵 السعر: *${state.price}$*`, 
            { 
                parse_mode: 'Markdown', 
                ...Markup.inlineKeyboard([[Markup.button.callback("✔️ تأكيد ودفع فوراً", "confirm_order")]]) 
            }
        ); 
    }
    
    return false;
}

module.exports = { handleCodeAndOrders };
