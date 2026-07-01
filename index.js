const telegrafMod = require('telegraf');
const Telegraf = telegrafMod.Telegraf;
const Markup = telegrafMod.Markup;
const fs = require('fs');
const config = require('./config');
const menus = require('./menus');
const admin = require('./admin');
const custom = require('./custom_items');
const actions = require('./actions');
const callbacks = require('./callbacks'); // استدعاء ملف القبول والرفض من القناة

const bot = new Telegraf(config.BOT_TOKEN);
const DB_FILE = './database.json';
let db = { users: {}, exchange_rate: 15000, banned: {}, muted: {} };
if (fs.existsSync(DB_FILE)) { try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e){} }
if (!db.banned) db.banned = {}; if (!db.muted) db.muted = {};

function saveDB() { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 4)); }
let userStates = {};

bot.use((ctx, next) => {
    const uId = String(ctx.from?.id); if (!uId) return next();
    if (db.banned[uId]) return ctx.reply("🚫 نعتذر منك، أنت محظور نهائياً.");
    if (db.muted[uId] && ctx.message) return ctx.reply("🔇 حسابك مكتوم حالياً.");
    return next();
});

bot.command('admin', ctx => { userStates[String(ctx.chat.id)] = { action: 'await_password' }; ctx.reply("🔐 اكتب كلمة السر الملكية للتحقق:"); });
bot.command('panel', ctx => {
    const uId = String(ctx.chat.id);
    if (userStates[uId]?.action === 'admin_dashboard' || uId === "8243108672") {
        const panelData = admin.getAdminPanel(db); return ctx.reply(panelData.text, { parse_mode: 'Markdown', ...panelData.markup });
    }
    ctx.reply("❌ ليس لديك صلاحية أدمن.");
});

bot.start(async (ctx) => {
    const uId = String(ctx.chat.id); if (!db.users) db.users = {};
    if (!db.users[uId]) { db.users[uId] = { name: ctx.from.first_name, balance_usd: 5.0 }; saveDB(); }
    const rate = db.exchange_rate || 15000; const usd = db.users[uId].balance_usd || 0;
    let welcome = `👑 **بوت شام إن جيم | SHAM IN GAME** 👑\n━━━━━━━━━━━━━━━━━━━━\n👤 **مرحباً بك يا:** ${ctx.from.first_name || "زبوننا الغالي"}\n\n💰 **رصيد محفظتك الحالي:**\n💵 بالدولار: *${usd.toFixed(2)}$*\n🇸🇾 بالليرة السورية: *${(usd * rate).toLocaleString()} ل.س*\n\n📈 **سعر الصرف المعتمد اليوم:**\n1$ = *${rate.toLocaleString()} ل.س*\n━━━━━━━━━━━━━━━━━━━━\n⚠️ **تنويه هـام للزبائن الكرام:**\nقد يستغرق معالجة وتسليم طلبك بعض الوقت، وخاصةً في أوقات الليل، وذلك لأنني الأدمن الوحيد الذي يقوم بمراجعة وشحن الحسابات يدوياً لضمان أمانكم. شكراً لتفهمكم وصبركم معنا! ❤️`;
    await ctx.reply(welcome, { parse_mode: 'Markdown', ...menus.mainMenu });
});

bot.hears('🏪 المتجر', ctx => ctx.reply("🛍️ اختر القسم المتاح للبدء والشراء:", menus.storeMenu));
bot.hears('💳 المحفظة', ctx => {
    const uId = String(ctx.chat.id); const rate = db.exchange_rate || 15000; const usd = db.users[uId]?.balance_usd || 0;
    ctx.reply(`💳 **مركز التحكم بالمحفظة:**\n💵 رصيدك الحالي: ${usd.toFixed(2)}$ (${(usd * rate).toLocaleString()} ل.س)`, menus.walletMenu);
});
bot.hears('⚙️ الإعدادات', ctx => ctx.reply(`⚙️ الاسم: ${ctx.from.first_name}\n🆔 الآيدي الخاص بك: \`${ctx.chat.id}\``, { parse_mode: 'Markdown' }));
bot.hears('📞 الدعم الفني', ctx => ctx.reply(`📞 للتواصل المباشر مع الدعم الفني: ${config.DEVELOPER_USERNAME}`));

bot.on(['text', 'photo'], async (ctx) => {
    let state = userStates[String(ctx.chat.id)]; const rate = db.exchange_rate || 15000;
    if (state && (state.action === 'await_proof' || state.action === 'await_game_id' || state.action === 'await_bot_desc')) {
        if (state.action === 'await_proof') {
            ctx.reply("✅ تم إرسال طلب الشحن وإثباتك للإدارة بنجاح. انتظر التفعيل!");
            let cap = `🏦 **طلب إيداع شحن رصيد جديد:**\n🆔 آيدي العميل: \`${ctx.chat.id}\`\n💰 المبلغ: ${state.amountStr}\n💵 بالدولار: $${state.usdValue}`;
            let adminButtons = Markup.inlineKeyboard([[Markup.button.callback("✅ قبول الشحن", `pay_approve#${ctx.chat.id}#${state.usdValue}`)], [Markup.button.callback("❌ رفض وإلغاء", `pay_reject#${ctx.chat.id}`)]]);
            if (ctx.message.photo) { await ctx.telegram.sendPhoto(config.ADMIN_CHANNEL_ID, ctx.message.photo.pop().file_id, { caption: cap, reply_markup: adminButtons.reply_markup }); }
            else { await ctx.telegram.sendMessage(config.ADMIN_CHANNEL_ID, cap + `\n📝 النص: ${ctx.message.text}`, { reply_markup: adminButtons.reply_markup }); }
            userStates[String(ctx.chat.id)] = null; return;
        }
        if (state.action === 'await_game_id' && ctx.message.text) {
            userStates[String(ctx.chat.id)] = { ...state, action: 'confirmed', gameId: ctx.message.text };
            let gMsg = `🎯 **مراجعة وتأكيد طلب الشحن:**\n\n🆔 آيدي حسابك في اللعبة: \`${ctx.message.text}\`\n🎁 المنتج المطلوب: *${state.item}*\n\n⚠️ **طريقة الاسترداد الفوري بعد استلام الكود:**\n1️⃣ يجب عليك الدخول للموقع الرسمي الشهير لاسترداد الأكواد: [midasbuy.com](https://midasbuy.com)\n2️⃣ اختر اللعبة التي شحنتها ثم ضع آيدي حسابك والكود المستلم.\n3️⃣ **ملاحظة هامة:** يجب تفعيل الـ VPN إذا كنت متواجداً داخل سوريا لكي يفتح الموقع المعتمد بنجاح!`;
            return ctx.reply(gMsg, { parse_mode: 'Markdown', disable_web_page_preview: true, ...Markup.inlineKeyboard([[Markup.button.callback("🚀 تأكيد وإرسال الطلب", "confirm_order")]]) });
        }
        if (state.action === 'await_bot_desc' && ctx.message.text) { await ctx.telegram.sendMessage(config.ADMIN_CHANNEL_ID, `🤖 **طلب تصميم بوت جديد:**\n👤 العميل: ${ctx.from.first_name}\n📝 المواصفات:\n${ctx.message.text}`); ctx.reply("🚀 تم إرسال مواصفات البوت للمطور بنجاح."); userStates[String(ctx.chat.id)] = null; return; }
    }
});

bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data; const uId = String(ctx.from.id); await ctx.answerCbQuery().catch(()=>{}); const rate = db.exchange_rate || 15000;
    
    // تشغيل نظام القبول والرفض والشحن التلقائي من القناة حياً
    const handledStore = await callbacks.handleStoreDecisions(ctx, bot, db, userStates, saveDB, uId); if (handledStore) return;
    const handled = await actions.handleCallbacks(ctx, bot, db, userStates, saveDB); if (handled) return;

    if (data === "m#games" || data === "m#cards") { const isGame = data === "m#games"; const source = isGame ? custom.MY_CUSTOM_GAMES : custom.MY_CUSTOM_CARDS; let buttons = Object.keys(source).map(g => [Markup.button.callback((isGame ? "🎮 " : "🎟️ ") + g, (isGame ? "vg#" : "vc#") + g)]); return ctx.editMessageText(isGame ? "🎮 **اختر اللعبة المطلوبة لتصفح الفئات:**" : "🎟️ **اختر نوع البطاقات الرقمية المطلوبة:**", Markup.inlineKeyboard(buttons)); }
    if (data === "bot_order#start") { userStates[uId] = { action: 'await_bot_desc' }; return ctx.reply("🤖 **قسم إنشاء وتصميم بوت خاص:**\n\nاكتب الآن نوع البوت والمواصفات التي تريد برمجتها بوضوح في رسالة واحدة ليراجعها المطور:"); }
    
    if (data.startsWith("vg#") || data.startsWith("vc#")) { 
        const isGame = data.startsWith("vg#"); const name = data.split('#')[1]; 
        const list = isGame ? custom.MY_CUSTOM_GAMES[name] : custom.MY_CUSTOM_CARDS[name]; 
        let buttons = list.map(item => { let price = parseFloat(item.split('-')[1]); return [Markup.button.callback(item, "buy#" + (isGame ? "game" : "card") + "#" + name + "#" + item + "#" + price)]; }); 
        return ctx.editMessageText(`🎯 **العروض والأسعار المتوفرة لـ ${name}:**`, Markup.inlineKeyboard(buttons)); 
    }
    if (data.startsWith("buy#")) {
        const parts = data.split('#'); let type = parts[1]; let name = parts[2]; let item = parts[3]; let price = parseFloat(parts[4]); userStates[uId] = { type, name, item, price };
        if (type === "card") { userStates[uId].action = 'confirmed'; return ctx.reply(`🎯 **تأكيد شراء البطاقة:**\nالمنتج: ${item}\nالسعر: ${price}$\n━━━━━━━━━━━━━━━━━━━━\nاضغط على الزر بالأسفل لإتمام الطلب والخصم المالي:`, Markup.inlineKeyboard([[Markup.button.callback("🚀 تأكيد وشراء البطاقة فوراً", "confirm_order")]])); }
        else { userStates[uId].action = 'await_game_id'; return ctx.reply(`✍️ يرجى كتابة رقم **الآيدي (ID)** الخاص بحسابك in لعبة ${name} بدقة للمتابعة:`); }
    }
    if (data === "confirm_order") {
        const state = userStates[uId]; if (!state) return ctx.reply("❌ لا يوجد طلب نشط."); let userBal = db.users[uId]?.balance_usd || 0; if (userBal < state.price) return ctx.reply(`❌ رصيدك الحالي ($${userBal.toFixed(2)}) لا يكفي لشراء هذا المنتج! يرجى شحن محفظتك أولاً.`);
        let adminMsg = `📥 **طلب شراء جديد قيد الانتظار:**\n\n👤 العميل: ${ctx.from.first_name}\n🆔 آيدي التليجرام: \`${uId}\`\n🏦 رصيد محفظة الزبون: $${userBal.toFixed(2)}\n🎯 الخدمة المطلوبة: *${state.item}*\n💵 سعر المنتج: *${state.price}$*\n🆔 آيدي اللاعب (إن وجد): \`${state.gameId || 'طلب بطاقة رقمية'}\``;
        let adminButtons = Markup.inlineKeyboard([[Markup.button.callback("✅ قبول الطلب وتسليم الكود", `order_dec#accept#${uId}#${state.price}#${state.item}`)], [Markup.button.callback("❌ رفض وإلغاء الطلب بالكامل", `order_dec#reject#${uId}#${state.price}#${state.item}`)]]);
        await ctx.telegram.sendMessage(config.ADMIN_CHANNEL_ID, adminMsg, { reply_markup: adminButtons.reply_markup, parse_mode: 'Markdown' }); ctx.reply("🚀 تم إرسال طلب الشراء الخاص بك بنجاح تامي إلى الإدارة للمراجعة. سيتم تسليم الكود لك هنا فور موافقة المسؤول!"); userStates[uId] = null;
    }
    if (data === "ch#usd" || data === "ch#syr") { return ctx.editMessageText(data === "ch#usd" ? "💵 اختر المبلغ الذي تريد شحنه بالدولار:" : "🇸🇾 اختر الفئة التي قمت بتحويلها بالليرة السورية:", data === "ch#usd" ? menus.chargeValuesMenu : menus.chargeSyrMenu); }
