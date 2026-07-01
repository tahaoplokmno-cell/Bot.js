// index.js (الملف الرئيسي المخلص)
const { Telegraf, Markup } = require('telegraf'); 
const config = require('./config'); const menus = require('./menus'); 
const shop = require('./shop'); const charge = require('./charge'); 
const devBot = require('./dev_bot'); const admin = require('./admin');
const adminActions = require('./admin_actions'); const callbacks = require('./callbacks'); 
const settings = require('./settings'); const dbFile = require('./database');

// استدعاء الملفات الجديدة التابعة للتقسيم
const orderHandler = require('./order_handler');
const textHandler = require('./text_handler');

const bot = new Telegraf(config.BOT_TOKEN); 
let db = dbFile.loadDB(); const saveDB = () => dbFile.saveDB(db); 
let userStates = {};

if (callbacks && typeof callbacks.init === 'function') callbacks.init(bot, db, userStates);
if (adminActions && typeof adminActions.init === 'function') adminActions.init(bot, db, userStates);
if (devBot && typeof devBot.init === 'function') devBot.init(bot, db, userStates);

bot.command('admin', ctx => { userStates[String(ctx.chat.id)] = { action: 'await_password' }; ctx.reply("🔐 اكتب كلمة السر الملكية:"); });
bot.command('panel', ctx => {
    const uId = String(ctx.chat.id); 
    if (userStates[uId]?.action === 'admin_dashboard' || uId === "8243108672") {
        const p = admin.getAdminPanel(db); return ctx.reply(p.text, { parse_mode: 'Markdown', ...p.markup });
    }
    ctx.reply("❌ ليس لديك صلاحية أدمن.");
});

bot.start(async (ctx) => {
    const uId = String(ctx.chat.id); if (!db.users) db.users = {}; 
    if (db.banned && db.banned[uId]) return ctx.reply("🚫 أنت محظور.");
    if (!db.users[uId]) { db.users[uId] = { name: ctx.from.first_name, balance_usd: 0.0 }; saveDB(); }
    const rate = db.exchange_rate || 14500; const usd = db.users[uId].balance_usd || 0;
    let welcome = `👑 **بوت شام إن جيم** 👑\n👤 **مرحباً بك:** ${ctx.from.first_name}\n💰 **رصيدك:** $${usd.toFixed(2)} (${(usd * rate).toLocaleString()} ل.س)`;
    await ctx.reply(welcome, { parse_mode: 'Markdown', ...menus.mainMenu });
});

bot.hears('🏪 المتجر', ctx => ctx.reply("🛍️ اختر القسم:", menus.storeMenu));
bot.hears('💳 المحفظة', ctx => charge.initCharge(ctx, userStates, String(ctx.chat.id), db));
bot.hears('🤖 إنشاء بوت', ctx => devBot.initBotOrder(ctx, userStates, String(ctx.chat.id)));
bot.hears('⚙️ الإعدادات', ctx => settings.showSettings(ctx)); 
bot.hears('📞 الدعم الفني', ctx => settings.showSupport(ctx)); 
bot.hears('⚖️ استرجاع الأموال', ctx => {
    userStates[String(ctx.chat.id)] = { action: 'await_refund_amount' };
    ctx.reply("💰 **قسم طلب استرجاع الأموال:**\n✍️ يرجى كتابة المبلغ ورقم حسابك:");
});

bot.on(['text', 'photo'], async (ctx) => {
    const uId = String(ctx.chat.id); let state = userStates[uId]; if (!state) return;
    // تحويل معالجة النصوص للملف الفرعي المخصص
    await textHandler.handleAllTexts(bot, ctx, uId, state, userStates, db, saveDB, config, charge, devBot);
});

bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data; const uId = String(ctx.from.id); await ctx.answerCbQuery().catch(()=>{});
    if (data === "main_menu") { return ctx.reply("👑 تم العودة للقائمة الرئيسية للبوت:", menus.mainMenu); }

    // تحويل أزرار القبول والرفض للملف الفرعي الجديد
    if (orderHandler.handleOrderCallbacks(bot, ctx, data, uId, userStates, saveDB, db, config)) return;
    
    if (await callbacks.handleStoreDecisions(ctx, bot, db, userStates, saveDB, uId)) return;
    if (data.startsWith("adm#")) return adminActions.handleAdminCallback(ctx, data, uId, userStates, db);
    if (data.startsWith("ch#")) return charge.askAmount(ctx, data, uId, userStates);
    if (data.startsWith("srv#")) return devBot.handleServerChoice(ctx, data, uId, userStates);
    
    if (data === "confirm_order") {
        const state = userStates[uId]; if (!state) return ctx.reply("❌ لا يوجد طلب نشط.");
        let uBal = db.users[uId]?.balance_usd || 0; let rate = db.exchange_rate || 14500;
        if(uBal < state.price) return ctx.reply("❌ رصيدك غير كافٍ!");
        let chanBtn = Markup.inlineKeyboard([[Markup.button.callback("✅ قبول وتفعيل", `order_dec#accept#${uId}#${state.price}`)], [Markup.button.callback("❌ رفض", `order_dec#reject#${uId}`)]]);
        await bot.telegram.sendMessage(config.ADMIN_CHANNEL_ID, `📥 **طلب جديد:**\n👤 الزبون: ${ctx.from.first_name}\n🎯 المنتج: *${state.item}*\n💵 السعر: *${state.price}$*`, { reply_markup: chanBtn.reply_markup, parse_mode: 'Markdown' }).catch(console.error);
        ctx.reply("🚀 تم إرسال الطلب للإدارة بنجاح!"); userStates[uId] = null; return;
    }
    shop.handleStore(ctx, data, uId, db, userStates);
});

bot.launch().then(() => console.log("🚀 BOT MAIN FILE IS CLEAN & RUNNING!"));
