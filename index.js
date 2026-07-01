const telegrafMod = require('telegraf');
const Telegraf = telegrafMod.Telegraf;
const fs = require('fs');
const config = require('./config');
const menus = require('./menus');
const admin = require('./admin');
const actions = require('./actions');
const callbacks = require('./callbacks'); 
const shop = require('./shop'); // استدعاء ملف المتجر القصير الجديد

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
    let welcome = `👑 **بوت شام إن جيم** 👑\n👤 **مرحباً بك:** ${ctx.from.first_name}\n💰 **رصيدك:** $${usd.toFixed(2)} (${(usd * rate).toLocaleString()} ل.س)`;
    await ctx.reply(welcome, { parse_mode: 'Markdown', ...menus.mainMenu });
});

bot.hears('🏪 المتجر', ctx => ctx.reply("🛍️ اختر القسم المتاح للبدء والشراء:", menus.storeMenu));
bot.hears('💳 المحفظة', ctx => {
    const uId = String(ctx.chat.id); const rate = db.exchange_rate || 15000; const usd = db.users[uId]?.balance_usd || 0;
    ctx.reply(`💳 رصيدك الحالي: ${usd.toFixed(2)}$ (${(usd * rate).toLocaleString()} ل.س)`, menus.walletMenu);
});
bot.hears('⚙️ الإعدادات', ctx => ctx.reply(`⚙️ الاسم: ${ctx.from.first_name}\n🆔 الآيدي: \`${ctx.chat.id}\``, { parse_mode: 'Markdown' }));
bot.hears('📞 الدعم الفني', ctx => ctx.reply(`📞 الدعم الفني: ${config.DEVELOPER_USERNAME}`));

bot.on(['text', 'photo'], async (ctx) => {
    let state = userStates[String(ctx.chat.id)];
    if (state && state.action === 'await_bot_desc' && ctx.message.text) { await ctx.telegram.sendMessage(config.ADMIN_CHANNEL_ID, `🤖 **طلب بوت:** ${ctx.message.text}`); ctx.reply("🚀 تم الإرسال."); userStates[String(ctx.chat.id)] = null; }
});

bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data; const uId = String(ctx.from.id); await ctx.answerCbQuery().catch(()=>{});
    if (await callbacks.handleStoreDecisions(ctx, bot, db, userStates, saveDB, uId)) return;
    if (await actions.handleCallbacks(ctx, bot, db, userStates, saveDB)) return;
    
    // استدعاء ملف shop المصلح والقصير جداً
    shop.handleStore(ctx, data, uId, db, userStates);
});

bot.launch().then(() => console.log("🚀 BOT IS RUNNING!"));

