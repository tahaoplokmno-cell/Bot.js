const { Telegraf, Markup } = require('telegraf'); const fs = require('fs');
const config = require('./config'); const menus = require('./menus'); const shop = require('./shop');
const charge = require('./charge'); const devBot = require('./dev_bot'); const admin = require('./admin');
const adminActions = require('./admin_actions'); const callbacks = require('./callbacks'); const settings = require('./settings');
const dbFile = require('./database');

const bot = new Telegraf(config.BOT_TOKEN); let db = dbFile.loadDB();
const saveDB = () => dbFile.saveDB(db); let userStates = {};

bot.command('admin', ctx => { userStates[String(ctx.chat.id)] = { action: 'await_password' }; ctx.reply("🔐 اكتب كلمة السر الملكية للتحقق:"); });
bot.command('panel', ctx => {
    const uId = String(ctx.chat.id); if (userStates[uId]?.action === 'admin_dashboard' || uId === "8243108672") {
        const p = admin.getAdminPanel(db); return ctx.reply(p.text, { parse_mode: 'Markdown', ...p.markup });
    }
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
bot.hears('⚙️ الإعدادات', ctx => settings.showSettings(ctx)); bot.hears('📞 الدعم الفني', ctx => settings.showSupport(ctx)); bot.hears('⚖️ استرجاع الأموال', ctx => settings.showRefundPolicy(ctx));

bot.on(['text', 'photo'], async (ctx) => {
    const uId = String(ctx.chat.id); let state = userStates[uId]; if (!state) return;
    if (state.action === 'await_password' && ctx.message.text === config.ADMIN_PASSWORD) { userStates[uId] = { action: 'admin_dashboard' }; return ctx.reply("✅ تم التحقق! اكتب الآن الأمر /panel لفتح لوحة التحكم."); }
    if (state.action === 'await_new_notes') { admin.saveNotes(ctx, ctx.message.text); userStates[uId] = { action: 'admin_dashboard' }; const p = admin.getAdminPanel(db); return ctx.reply(p.text, { parse_mode: 'Markdown', ...p.markup }); }
    if (state.action === 'await_new_rate') { const r = parseFloat(ctx.message.text); if(!isNaN(r)){ db.exchange_rate = r; saveDB(); ctx.reply(`✅ تم تعديل الصرف إلى ${r} ل.س`); } userStates[uId] = { action: 'admin_dashboard' }; return; }
    if (state.action === 'await_broadcast_txt') { ctx.reply("📢 جاري إرسال البرودكاست لجميع الزبائن..."); Object.keys(db.users || {}).forEach(id => bot.telegram.sendMessage(id, `📢 **رسالة عامة من الإدارة:**\n\n${ctx.message.text}`).catch(()=>{})); userStates[uId] = { action: 'admin_dashboard' }; return; }
    if (state.action === 'await_ban_uid') { if(!db.banned) db.banned = {}; db.banned[ctx.message.text] = true; saveDB(); ctx.reply("✅ تم حظر الحساب بنجاح."); userStates[uId] = { action: 'admin_dashboard' }; return; }
    if (state.action === 'await_unban_uid') { if(db.banned) delete db.banned[ctx.message.text]; saveDB(); ctx.reply("✅ تم إلغاء حظر الحساب."); userStates[uId] = { action: 'admin_dashboard' }; return; }
    if (state.action === 'await_gift_uid') { userStates[uId] = { action: 'await_gift_amount', targetUid: ctx.message.text }; return ctx.reply("💰 اكتب الآن المبلغ بالدولار لشحنه له مباشرة:"); }
    if (state.action === 'await_gift_amount') { let amt = parseFloat(ctx.message.text); if(!isNaN(amt)){ db.users[state.targetUid].balance_usd = (db.users[state.targetUid].balance_usd || 0) + amt; saveDB(); ctx.reply("✅ تم إضافة الرصيد للمحفظة بنجاح يدوياً!"); bot.telegram.sendMessage(state.targetUid, `🎉 تم إيداع رصيد هدية في حسابك بقيمة $${amt}`); } userStates[uId] = { action: 'admin_dashboard' }; return; }
    if (state.action.startsWith('await_charge') || state.action === 'await_proof') return charge.handleChargeSteps(ctx, state, uId, userStates, db);
    if (state.action === 'await_bot_desc' && ctx.message.text) return devBot.askServer(ctx, ctx.message.text, uId, userStates);
    if (state.action === 'admin_send_code_now' && ctx.message.text) { ctx.telegram.sendMessage(state.clientUId, `🎁 **وصلك كود الشحن الخاص بطلبك بنجاح:**\n\n\`${ctx.message.text}\`\n\n━━━━━━━━━━━━━━━━━━━━\n🚀 **رابط استرداد الأكواد الفوري للببجي والألعاب:**\n1️⃣ يرجى الدخول للموقع المعتمد: [midasbuy.com](https://midasbuy.com)\n2️⃣ ضع آيدي حسابك والكود المستلم لتفعيله فوراً.\n3️⃣ **ملاحظة:** يجب تشغيل الـ VPN إذا كنت داخل سوريا ليفتح الموقع بنجاح!`); ctx.reply("✅ تم تسليم الكود وتغليق الطلب."); userStates[uId] = null; return; }
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
        await ctx.telegram.sendMessage(config.ADMIN_CHANNEL_ID, `📥 **طلب شراء جديد:**\n━━━━━━━━━━━━━━━━━━━━\n👤 الزبون: ${ctx.from.first_name}\n🆔 آيدي التليجرام: \`${uId}\`\n💰 رصيده: *$${uBal.toFixed(2)}* (${(uBal * rate).toLocaleString()} ل.س)\n🎯 المنتج: *${state.item}*\n💵 السعر: *${state.price}$*\n🆔 آيدي اللعبة: \`${state.gameId}\``, { reply_markup: chanBtn.reply_markup, parse_mode: 'Markdown' });
        ctx.reply("🚀 تم إرسال طلب الشراء الخاص بك بنجاح إلى الإدارة! انتظر موافقة المسؤول هنا ليظهر لك الكود."); userStates[uId] = null; return;
    }
    shop.handleStore(ctx, data, uId, db, userStates);
});
bot.launch().then(() => console.log("🚀 ALL FUNCTIONS INTERCONNECTED 100% SUCCESSFULLY!"));
