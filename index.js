const { Telegraf } = require('telegraf'); 
const config = require('./config'); const menus = require('./menus'); const charge = require('./charge'); 
const devBot = require('./dev_bot'); const admin = require('./admin'); const settings = require('./settings'); const dbFile = require('./database');

// استدعاء المقسمات الأربعة الجديدة للتحكم السلس
const adminText = require('./admin_text_handler');
const userText = require('./user_text_handler');
const codeOrder = require('./code_order_handler');
const callbackHandler = require('./callback_handler');

const bot = new Telegraf(config.BOT_TOKEN); let db = dbFile.loadDB();
const saveDB = () => dbFile.saveDB(db); let userStates = {};

bot.command('admin', ctx => { userStates[String(ctx.chat.id)] = { action: 'await_password' }; ctx.reply("🔐 اكتب كلمة السر الملكية للتحقق:"); });
bot.command('panel', ctx => {
    const uId = String(ctx.chat.id); if (userStates[uId]?.action === 'admin_dashboard' || uId === "8243108672") { const p = admin.getAdminPanel(db); return ctx.reply(p.text, { parse_mode: 'Markdown', ...p.markup }); }
    ctx.reply("❌ ليس لديك صلاحية أدمن.");
});
bot.start(async (ctx) => {
    const uId = String(ctx.chat.id); if (!db.users) db.users = {}; if (db.banned && db.banned[uId]) return ctx.reply("🚫 أنت محظور من السيستم.");
    if (!db.users[uId]) { db.users[uId] = { name: ctx.from.first_name, balance_usd: 0.0 }; saveDB(); }
    const rate = db.exchange_rate || 14500; const usd = db.users[uId].balance_usd || 0;
    let welcome = `👑 **بوت شام إن جيم | SHAM IN GAME** 👑\n━━━━━━━━━━━━━━━━━━━━\n👤 **مرحباً بك:** ${ctx.from.first_name}\n💰 **رصيدك الحالي:**\n💵 بالدولار: *${usd.toFixed(2)}$*\n🇸🇾 بالليرة السورية: *${(usd * rate).toLocaleString()} ل.س*\n📈 **سعر الصرف اليوم:** 1$ = *${rate.toLocaleString()} ل.س*\n━━━━━━━━━━━━━━━━━━━━\n⚠️ **تنويه هـام:** قد يستغرق تسليم طلبك بعض الوقت ليلاً لأنني الأدمن الوحيد الذي يشحن يدوياً لضمان أمانكم! ❤️`;
    await ctx.reply(welcome, { parse_mode: 'Markdown', ...menus.mainMenu });
});

bot.hears('🏪 المتجر', ctx => ctx.reply("🛍️ اختر القسم المتاح للبدء والشراء:", menus.storeMenu));
bot.hears('💳 المحفظة', ctx => charge.initCharge(ctx, userStates, String(ctx.chat.id), db));
bot.hears('🤖 إنشاء بوت', ctx => devBot.initBotOrder(ctx, userStates, String(ctx.chat.id)));
bot.hears('⚙️ الإعدادات', ctx => settings.showSettings(ctx)); bot.hears('📞 الدعم الفني', ctx => settings.showSupport(ctx)); 
bot.hears('⚖️ استرجاع الأموال', ctx => { userStates[String(ctx.chat.id)] = { action: 'await_refund_amount' }; ctx.reply("💰 **قسم طلب استرجاع الأموال:**\n━━━━━━━━━━━━━━━━━━━━\n✍️ يرجى كتابة المبلغ الذي تريد استرجاعه ورقم حسابك لتحويل المستحقات:"); });

bot.on(['text', 'photo'], async (ctx) => {
    const uId = String(ctx.chat.id); let state = userStates[uId]; if (!state) return;
    if (state.action.startsWith('await_charge') || state.action === 'await_proof') return charge.handleChargeSteps(ctx, state, uId, userStates, db);
    
    // تقسيم معالجة النصوص على 3 ملفات صغيرة جداً
    if (await codeOrder.handleCodeAndOrders(ctx, bot, userStates, uId, state)) return;
    await adminText.handleAdminTexts(ctx, bot, db, userStates, saveDB, uId, state);
    await userText.handleUserTexts(ctx, bot, db, userStates, saveDB, uId, state);
});

bot.on('callback_query', ctx => callbackHandler.handleAllCallbacks(ctx, bot, db, userStates, saveDB));
bot.launch().then(() => console.log("🚀 ALL FUNCTIONS INTERCONNECTED 100% SUCCESSFULLY!"));
