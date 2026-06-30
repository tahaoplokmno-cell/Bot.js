const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const config = require('./config');
const menus = require('./menus');
const admin = require('./admin');
const custom = require('./custom_items');

const bot = new Telegraf(config.BOT_TOKEN);
const DB_FILE = './database.json';
let db = { users: {}, exchange_rate: 15000 };
if (fs.existsSync(DB_FILE)) { try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e){} }

function saveDB() { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 4)); }
let userStates = {};

bot.command('admin', ctx => {
    userStates[String(ctx.chat.id)] = { action: 'await_password' };
    ctx.reply("🔐 نظام الحماية الملكي: يرجى كتابة كلمة السر للتحقق:");
});

bot.command('panel', ctx => {
    const uId = String(ctx.chat.id);
    if (userStates[uId]?.action === 'admin_dashboard' || uId === "8243108672") {
        const panelData = admin.getAdminPanel(db);
        return ctx.reply(panelData.text, { parse_mode: 'Markdown', ...panelData.markup });
    }
    ctx.reply("❌ ليس لديك صلاحية أدمن.");
});

bot.start(async (ctx) => {
    const uId = String(ctx.chat.id);
    if (!db.users) db.users = {};
    if (!db.users[uId]) { db.users[uId] = { name: ctx.from.first_name, balance_usd: 0.0 }; saveDB(); }
    const rate = db.exchange_rate || 15000; const usd = db.users[uId].balance_usd || 0;
    let welcome = `👑 **أهلاً بك في بوت شام إن جيم | SHAM IN GAME** 👑\n━━━━━━━━━━━━━━━━━━━━\n👤 **مرحباً بك يا:** ${ctx.from.first_name || "زبوننا الغالي"}\n\n💰 **رصيد محفظتك الحالي:**\n💵 بالدولار: *${usd.toFixed(2)}$*\n🇸🇾 بالليرة السورية: *${(usd * rate).toLocaleString()} ل.س*\n\n📈 **سعر الصرف المعتمد اليوم:**\n1$ = *${rate.toLocaleString()} ل.س*\n━━━━━━━━━━━━━━━━━━━━\n⚠️ **تنويه هـام للزبائن الكرام:**\nقد يستغرق معالجة وتسليم طلبك بعض الوقت، وخاصةً في أوقات الليل، وذلك لأنني الأدمن الوحيد الذي يقوم بمراجعة وشحن الحسابات يدوياً لضمان أمانكم. شكراً لتفهمكم وصبركم معنا! ❤️`;
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
    const uId = String(ctx.chat.id); let state = userStates[uId]; if (!state) return;
    if (state.action === 'await_password') {
        if (ctx.message.text === config.ADMIN_PASSWORD) { userStates[uId] = { action: 'admin_dashboard' }; return ctx.reply("✅ تم التحقق بنجاح! اكتب الآن أمر /panel لفتح لوحة التحكم العظمى."); }
        userStates[uId] = null; return ctx.reply("❌ كلمة السر خاطئة!");
    }
    if (state.action === 'adm_await_rate' && ctx.message.text) {
        let newRate = parseInt(ctx.message.text); if (isNaN(newRate)) return ctx.reply("❌ الرجاء إدخال رقم صحيح!");
        db.exchange_rate = newRate; saveDB(); userStates[uId] = { action: 'admin_dashboard' };
        return ctx.reply(`✅ تم تحديث سعر الصرف بنجاح إلى: ${newRate} ل.س! اكتب /panel لرؤية اللوحة.`);
    }
    if (state.action === 'adm_await_gift' && ctx.message.text) {
        let parts = ctx.message.text.split('#'); if (parts.length < 2) return ctx.reply("❌ طريقة خاطئة! أرسل: الآيدي#المبلغ");
        let targetId = parts[0].trim(), amount = parseFloat(parts[1].trim());
        if (!db.users[targetId]) return ctx.reply("❌ هذا الآيدي غير مسجل في البوت!");
        db.users[targetId].balance_usd = (db.users[targetId].balance_usd || 0) + amount; saveDB();
        ctx.telegram.sendMessage(targetId, `🎉 مبارك! تم إيداع مبلغ $${amount} في محفظتك من قبل الإدارة.`);
        userStates[uId] = { action: 'admin_dashboard' }; return ctx.reply("✅ تم شحن حساب الزبون بنجاح وتنبيهه!");
    }
    if (state.action === 'adm_await_broadcast' && ctx.message.text) {
        let count = 0; Object.keys(db.users || {}).forEach(id => { ctx.telegram.sendMessage(id, `📢 **إعلان هام من إدارة المتجر:**\n\n${ctx.message.text}`).then(() => count++).catch(()=>{}); });
        userStates[uId] = { action: 'admin_dashboard' }; return ctx.reply(`✅ تم إرسال الإذاعة بنجاح إلى ${count} زبون!`);
    }
    if (state.action === 'await_game_id' && ctx.message.text) {
        userStates[uId] = { ...state, action: 'confirmed', gameId: ctx.message.text };
        return ctx.reply(`🎯 آيدي الحساب: \`${ctx.message.text}\`\nالمنتج: ${state.item}\n━━━━━━━━━━━━━━━━━━━━\nاضغط على الزر بالأسفل لتأكيد الطلب وإرساله للإدارة:`, Markup.inlineKeyboard([[Markup.button.callback("🚀 تأكيد وإرسال الطلب", "confirm_order")]]));
    }
    if (state.action === 'await_proof') {
        ctx.reply("✅ تم استلام إثبات التحويل وجاري تدقيقه من قبل الإدارة لشحن حسابك.");
        let cap = `🏦 **إثبات شحن جديد:**\n🆔 آيدي العميل: \`${uId}\`\n💰 طريقة الشحن: ${state.type}`;
        if (ctx.message.photo) { await ctx.telegram.sendPhoto(config.ADMIN_CHANNEL_ID, ctx.message.photo.pop().file_id, { caption: cap }); }
        else { await ctx.telegram.sendMessage(config.ADMIN_CHANNEL_ID, cap + `\n📝 النص: ${ctx.message.text}`); }
        userStates[uId] = null;
    }
});

bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data; const uId = String(ctx.from.id); await ctx.answerCbQuery().catch(()=>{});
    
    if (data.startsWith("adm#")) {
        let act = data.split('#')[1];
        if (act === "close_panel") return ctx.deleteMessage().catch(()=>{});
        if (act === "get_backup") return ctx.replyWithDocument({ source: DB_FILE, filename: 'database.json' }).catch(()=>{});
        if (act === "edit_rate") { userStates[uId] = { action: 'adm_await_rate' }; return ctx.reply("📈 أرسل سعر الصرف الجديد بالليرة فوراً (مثال: 15300):"); }
        if (act === "gift_user") { userStates[uId] = { action: 'adm_await_gift' }; return ctx.reply("🎁 لشحن حساب زبون، أرسل الآيدي والمبلغ وبينهما علامة (#)\nمثال:\n`8243108672#10` "); }
        if (act === "broadcast") { userStates[uId] = { action: 'adm_await_broadcast' }; return ctx.reply("📢 اكتب الآن نص الرسالة التي تريد تعميمها على كل المشتركين:"); }
    }

    if (data === "m#games") {
        let buttons = Object.keys(custom.MY_CUSTOM_GAMES).map(g => [Markup.button.callback("🎮 " + g, "vg#" + g)]);
        return ctx.editMessageText("🎮 **اختر اللعبة المطلوبة:**", Markup.inlineKeyboard(buttons));
    }
    if (data === "m#cards") {
        let buttons = Object.keys(custom.MY_CUSTOM_CARDS).map(c => [Markup.button.callback("🎟️ " + c, "vc#" + c)]);
        return ctx.editMessageText("🎟️ **اختر نوع البطاقات الرقمية:**", Markup.inlineKeyboard(buttons));
    }
    if (data === "bot_order#start") return ctx.reply("🤖 **قسم إنشاء وتصميم بوت خاص:**\nاكتب الآن نوع البوت والمواصفات التي تريدها لكي يراجعها الدعم:");
    if (data.startsWith("vg#") || data.startsWith("vc#")) {
        const isGame = data.startsWith("vg#"); const name = data.split('#')[1];
        const list = isGame ? custom.MY_CUSTOM_GAMES[name] : custom.MY_CUSTOM_CARDS[name];
        let buttons = list.map(item => [Markup.button.callback(item, "buy#" + name + "#" + item)]);
        return ctx.editMessageText(`🎯 **العروض المتوفرة لـ ${name}:**`, Markup.inlineKeyboard(buttons));
    }
    if (data.startsWith("buy#")) {
        const parts = data.split('#')[2]; userStates[uId] = { action: 'await_game_id', item: parts };
        return ctx.reply(`✍️ يرجى كتابة رقم **الآيدي (ID)** الخاص بك في اللعبة للمتابعة والشراء:`);
    }
    if (data === "confirm_order") {
        const state = userStates[uId]; if (!state) return ctx.reply("❌ لا يوجد طلب نشط.");
        await ctx.telegram.sendMessage(config.ADMIN_CHANNEL_ID, `📥 **طلب شراء جديد من الستور:**\n👤 العميل: ${ctx.from.first_name}\n🆔 آيدي التليجرام: \`${uId}\`\n🎯 الخدمة: ${state.item}\n🆔 آيدي اللاعب: \`${state.gameId}\``);
        ctx.reply("🚀 تم إرسال طلب الشراء الخاص بك بنجاح إلى الإدارة."); userStates[uId] = null;
    }
    if (data === "ch#usd" || data === "ch#syr") {
        userStates[uId] = { action: 'await_proof', type: data === "ch#usd" ? "دولار (USD)" : "ليرة سورية (SYR)" };
        return ctx.reply(`💳 **قسم إيداع وتعبئة المحفظة (${userStates[uId].type}):**\n\nقم بالتحويل لحساب الإدارة ثم أرسل (صورة الوصل أو نص التأكيد) هنا فوراً ليتم تفعيل رصيدك يدوياً:`);
    }
});

bot.launch().then(() => console.log("🚀 السيستم الملكي متصل ويعمل بـ 5 ملفات خفيفة ومستقرة 100%!"));
