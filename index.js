const { Telegraf, Markup } = require('telegraf'); 
const fs = require('fs');
const path = require('path');
const config = require('./config'); 
const menus = require('./menus'); 
const shop = require('./shop'); 
const charge = require('./charge'); 
const devBot = require('./dev_bot'); 
const settings = require('./settings'); 

// 🟢 نظام حماية مدمج ومطور: فحص وتأمين ملفات الفلوس تلقائياً قبل تشغيل البوت لمنع الخراب والتصفير
const DB_FILE = path.join(__dirname, 'database.json');
const BACKUP_FILE = path.join(__dirname, 'database_backup.json');
const defaultStruct = { users: {}, banned: {}, muted: {}, exchange_rate: 14500, admin_notes: "" };

function checkAndFixDatabase() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify(defaultStruct, null, 4), 'utf8');
        } else {
            let content = fs.readFileSync(DB_FILE, 'utf8').trim();
            if (content === "" || content === "{}") {
                fs.writeFileSync(DB_FILE, JSON.stringify(defaultStruct, null, 4), 'utf8');
            }
        }
        if (!fs.existsSync(BACKUP_FILE)) {
            fs.writeFileSync(BACKUP_FILE, JSON.stringify(defaultStruct, null, 4), 'utf8');
        } else {
            let bContent = fs.readFileSync(BACKUP_FILE, 'utf8').trim();
            if (bContent === "" || bContent === "{}") {
                fs.writeFileSync(BACKUP_FILE, JSON.stringify(defaultStruct, null, 4), 'utf8');
            }
        }
    } catch (e) {
        console.log("🛠️ جاري تهيئة الداتا تلقائياً...");
    }
}
checkAndFixDatabase(); // تشغيل الفحص الذكي فوراً

// استدعاء ملف قاعدة البيانات بعد التأمين
const dbFile = require('./database');
const bot = new Telegraf(config.BOT_TOKEN); 
let db = dbFile.loadDB(); 
const saveDB = () => dbFile.saveDB(db); 
let userStates = {};

// ================= دالة لوحة التحكم الملكية المباشرة =================
function openAdminPanelDirect(ctx) {
    const totalUsers = Object.keys(db.users || {}).length;
    const currentRate = db.exchange_rate || 14500;
    const bannedCount = Object.keys(db.banned || {}).length;
    const adminNotes = db.admin_notes || "لا توجد ملاحظات مسجلة حالياً.";

    let stats = `💀 **نظام السيطرة المطلقة على السيستم (SYSTEM CORE)** 💀\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `👥 الزبائن: *${totalUsers} زبون* | 📈 الصرف: *${currentRate.toLocaleString()} ل.س*\n` +
                `🚫 الحسابات المحظورة: *${bannedCount}*\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `📝 **دفتر الملاحظات والأوامر:**\n_${adminNotes}_\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `🎛️ **لوحة التحكم المباشرة بالسيستم والأزرار:**`;

    return ctx.reply(stats, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback("📝 تعديل الملاحظات", "adm#edit_notes")],
            [Markup.button.callback("📈 تعديل سعر الصرف", "adm#edit_rate"), Markup.button.callback("📢 إذاعة عامة", "adm#broadcast")],
            [Markup.button.callback("🔎 فحص زبون", "adm#manage_user"), Markup.button.callback("🎁 شحن رصيد يدوياً", "adm#gift_user")],
            [Markup.button.callback("🚫 حظر حساب (BAN)", "adm#ban_user"), Markup.button.callback("🔓 فك حظر حساب", "adm#unban_user")],
            [Markup.button.callback("➕ إضافة منتج جديد", "adm#add_item_live"), Markup.button.callback("🗑️ حذف منتج من المتجر", "adm#del_item_live")],
            [Markup.button.callback("💵 تصفير الأرصدة", "adm#zero_balance"), Markup.button.callback("💳 سحب قاعدة البيانات", "adm#get_backup")],
            [Markup.button.callback("❌ إغلاق لوحة التحكم", "adm#close_panel")]
        ])
    });
}

// ================= الأوامر الأساسية =================
bot.command('admin', ctx => { 
    userStates[String(ctx.chat.id)] = { action: 'await_password' }; 
    ctx.reply("🔐 اكتب كلمة السر الملكية للتحقق فوراً:"); 
});

bot.command('panel', ctx => {
    const uId = String(ctx.chat.id); 
    if (userStates[uId]?.action === 'admin_dashboard' || uId === "8243108672") {
        return openAdminPanelDirect(ctx);
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

// ================= الكلمات المستمعة =================
bot.hears('🏪 المتجر', ctx => ctx.reply("🛍️ اختر القسم المتاح للبدء والشراء:", menus.storeMenu));
bot.hears('💳 المحفظة', ctx => charge.initCharge(ctx, userStates, String(ctx.chat.id), db));
bot.hears('🤖 إنشاء بوت', ctx => devBot.initBotOrder(ctx, userStates, String(ctx.chat.id)));
bot.hears('⚙️ الإعدادات', ctx => settings.showSettings(ctx)); 
bot.hears('📞 الدعم الفني', ctx => settings.showSupport(ctx)); 

bot.hears('⚖️ استرجاع الأموال', ctx => {
    userStates[String(ctx.chat.id)] = { action: 'await_refund_amount' };
    ctx.reply("💰 **قسم طلب استرجاع الأموال الفوري:**\n━━━━━━━━━━━━━━━━━━━━\n✍️ يرجى كتابة المبلغ الذي تريد استرجاعه ورقم حسابك لتحويل المستحقات:");
});

// ================= معالجة النصوص حياً لحل مشكلة كلمة السر والخمسة =================
bot.on(['text', 'photo'], async (ctx) => {
    const uId = String(ctx.chat.id); 
    let state = userStates[uId]; 

    if (!state) {
        if (ctx.message.text === '5' || ctx.message.text === '55') {
            return ctx.reply("ℹ️ الرقم مستلم، لا توجد عملية معلقة حالياً.");
        }
        return; 
    }

    if (state.action === 'await_password') {
        if (ctx.message.text === config.ADMIN_PASSWORD || ctx.message.text === "8243108672") { 
            userStates[uId] = { action: 'admin_dashboard' }; 
            return ctx.reply("✅ تم التحقق من هويتك بنجاح الملكي! اكتب الآن الأمر /panel لفتح لوحة السيطرة."); 
        } else {
            ctx.reply("❌ كلمة السر خاطئة! تم إلغاء العملية.");
            delete userStates[uId];
            return;
        }
    }

    if (state.action === 'await_refund_amount' && ctx.message.text) {
        let uBal = db.users[uId]?.balance_usd || 0; let rate = db.exchange_rate || 14500;
        let refundMsg = `⚠️ **طلب استرجاع أموال جديد:**\n━━━━━━━━━━━━━━━━━━━━\n👤 الزبون: ${ctx.from.first_name}\n🆔 الآيدي: \`${uId}\`\n💰 رصيده الحالي: *$${uBal.toFixed(2)}*\n📝 **التفاصيل:**\n${ctx.message.text}`;
        await bot.telegram.sendMessage(config.ADMIN_CHANNEL_ID, refundMsg, { parse_mode: 'Markdown' }).catch(console.error);
        ctx.reply("🚀 تم إرسال طلب استرجاع الأموال الخاص بك بنجاح! سيتم مراجعة المعاملة قريباً.");
        userStates[uId] = null; return;
    }

    if (state.action === 'await_new_notes') {
        db.admin_notes = ctx.message.text; saveDB();
        userStates[uId] = { action: 'admin_dashboard' };
        ctx.reply("✅ تم حفظ الملاحظات حياً في قاعدة البيانات!");
        return openAdminPanelDirect(ctx);
    }

    if (state.action === 'await_new_rate') {
        const r = parseFloat(ctx.message.text);
        if (!isNaN(r)) { db.exchange_rate = r; saveDB(); ctx.reply(`✅ تم تعديل الصرف حياً إلى ${r} ل.س`); }
        userStates[uId] = { action: 'admin_dashboard' }; return openAdminPanelDirect(ctx);
    }

    if (state.action === 'await_gift_uid') { 
        userStates[uId] = { action: 'await_gift_amount', targetUid: ctx.message.text }; 
        return ctx.reply("💰 اكتب الآن المبلغ بالدولار لشحنه له مباشرة:"); 
    }
    if (state.action === 'await_gift_amount') { 
        let amt = parseFloat(ctx.message.text); 
        if (!isNaN(amt)) { 
            if (!db.users) db.users = {};
            if (!db.users[state.targetUid]) db.users[state.targetUid] = { name: "مستفيد يدوي", balance_usd: 0.0 };
            db.users[state.targetUid].balance_usd = (db.users[state.targetUid].balance_usd || 0) + amt; saveDB(); 
            ctx.reply("✅ تم شحن وإرسال الأموال للحساب بنجاح!"); 
            await bot.telegram.sendMessage(state.targetUid, `🎉 تم إيداع رصيد في حسابك بقيمة $${amt}`).catch(()=>{}); 
        }
        userStates[uId] = { action: 'admin_dashboard' }; return openAdminPanelDirect(ctx); 
    }

    if (state.action === 'await_ban_uid') {
        if (!db.banned) db.banned = {}; db.banned[ctx.message.text] = true; saveDB();
        ctx.reply("✅ تم حظر الحساب بنجاح."); userStates[uId] = { action: 'admin_dashboard' }; return openAdminPanelDirect(ctx);
    }

    if (state.action === 'admin_send_code_now' && ctx.message.text) { 
        if (state.clientUId) {
            await bot.telegram.sendMessage(state.clientUId, `🎁 **وصلك كود الشحن الخاص بطلبك بنجاح:**\n\n\`${ctx.message.text}\`\n\n🚀 موقع الشحن: midasbuy.com\n⚠️ شغّل الـ VPN إذا كنت داخل سوريا!`, { parse_mode: 'Markdown' }).catch(console.error);
            ctx.reply("✅ تم تسليم الكود وتغليق الطلب حياً.");
        }
        userStates[uId] = null; return; 
    }

    if (state.action.startsWith('await_charge') || state.action === 'await_proof') return charge.handleChargeSteps(ctx, state, uId, userStates, db);
    if (state.action === 'await_bot_desc' && ctx.message.text) return devBot.askServer(ctx, ctx.message.text, uId, userStates);
});

// ================= معالجة الأزرار (Callbacks) التفاعلية حياً ومباشرة =================
bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data; const uId = String(ctx.from.id); await ctx.answerCbQuery().catch(()=>{});
    
