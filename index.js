const { Telegraf, Markup } = require('telegraf'); const fs = require('fs'), path = require('path');
const config = require('./config'), menus = require('./menus'), shop = require('./shop');
const charge = require('./charge'), devBot = require('./dev_bot'), settings = require('./settings'), dbFile = require('./database');

// نظام الحماية التلقائي الفوري لملفات الفلوس والداتا لمنع الخراب والتصفير
const DB_FILE = path.join(__dirname, 'database.json'), BACKUP_FILE = path.join(__dirname, 'database_backup.json');
const defaultStruct = { users: {}, banned: {}, muted: {}, exchange_rate: 14500, admin_notes: "" };
if (!fs.existsSync(DB_FILE) || fs.readFileSync(DB_FILE, 'utf8').trim() === "") fs.writeFileSync(DB_FILE, JSON.stringify(defaultStruct, null, 4));
if (!fs.existsSync(BACKUP_FILE) || fs.readFileSync(BACKUP_FILE, 'utf8').trim() === "") fs.writeFileSync(BACKUP_FILE, JSON.stringify(defaultStruct, null, 4));

const bot = new Telegraf(config.BOT_TOKEN); let db = dbFile.loadDB(), saveDB = () => dbFile.saveDB(db), userStates = {};

bot.command('admin', ctx => { userStates[String(ctx.chat.id)] = { action: 'await_password' }; ctx.reply("🔐 اكتب كلمة السر الملكية للتحقق:"); });
bot.command('panel', ctx => {
    const uId = String(ctx.chat.id); if (userStates[uId]?.action !== 'admin_dashboard' && uId !== "8243108672") return ctx.reply("❌ ليس لديك صلاحية أدمن.");
    ctx.reply(`💀 **لوحة التحكم الملكية** 💀\n👥 الزبائن: ${Object.keys(db.users || {}).length}\n📈 الصرف: ${db.exchange_rate || 14500}\n📝 الملاحظات: ${db.admin_notes || "لا يوجد"}`, Markup.inlineKeyboard([[Markup.button.callback("📝 تعديل الملاحظات", "adm#edit_notes"), Markup.button.callback("📈 تعديل الصرف", "adm#edit_rate")], [Markup.button.callback("🎁 شحن رصيد", "adm#gift_user"), Markup.button.callback("💵 تصفير الأرصدة", "adm#zero_balance")], [Markup.button.callback("❌ إغلاق اللوحة", "adm#close_panel")]]));
});
bot.start(async (ctx) => {
    const uId = String(ctx.chat.id); if (!db.users) db.users = {}; if (db.banned?.[uId]) return ctx.reply("🚫 أنت محظور.");
    if (!db.users[uId]) { db.users[uId] = { name: ctx.from.first_name, balance_usd: 0.0 }; saveDB(); }
    let rate = db.exchange_rate || 14500, usd = db.users[uId].balance_usd || 0;
    ctx.reply(`👑 **بوت شام إن جيم** 👑\n👤 مرحباً: ${ctx.from.first_name}\n💰 رصيدك: *${usd.toFixed(2)}$* (${(usd * rate).toLocaleString()} ل.س)`, { parse_mode: 'Markdown', ...menus.mainMenu });
});
bot.hears('🏪 المتجر', ctx => ctx.reply("🛍️ اختر القسم المتاح للبدء والشراء:", menus.storeMenu));
bot.hears('💳 المحفظة', ctx => charge.initCharge(ctx, userStates, String(ctx.chat.id), db));
bot.hears('🤖 إنشاء بوت', ctx => devBot.initBotOrder(ctx, userStates, String(ctx.chat.id)));
bot.hears('⚙️ الإعدادات', ctx => settings.showSettings(ctx)); bot.hears('📞 الدعم الفني', ctx => settings.showSupport(ctx)); 
bot.hears('⚖️ استرجاع الأموال', ctx => { userStates[String(ctx.chat.id)] = { action: 'await_refund_amount' }; ctx.reply("💰 **قسم استرجاع الأموال:**\n✍️ اكتب المبلغ ورقم حسابك:"); });

bot.on(['text', 'photo'], async (ctx) => {
    const uId = String(ctx.chat.id); let state = userStates[uId], txt = ctx.message.text;
    if (!state) return (txt === '5' || txt === '55') ? ctx.reply("ℹ️ الرقم مستلم، لا توجد عملية معلقة.") : null;
    if (state.action === 'await_password' && (txt === config.ADMIN_PASSWORD || uId === "8243108672")) { userStates[uId] = { action: 'admin_dashboard' }; return ctx.reply("✅ تم التحقق! اكتب الآن /panel لفتح اللوحة."); }
    if (state.action === 'await_refund_amount' && txt) { bot.telegram.sendMessage(config.ADMIN_CHANNEL_ID, `⚠️ **طلب استرجاع:**\n👤 الزبون: ${ctx.from.first_name}\n🆔 الآيدي: \`${uId}\`\n📝 التفاصيل:\n${txt}`, { parse_mode: 'Markdown' }).catch(()=>{}); userStates[uId] = null; return ctx.reply("🚀 تم إرسال طلب استرجاع الأموال بنجاح!"); }
    if (state.action === 'await_new_notes' && txt) { db.admin_notes = txt; saveDB(); userStates[uId] = { action: 'admin_dashboard' }; return ctx.reply("✅ تم حفظ الملاحظات! اكتب /panel لعرض اللوحة."); }
    if (state.action === 'await_new_rate' && txt) { let r = parseFloat(txt); if (!isNaN(r)) { db.exchange_rate = r; saveDB(); ctx.reply(`✅ تم تعديل الصرف إلى ${r}`); } userStates[uId] = { action: 'admin_dashboard' }; return; }
    if (state.action === 'await_gift_uid' && txt) { userStates[uId] = { action: 'await_gift_amount', targetUid: txt }; return ctx.reply("💰 اكتب المبلغ بالدولار لشحنه له:"); }
    if (state.action === 'await_gift_amount' && txt) { let amt = parseFloat(txt); if (!isNaN(amt) && db.users?.[state.targetUid]) { db.users[state.targetUid].balance_usd = (db.users[state.targetUid].balance_usd || 0) + amt; saveDB(); ctx.reply("✅ تم إرسال الأموال بنجاح!"); bot.telegram.sendMessage(state.targetUid, `🎉 تم إيداع رصيد بقيمة $${amt}`).catch(()=>{}); } userStates[uId] = { action: 'admin_dashboard' }; return; }
    if (state.action === 'admin_send_code_now' && txt && state.clientUId) { bot.telegram.sendMessage(state.clientUId, `🎁 **وصلك كود الشحن الخاص بك:**\n\n\`${txt}\`\n\n🚀 موقع الشحن: midasbuy.com`, { parse_mode: 'Markdown' }).catch(()=>{}); userStates[uId] = null; return ctx.reply("✅ تم تسليم الكود بنجاح."); }
    if (state.action.startsWith('await_charge') || state.action === 'await_proof') return charge.handleChargeSteps(ctx, state, uId, userStates, db);
    if (state.action === 'await_bot_desc' && txt) return devBot.askServer(ctx, txt, uId, userStates);
});

bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data, uId = String(ctx.from.id); await ctx.answerCbQuery().catch(()=>{});
    if (data === "main_menu") return ctx.reply("👑 القائمة الرئيسية:", menus.mainMenu);
    if (data.startsWith("pay_approve#") || data.startsWith("pay_reject#") || data.startsWith("order_dec#")) {
        const parts = data.split('#'), cId = parts[1] || parts[2];
        if (data.startsWith("pay_approve#")) {
            let val = parseFloat(parts[2]), finalUsd = parts[3] === 'usd' ? val : (val / (db.exchange_rate || 14500));
            if (!db.users[cId]) db.users[cId] = { balance_usd: 0 }; db.users[cId].balance_usd += finalUsd; saveDB();
            bot.telegram.sendMessage(cId, `🎉 **تم قبول وصل الشحن وتم إيداع $${finalUsd.toFixed(2)} في محفظتك.**`).catch(()=>{}); return ctx.reply("✅ تم قبول الشحن يدوياً.");
        }
        if (data.startsWith("order_dec#") && parts[1] === "accept") {
            let pr = parseFloat(parts[3]); if ((db.users[cId]?.balance_usd || 0) < pr) return ctx.reply("❌ رصيد العميل لا يكفي للخصم!");
            db.users[cId].balance_usd -= pr; saveDB(); ctx.reply("✅ تم قبول الطلب وخصم الرصيد.\n✍️ أرسل كود الشحن الآن لتسليمه تلقائياً للزبون:");
            userStates[uId] = { action: 'admin_send_code_now', clientUId: cId }; return;
        }
        bot.telegram.sendMessage(cId, `❌ **نعتذر منك، تم رفض وإلغاء طلبك من قبل الإدارة.**`).catch(()=>{}); return ctx.reply("❌ تم الرفض بنجاح.");
    }
    if (data === "adm#edit_notes") { userStates[uId] = { action: 'await_new_notes' }; return ctx.reply("✍️ أرسل الملاحظة الجديدة:"); }
    if (data === "adm#edit_rate") { userStates[uId] = { action: 'await_new_rate' }; return ctx.reply("📈 اكتب سعر الصرف الجديد:"); }
    if (data === "adm#gift_user") { userStates[uId] = { action: 'await_gift_uid' }; return ctx.reply("🎁 أرسل آيدي الزبون المراد شحنه:"); }
    if (data === "adm#close_panel") return ctx.deleteMessage().catch(()=>{});
    if (data === "adm#zero_balance") { if (db.users) Object.keys(db.users).forEach(id => db.users[id].balance_usd = 0.0); saveDB(); return ctx.reply("💵 تم تصفير كافة الأرصدة!"); }
    if (data.startsWith("ch#")) return charge.askAmount(ctx, data, uId, userStates);
    if (data.startsWith("srv#")) return devBot.handleServerChoice(ctx, data, uId, userStates);
    shop.handleStore(ctx, data, uId, db, userStates);
});
bot.launch().then(() => console.log("🚀 SHAM IN GAME IS 100% OPERATIONAL & WORKING!"));

