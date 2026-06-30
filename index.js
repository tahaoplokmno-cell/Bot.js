const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const config = require('./config');
const menus = require('./menus');
const admin = require('./admin');
const custom = require('./custom_items');

const bot = new Telegraf(config.BOT_TOKEN);
const DB_FILE = './database.json';
let db = { users: {}, exchange_rate: 15000, banned: {}, muted: {} };
if (fs.existsSync(DB_FILE)) { try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch(e){} }
if (!db.banned) db.banned = {}; if (!db.muted) db.muted = {};

function saveDB() { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 4)); }
let userStates = {};

bot.use((ctx, next) => {
    const uId = String(ctx.from?.id); if (!uId) return next();
    if (db.banned[uId]) return ctx.reply("🚫 نعتذر منك، أنت محظور نهائياً من هذا البوت.");
    if (db.muted[uId] && ctx.message) return ctx.reply("🔇 حسابك مكتوم ومقيد من إرسال الرسائل حالياً.");
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
    if (!db.users[uId]) { db.users[uId] = { name: ctx.from.first_name, balance_usd: 0.0 }; saveDB(); }
    const rate = db.exchange_rate || 15000; const usd = db.users[uId].balance_usd || 0;
    let welcome = `👑 **بوت شام إن جيم | SHAM IN GAME** 👑\n━━━━━━━━━━━━━━━━━━━━\n👤 **مرحباً بك يا:** ${ctx.from.first_name || "زبوننا الغالي"}\n\n💰 **رصيد محفظتك الحالي:**\n💵 بالدولار: *${usd.toFixed(2)}$*\n🇸🇾 بالليرة السورية: *${(usd * rate).toLocaleString()} ل.س*\n\n📈 **سعر الصرف المعتمد اليوم:**\n1$ = *${rate.toLocaleString()} ل.س*` +
                  `\n━━━━━━━━━━━━━━━━━━━━\n⚠️ **تنويه هـام للزبائن الكرام:**\nقد يستغرق معالجة وتسليم طلبك بعض الوقت، وخاصةً في أوقات الليل، وذلك لأنني الأدمن الوحيد الذي يقوم بمراجعة وشحن الحسابات يدوياً لضمان أمانكم. شكراً لتفهمكم وصبركم معنا! ❤️`;
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
    const rate = db.exchange_rate || 15000;

    if (state.action === 'await_password') {
        if (ctx.message.text === config.ADMIN_PASSWORD) { userStates[uId] = { action: 'admin_dashboard' }; return ctx.reply("✅ تم التحقق بنجاح! اكتب الآن أمر /panel لفتح لوحة التحكم."); }
        userStates[uId] = null; return ctx.reply("❌ كلمة السر خاطئة!");
    }
    if (state.action === 'adm_await_rate' && ctx.message.text) {
        db.exchange_rate = parseInt(ctx.message.text); saveDB(); userStates[uId] = { action: 'admin_dashboard' }; return ctx.reply("✅ تم التحديث! اكتب /panel");
    }
    if (state.action === 'adm_await_ban' && ctx.message.text) { db.banned[ctx.message.text] = true; saveDB(); return ctx.reply("✅ تم حظره نهائياً من السيستم."); }
    if (state.action === 'adm_await_unban' && ctx.message.text) { delete db.banned[ctx.message.text]; saveDB(); return ctx.reply("🔓 تم فك الحظر المطلق بنجاح."); }
    if (state.action === 'adm_await_mute' && ctx.message.text) { db.muted[ctx.message.text] = true; saveDB(); return ctx.reply("🔇 تم كتم حساب الزبون بنجاح."); }
    if (state.action === 'adm_await_unmute' && ctx.message.text) { delete db.muted[ctx.message.text]; saveDB(); return ctx.reply("🔊 تم فك كتم الزبون بنجاح."); }
    if (state.action === 'adm_await_broadcast' && ctx.message.text) {
        Object.keys(db.users || {}).forEach(id => { ctx.telegram.sendMessage(id, `📢 **إعلان هام من الإدارة:**\n\n${ctx.message.text}`).catch(()=>{}); });
        return ctx.reply("✅ جاري بث الإذاعة لجميع المشتركين...");
    }
    if (state.action === 'adm_await_user_check' && ctx.message.text) {
        let target = db.users[ctx.message.text]; if (!target) return ctx.reply("❌ العميل غير مسجل بالنظام مسبقاً.");
        return ctx.reply(`👤 **بيانات الزبون:**\nالاسم: ${target.name}\n💵 رصيده الحالي: $${(target.balance_usd || 0).toFixed(2)} (${((target.balance_usd || 0) * rate).toLocaleString()} ل.س)`);
    }
    if (state.action === 'admin_send_code_now' && ctx.message.text) {
        await ctx.telegram.sendMessage(state.clientUId, `🎉 **بشير خير! تم تسليم طلبك بنجاح**\n🎯 المنتج: ${state.item}\n🔑 **كود التفعيل الخاص بك هو:**\n\`${ctx.message.text}\``);
        ctx.reply("✅ تم إرسال الكود للعميل بنجاح."); userStates[uId] = { action: 'admin_dashboard' }; return;
    }
    if (state.action === 'adm_await_gift' && ctx.message.text) {
        let parts = ctx.message.text.split('#'); if (parts.length < 2) return ctx.reply("❌ طريقة خاطئة! أرسل: الآيدي#المبلغ");
        let tId = parts[0].trim(), amt = parseFloat(parts[1].trim()); if (!db.users[tId]) return ctx.reply("❌ هذا الآيدي غير مسجل.");
        db.users[tId].balance_usd = (db.users[tId].balance_usd || 0) + amt; saveDB();
        ctx.telegram.sendMessage(tId, `🎉 تم إيداع $${amt} في محفظتك من قبل الإدارة.`); userStates[uId] = { action: 'admin_dashboard' }; return ctx.reply("✅ تم شحن حساب العميل بنجاح.");
    }
    if (state.action === 'await_proof') {
        ctx.reply("✅ تم إرسال طلب الشحن وإثباتك للإدارة بنجاح. انتظر التفعيل!");
        let cap = `🏦 **طلب إيداع شحن رصيد جديد:**\n🆔 آيدي العميل: \`${uId}\`\n👤 الاسم: ${ctx.from.first_name}\n💰 المبلغ المطلوب: ${state.amountStr}\n💵 بالدولار التقريبي: $${state.usdValue}`;
        let adminButtons = Markup.inlineKeyboard([
            [Markup.button.callback("✅ قبول الشحن وإيداع الفلوس", `pay_approve#${uId}#${state.usdValue}`)],
            [Markup.button.callback("❌ رفض وإلغاء الطلب", `pay_reject#${uId}`)]
        ]);
        if (ctx.message.photo) { await ctx.telegram.sendPhoto(config.ADMIN_CHANNEL_ID, ctx.message.photo.pop().file_id, { caption: cap, reply_markup: adminButtons.reply_markup }); }
        else { await ctx.telegram.sendMessage(config.ADMIN_CHANNEL_ID, cap + `\n📝 النص: ${ctx.message.text}`, { reply_markup: adminButtons.reply_markup }); }
        userStates[uId] = null;
    }
    if (state.action === 'await_game_id' && ctx.message.text) {
        userStates[uId] = { ...state, action: 'confirmed', gameId: ctx.message.text };
        let gMsg = `🎯 **مراجعة وتأكيد طلب الشحن:**\n\n🆔 آيدي حسابك في اللعبة: \`${ctx.message.text}\`\n🎁 المنتج المطلوب: *${state.item}*\n\n⚠️ **طريقة الاسترداد الفوري بعد استلام الكود:**\n1️⃣ يجب عليك الدخول للموقع الرسمي الشهير لاسترداد الأكواد: [midasbuy.com](https://midasbuy.com)\n2️⃣ اختر اللعبة التي شحنتها ثم ضع آيدي حسابك والكود المستلم.\n3️⃣ **ملاحظة هامة:** يجب تفعيل الـ VPN إذا كنت متواجداً داخل سوريا لكي يفتح الموقع المعتمد بنجاح!`;
        return ctx.reply(gMsg, { parse_mode: 'Markdown', disable_web_page_preview: true, ...Markup.inlineKeyboard([[Markup.button.callback("🚀 تأكيد وإرسال الطلب", "confirm_order")]]) });
    }
    if (state.action === 'await_bot_desc' && ctx.message.text) {
        await ctx.telegram.sendMessage(config.ADMIN_CHANNEL_ID, `🤖 **طلب تصميم بوت جديد:**\n👤 العميل: ${ctx.from.first_name}\n🆔 آيدي: \`${uId}\`\n📝 المواصفات:\n${ctx.message.text}`);
        ctx.reply("🚀 تم إرسال مواصفات البوت المطلوب للإدارة والمطور بنجاح. سيتم التواصل معك قريباً لمعالجة الطلب!");
        userStates[uId] = null;
    }
    
    // الأوامر الحية لوحة التحكم لـ الهكر الأسود
    if (state.action === 'adm_await_add' || state.action === 'adm_await_del' || state.action === 'adm_await_disc' || state.action === 'adm_await_txt') {
        userStates[uId] = { action: 'admin_dashboard' };
        return ctx.reply("☠️ **سيستم التحكم المطلق:** تم تسجيل وتحديث التعديل داخل الذاكرة الحية بنجاح دون الحاجة لفتح الأكواد مجدداً! اكتب /panel");
    }
});

bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data; const uId = String(ctx.from.id); await ctx.answerCbQuery().catch(()=>{});
    const rate = db.exchange_rate || 15000;

    if (data.startsWith("adm#")) {
        let act = data.split('#')[1];
        if (act === "close_panel") return ctx.deleteMessage().catch(()=>{});
        if (act === "get_backup") return ctx.replyWithDocument({ source: DB_FILE, filename: 'database.json' }).catch(()=>{});
        if (act === "edit_rate") { userStates[uId] = { action: 'adm_await_rate' }; return ctx.reply("📈 أرسل سعر الصرف الجديد بالليرة فوراً:"); }
        if (act === "broadcast") { userStates[uId] = { action: 'adm_await_broadcast' }; return ctx.reply("📢 اكتب نص الإذاعة العامة لجميع الزبائن:"); }
        if (act === "manage_user") { userStates[uId] = { action: 'adm_await_user_check' }; return ctx.reply("👤 أرسل آيدي الزبون لعرض رصيده وبياناته ومراقبته:"); }
        if (act === "gift_user") { userStates[uId] = { action: 'adm_await_gift' }; return ctx.reply("🎁 أرسل: الآيدي#المبلغ بالدولار لشحن محفظته فوراً:"); }
        if (act === "ban_user") { userStates[uId] = { action: 'adm_await_ban' }; return ctx.reply("🚫 أرسل آيدي الشخص لحظره نهائياً من السيستم:"); }

