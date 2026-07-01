const telegrafMod = require('telegraf');
const Markup = telegrafMod.Markup;
const custom = require('./custom_items');
const menus = require('./menus');
const config = require('./config');

function handleStore(ctx, data, uId, db, userStates) {
    if (data === "m#games" || data === "m#cards") { 
        const isGame = data === "m#games"; const source = isGame ? custom.MY_CUSTOM_GAMES : custom.MY_CUSTOM_CARDS; 
        let buttons = Object.keys(source).map(g => [Markup.button.callback((isGame ? "🎮 " : "🎟️ ") + g, (isGame ? "vg#" : "vc#") + g)]); 
        return ctx.editMessageText(isGame ? "🎮 **اختر اللعبة المطلوبة لتصفح الفئات:**" : "🎟️ **اختر نوع البطاقات الرقمية:**", Markup.inlineKeyboard(buttons)); 
    }
    if (data === "bot_order#start") { userStates[uId] = { action: 'await_bot_desc' }; return ctx.reply("🤖 اكتب مواصفات البوت بوضوح في رسالة واحدة:"); }
    if (data.startsWith("vg#") || data.startsWith("vc#")) { 
        const isGame = data.startsWith("vg#"); const name = data.split('#')[1]; const list = isGame ? custom.MY_CUSTOM_GAMES[name] : custom.MY_CUSTOM_CARDS[name]; 
        let buttons = list.map(item => { let pr = parseFloat(item.split('-')[1]); return [Markup.button.callback(item, "buy#" + (isGame ? "game" : "card") + "#" + name + "#" + item + "#" + pr)]; }); 
        return ctx.editMessageText(`🎯 **العروض المتاحة لـ ${name}:**`, Markup.inlineKeyboard(buttons)); 
    }
    if (data.startsWith("buy#")) {
        const parts = data.split('#'); let type = parts[1]; let name = parts[2]; let item = parts[3]; let price = parseFloat(parts[4]); userStates[uId] = { type, name, item, price };
        if (type === "card") { userStates[uId].action = 'confirmed'; return ctx.reply(`🎯 **تأكيد شراء البطاقة:**\nالمنتج: ${item}\nالسعر: ${price}$`, Markup.inlineKeyboard([[Markup.button.callback("🚀 تأكيد وشراء فوراً", "confirm_order")]])); }
        else { userStates[uId].action = 'await_game_id'; return ctx.reply(`✍️ يرجى كتابة رقم **الآيدي (ID)** للعبة ${name}:`); }
    }
    if (data === "confirm_order") {
        const state = userStates[uId]; if (!state) return ctx.reply("❌ لا يوجد طلب نشط."); let userBal = db.users[uId]?.balance_usd || 0; if (userBal < state.price) return ctx.reply(`❌ رصيدك ($${userBal.toFixed(2)}) لا يكفي!`);
        let adminMsg = `📥 **طلب جديد:**\n👤 العميل: ${ctx.from.first_name}\n🎯 الخدمة: ${state.item}\n💵 السعر: ${state.price}$\n🆔 الآيدي: \`${state.gameId || 'بطاقة رقمية'}\``;
        let adminButtons = Markup.inlineKeyboard([[Markup.button.callback("✅ قبول", `order_dec#accept#${uId}#${state.price}#${state.item}`)], [Markup.button.callback("❌ رفض", `order_dec#reject#${uId}#${state.price}#${state.item}`)]]);
        ctx.telegram.sendMessage(config.ADMIN_CHANNEL_ID, adminMsg, { reply_markup: adminButtons.reply_markup, parse_mode: 'Markdown' }); ctx.reply("🚀 تم إرسال طلبك للإدارة، انتظر الكود هنا!"); userStates[uId] = null;
    }
    if (data === "ch#usd" || data === "ch#syr") { return ctx.editMessageText(data === "ch#usd" ? "💵 اختر المبلغ بالدولار:" : "🇸🇾 اختر الفئة بالليرة السورية:", data === "ch#usd" ? menus.chargeValuesMenu : menus.chargeSyrMenu); }
}

module.exports = { handleStore };

