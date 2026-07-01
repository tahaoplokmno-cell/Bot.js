const { Telegraf, Markup } = require('telegraf'); const fs = require('fs');
const config = require('./config'); const menus = require('./menus');
const shop = require('./shop'); const charge = require('./charge');
const devBot = require('./dev_bot'); const admin = require('./admin');
const adminActions = require('./admin_actions'); const callbacks = require('./callbacks');
const settings = require('./settings');

const bot = new Telegraf(config.BOT_TOKEN); const DB_FILE = './database.json';
let db = { users: {}, exchange_rate: 14500, banned: {} };
if (fs.existsSync(DB_FILE)) { try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e){} }
const saveDB = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 4)); let userStates = {};

bot.command('admin', ctx => { userStates[String(ctx.chat.id)] = { action: 'await_password' }; ctx.reply("🔐 اكتب كلمة السر الملكية للتحقق:"); });
bot.command('panel', ctx => {
    const uId = String(ctx.chat.id); if (userStates[uId]?.action === 'admin_dashboard' || uId === "8243108672") {
        const p = admin.getAdminPanel(db); return ctx.reply(p.text, { parse_mode: 'Markdown', ...p.markup });
    }
    ctx.reply("❌ ليس لديك صلاحية أدمن.");
});
bot.start(async (ctx) => {
    const uId = String(ctx.chat.id); if (!db.users) db.users = {};
    if (!db.users[uId]) { db.users[uId] = { name: ctx.from.first_name, balance_usd: 0.0 }; saveDB(); }
    const rate = db.exchange_rate || 14500; const usd = db.users[uId].balance_usd || 0;
    let welcome = `👑 **بوت شام إن جيم | SHAM IN GAME** 👑\n━━━━━━━━━━━━━━━━━━━━\n👤 **مرحباً بك يا:** ${ctx.from.first_name || "زبوننا الغالي"}\n\n💰 **رصيد محفظتك الحالي:**\n💵 بالدولار: *${usd.toFixed(2)}$*\n🇸🇾 بالليرة السورية: *${(usd * rate).toLocaleString()} ل.س*\n\n📈 **سعر الصرف اليوم:** 1$ = *${rate.toLocaleString()} ل.س*\n━━━━━━━━━━━━━━━━━━━━\n⚠️ **تنويه هـام للزبائن الكرام:**\nقد يستغرق معالجة وتسليم طلبك بعض الوقت، وخاصةً في أوقات الليل، وذلك لأنني الأدمن الوحيد الذي يقوم بمراجعة وشحن الحسابات يدوياً لضمان أمانكم. شكراً لتفهمكم وصبركم معنا! ❤️`;
    await ctx.reply(welcome, { parse_mode: 'Markdown', ...menus.mainMenu });
});

bot.hears('🏪 المتجر', ctx => ctx.reply("🛍️ اختر القسم المتاح للبدء والشراء:", menus.storeMenu));
bot.hears('💳 المحفظة', ctx => charge.initCharge(ctx, userStates, String(ctx.chat.id), db));
bot.hears('🤖 إنشاء بوت', ctx => devBot.initBotOrder(ctx, userStates, String(ctx.chat.id)));
bot.hears('⚙️ الإعدادات', ctx => settings.showSettings(ctx));
bot.hears('📞 الدعم الفني', ctx => settings.showSupport(ctx));
bot.hears('⚖️ استرجاع الأموال', ctx => settings.showRefundPolicy(ctx));

bot.on(['text', 'photo'], async (ctx) => {
    const uId = String(ctx.chat.id); let state = userStates[uId]; if (!state) return;
    if (state.action === 'await_password' && ctx.message.text === config.ADMIN_PASSWORD) { userStates[uId] = { action: 'admin_dashboard' }; return ctx.reply("✅ تم التحقق! اكتب الآن الأمر /panel لفتح لوحة التحكم."); }
    if (state.action === 'await_new_notes') { admin.saveNotes(ctx, ctx.message.text); userStates[uId] = { action: 'admin_dashboard' }; const p = admin.getAdminPanel(db); return ctx.reply(p.text, { parse_mode: 'Markdown', ...p.markup }); }
    if (state.action === 'await_new_rate') { const r = parseFloat(ctx.message.text); if(!isNaN(r)){ db.exchange_rate = r; saveDB(); ctx.reply(`✅ تم تعديل سعر الصرف إلى ${r} ل.س`); } userStates[uId] = { action: 'admin_dashboard' }; return; }
    if (state.action.startsWith('await_charge') || state.action === 'await_proof') return charge.handleChargeSteps(ctx, state, uId, userStates, db);
    if (state.action === 'await_bot_desc' && ctx.message.text) return devBot.askServer(ctx, ctx.message.text, uId, userStates);
    if (state.action === 'admin_send_code_now' && ctx.message.text) { ctx.telegram.sendMessage(state.clientUId, `🎁 **وصلك كود الشحن الخاص بطلبك بنجاح:**\n\n\`${ctx.message.text}\`\n\n━━━━━━━━━━━━━━━━━━━━\n🚀 **رابط استرداد الأكواد الفوري للببجي والألعاب:**\n1️⃣ يرجى الدخول مباشرة للموقع الرسمي: [midasbuy.com](https://midasbuy.com)\n2️⃣ قم باختيار لعبتك المحددة، ثم ضع آيدي حسابك والكود الرقمي المستلم لتفعيله فورا.\n3️⃣ **ملاحظة هامة جداً:** يجب عليك تشغيل تطبيق الـ VPN إذا كنت متواجداً داخل سوريا لكي يفتح معك الموقع بنجاح!`); ctx.reply("✅ تم إرسال الكود ورابط الاسترداد للزبون بنجاح وتغليق الطلب."); userStates[uId] = null; return; }
    if (state.action === 'await_game_id' && ctx.message.text) { userStates[uId] = { ...state, action: 'confirmed', gameId: ctx.message.text }; return ctx.reply(`🎯 **تأكيد طلب الشحن:**\n\n🆔 آيدي حسابك: \`${ctx.message.text}\`\n🎁 المنتج: *${state.item}*\n💵 السعر: *${state.price}$*`, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback("✔️ تأكيد ودفع فوراً", "confirm_order")]]) }); }
});
bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data; const uId = String(ctx.from.id); await ctx.answerCbQuery().catch(()=>{});
    if (await callbacks.handleStoreDecisions(ctx, bot, db, userStates, saveDB, uId)) return;
    if (data.startsWith("adm#")) return adminActions.handleAdminCallback(ctx, data, uId, userStates, db);
    if (data.startsWith("ch#")) return charge.askAmount(ctx, data, uId, userStates);
    if (data.startsWith("srv#")) return devBot.handleServerChoice(ctx, data, uId, userStates);
    if (data === "confirm_order") {
        const state = userStates[uId]; if (!state) return ctx.reply("❌ لا يوجد طلب نشط.");
        let uBal = db.users[uId]?.balance_usd || 0; let rate = db.exchange_rate || 14500;
        let chanBtn = Markup.inlineKeyboard([[Markup.button.callback("✅ قبول وتفعيل الكود", `order_dec#accept#${uId}#${state.price}`)], [Markup.button.callback("❌ رفض وإلغاء", `order_dec#reject#${uId}`)]]);
        await ctx.telegram.sendMessage(config.ADMIN_CHANNEL_ID, `📥 **طلب شراء جديد قيد الموافقة:**\n━━━━━━━━━━━━━━━━━━━━\n👤 الزبون: ${ctx.from.first_name}\n🆔 آيدي التليجرام: \`${uId}\`\n💰 رصيده الحالي: *$${uBal.toFixed(2)}* (${(uBal * rate).toLocaleString()} ل.س)\n🎯 المنتج: *${state.item}*\n💵 السعر: *${state.price}$*\n🆔 آيدي اللعبة المرسل: \`${state.gameId}\``, { reply_markup: chanBtn.reply_markup, parse_mode: 'Markdown' });
        ctx.reply("🚀 تم إرسال طلب الشراء الخاص بك بنجاح إلى الإدارة! انتظر موافقة المسؤول هنا ليظهر لك الكود."); userStates[uId] = null; return;
    }
    shop.handleStore(ctx, data, uId, db, userStates);
});
bot.launch().then(() => console.log("🚀 SHAM SYSTEM RUNNING PERFECTLY!"));
