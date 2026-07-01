// index.js - النسخة البرمجية المطابقة لملفات الجيت هب 100%
const { Telegraf, Markup } = require('telegraf'); 
const config = require('./config'); 
const menus = require('./menus'); 
const shop = require('./shop'); 
const charge = require('./charge'); 
const devBot = require('./dev_bot'); 
const admin = require('./admin');
const adminActions = require('./admin_actions'); 
const callbacks = require('./callbacks'); 
const settings = require('./settings'); 
const dbFile = require('./database');
const textHandler = require('./admin_text_handler'); // مطابقة لاسم ملفك الفرعي بالنصوص

const bot = new Telegraf(config.BOT_TOKEN); 
let db = dbFile.loadDB(); 
const saveDB = () => dbFile.saveDB(db); 
let userStates = {};

// ================= الأوامر الأساسية =================
bot.command('admin', ctx => { userStates[String(ctx.chat.id)] = { action: 'await_password' }; ctx.reply("🔐 اكتب كلمة السر الملكية للتحقق:"); });
bot.command('panel', ctx => {
    const uId = String(ctx.chat.id); 
    if (userStates[uId]?.action === 'admin_dashboard' || uId === "8243108672") {
        const p = admin.getAdminPanel(db); return ctx.reply(p.text, { parse_mode: 'Markdown', ...p.markup });
    }
    ctx.reply("❌ ليس لديك صلاحية أدمن.");
});

bot.start(async (ctx) => {
    const uId = String(ctx.chat.id); if (!db.users) db.users = {}; 
    if (db.banned && db.banned[uId]) return ctx.reply("🚫 أنت محظور من السيستم.");
    if (!db.users[uId]) { db.users[uId] = { name: ctx.from.first_name, balance_usd: 0.0 }; saveDB(); }
    const rate = db.exchange_rate || 14500; const usd = db.users[uId].balance_usd || 0;
    let welcome = `👑 **بوت شام إن جيم | SHAM IN GAME** 👑\n━━━━━━━━━━━━━━━━━━━━\n👤 **مرحباً بك:** ${ctx.from.first_name}\n💰 **رصيدك الحالي:**\n💵 بالدولار: *${usd.toFixed(2)}$*\n🇸🇾 بالليرة السورية: *${(usd * rate).toLocaleString()} ل.س*\n📈 **سعر الصرف اليوم:** 1$ = *${rate.toLocaleString()} ل.س*`;
    await ctx.reply(welcome, { parse_mode: 'Markdown', ...menus.mainMenu });
});

// ================= أزرار الكيبورد الرئيسية =================
bot.hears('🏪 المتجر', ctx => ctx.reply("🛍️ اختر القسم المتاح للبدء والشراء:", menus.storeMenu));
bot.hears('💳 المحفظة', ctx => charge.initCharge(ctx, userStates, String(ctx.chat.id), db));
bot.hears('🤖 إنشاء بوت', ctx => devBot.initBotOrder(ctx, userStates, String(ctx.chat.id)));
bot.hears('⚙️ الإعدادات', ctx => settings.showSettings(ctx)); 
bot.hears('📞 الدعم الفني', ctx => settings.showSupport(ctx)); 
bot.hears('⚖️ استرجاع الأموال', ctx => {
    userStates[String(ctx.chat.id)] = { action: 'await_refund_amount' };
    ctx.reply("💰 **قسم طلب استرجاع الأموال:**\n✍️ يرجى كتابة المبلغ ورقم حسابك:");
});

// ================= مستمع النصوص العام الفرعي =================
bot.on(['text', 'photo'], async (ctx) => {
    const uId = String(ctx.chat.id); let state = userStates[uId]; if (!state) return;
    await textHandler.handleUserTexts(ctx, bot, db, userStates, saveDB, uId, state);
});

// ================= مستمع ضغطات الأزرار (Callbacks) =================
bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data; const uId = String(ctx.from.id); await ctx.answerCbQuery().catch(()=>{});
    
    if (data === "main_menu") { return ctx.reply("👑 تم العودة للقائمة الرئيسية للبوت:", menus.mainMenu); }
    
    // 🟢 استدعاء آمن لمعالجة شحن الفلوس وقبول وخصم طلبات ببجي
    if (callbacks && typeof callbacks.handleStoreDecisions === 'function') {
        if (await callbacks.handleStoreDecisions(ctx, bot, db, userStates, saveDB, uId)) return;
    }
    
    if (data.startsWith("adm#")) return adminActions.handleAdminCallback(ctx, data, uId, userStates, db);
    if (data.startsWith("ch#")) return charge.askAmount(ctx, data, uId, userStates);
    if (data.startsWith("srv#")) return devBot.handleServerChoice(ctx, data, uId, userStates);
    
    shop.handleStore(ctx, data, uId, db, userStates);
});

bot.launch().then(() => console.log("🚀 SHAM IN GAME BOT IS LIVE & 100% WORKING!"));
