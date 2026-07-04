const { Telegraf, Markup } = require('telegraf');
const config = require('./config');
const menus = require('./menus');
const shop = require('./shop');
const charge = require('./charge');
const devBot = require('./dev_bot');
const settings = require('./settings');
const adminActions = require('./admin_actions');
const dbFile = require('./database');
const callbackHandler = require('./callback_handler');

const bot = new Telegraf(config.BOT_TOKEN);
let db = dbFile.loadDB();
let userStates = {};
const saveDB = () => dbFile.saveDB(db);

// ===== لوحة الأدمن =====
const openPanel = (ctx) => {
    const p = adminActions.getAdminPanel(db);
    return ctx.reply(p.text, { parse_mode: 'Markdown', ...p.markup });
};

// ===== إعداد المتجر الافتراضي =====
db.custom_store = db.custom_store || {};
db.custom_store.games = db.custom_store.games || {
    "ببجي موبايل": ["60 شدة - 1.00", "325 شدة - 5.00", "660 شدة - 10.00", "1800 شدة - 25.00"],
    "فري فاير": ["100 دايموند - 2.00", "200 دايموند - 4.00", "400 دايموند - 7.00"],
    "روبلوكس": ["100 روبوكس - 1.50", "500 روبوكس - 6.00", "1000 روبوكس - 11.00"],
    "بطاقات ستيم STEAM": ["فئة 5$ - 5.50", "فئة 10$ - 11.00"],
    "بطاقات إكس بوكس XBOX": ["فئة 10$ - 10.50", "فئة 25$ - 26.00"]
};
saveDB();

// ==================== الأوامر ====================
bot.command('admin', ctx => {
    userStates[String(ctx.chat.id)] = { action: 'await_password' };
    ctx.reply("🔐 اكتب كلمة السر:");
});

bot.command('panel', ctx => {
    const uId = String(ctx.chat.id);
    if (userStates[uId]?.action === 'admin_dashboard' || uId === "8243108672") {
        return openPanel(ctx);
    }
    ctx.reply("❌ ليس لديك صلاحية.");
});

bot.start(async (ctx) => {
    const uId = String(ctx.chat.id);
    if (!db.users) db.users = {};
    if (db.banned?.[uId]) return ctx.reply("🚫 أنت محظور.");
    if (!db.users[uId]) {
        db.users[uId] = { name: ctx.from.first_name, balance_usd: 0 };
        saveDB();
    }
    const rate = db.exchange_rate || 14500;
    const usd = db.users[uId].balance_usd || 0;
    ctx.reply(
        `👑 **بوت شام إن جيم** 👑\n━━━━━━━━━━━━━━━━━━━━\n👤 مرحباً: ${ctx.from.first_name}\n💰 رصيدك: $${usd.toFixed(2)} | ${(usd * rate).toLocaleString()} ل.س\n📈 سعر الصرف: 1$ = ${rate.toLocaleString()} ل.س`,
        { parse_mode: 'Markdown', ...menus.mainMenu }
    );
});

// ==================== الأزرار النصية ====================
bot.hears('🏪 المتجر', ctx => ctx.reply("🛍️ اختر القسم:", menus.storeMenu));
bot.hears('💳 المحفظة', ctx => charge.initCharge(ctx, userStates, String(ctx.chat.id), db));
bot.hears('🤖 إنشاء بوت', ctx => devBot.initBotOrder(ctx, userStates, String(ctx.chat.id)));
bot.hears('⚙️ الإعدادات', ctx => settings.showSettings(ctx));
bot.hears('📞 الدعم الفني', ctx => settings.showSupport(ctx));
bot.hears('💰 استرجاع الأموال', ctx => {
    userStates[String(ctx.chat.id)] = { action: 'await_refund_amount' };
    ctx.reply("✍️ اكتب المبلغ بالدولار:");
});

// ==================== الكولباك ====================
bot.on('callback_query', async (ctx) => {
    try {
        await callbackHandler(ctx, bot, db, userStates, saveDB);
    } catch (err) {
        console.error('❌ خطأ:', err);
        await ctx.reply('⚠️ حدث خطأ.').catch(() => {});
    }
});

// ==================== الرسائل النصية ====================
bot.on(['text', 'photo'], async (ctx) => {
    const uId = String(ctx.chat.id);
    const state = userStates[uId];
    const txt = ctx.message.text;
    if (!state) return;

    // كلمة السر
    if (state.action === 'await_password') {
        if (txt === config.ADMIN_PASSWORD) {
            userStates[uId] = { action: 'admin_dashboard' };
            return ctx.reply("✅ تم التحقق! اكتب /panel.");
        }
        userStates[uId] = null;
        return ctx.reply("❌ كلمة سر خاطئة!");
    }

    // ملاحظات الأدمن
    if (state.action === 'await_new_notes' && txt) {
        db.admin_notes = txt;
        saveDB();
        userStates[uId] = { action: 'admin_dashboard' };
        return ctx.reply("✅ تم الحفظ!");
    }

    // تعديل سعر الصرف
    if (state.action === 'await_new_rate' && txt) {
        const r = parseFloat(txt);
        if (!isNaN(r)) { db.exchange_rate = r; saveDB(); ctx.reply("✅ تم التعديل!"); }
        userStates[uId] = { action: 'admin_dashboard' };
        return;
    }

    // إهداء رصيد
    if (state.action === 'await_gift_uid' && txt) {
        userStates[uId] = { action: 'await_gift_amount', targetUid: txt };
        return ctx.reply("💰 اكتب المبلغ:");
    }
    if (state.action === 'await_gift_amount' && txt) {
        const amt = parseFloat(txt);
        if (!isNaN(amt) && db.users?.[state.targetUid]) {
            db.users[state.targetUid].balance_usd = (db.users[state.targetUid].balance_usd || 0) + amt;
            saveDB();
            ctx.reply("✅ تم الإرسال!");
            bot.telegram.sendMessage(state.targetUid, `🎉 تم إيداع $${amt}`).catch(() => {});
        }
        userStates[uId] = { action: 'admin_dashboard' };
        return;
    }

    // حظر / فك حظر
    if (state.action === 'await_ban_uid' && txt) {
        db.banned = db.banned || {};
        db.banned[txt] = true;
        saveDB();
        userStates[uId] = { action: 'admin_dashboard' };
        return ctx.reply(`🚫 تم حظر [${txt}].`);
    }
    if (state.action === 'await_unban_uid' && txt) {
        if (db.banned) delete db.banned[txt];
        saveDB();
        userStates[uId] = { action: 'admin_dashboard' };
        return ctx.reply(`🟢 تم فك حظر [${txt}].`);
    }

    // إرسال إعلان
    if (state.action === 'await_broadcast_pin' && txt) {
        userStates[uId] = { action: 'admin_dashboard' };
        ctx.reply("🚀 جاري الإرسال...");
        if (db.users) {
            Object.keys(db.users).forEach(async (id) => {
                try {
                    const sent = await bot.telegram.sendMessage(id, `📌 **إعلان:**\n\n${txt}`, { parse_mode: 'Markdown' });
                    await bot.telegram.pinChatMessage(id, sent.message_id).catch(() => {});
                } catch (e) {}
            });
        }
        return;
    }

    // إرسال كود شحن
    if (state.action === 'admin_send_code_now' && txt && state.clientUId) {
        bot.telegram.sendMessage(state.clientUId, `🎁 **كود الشحن:**\n\n\`${txt}\``, { parse_mode: 'Markdown' }).catch(() => {});
        userStates[uId] = null;
        return ctx.reply("✅ تم التسليم.");
    }

    // طلب بوت
    if (state.action === 'await_admin_price_time' && txt) return devBot.sendToAdminChannel(ctx, txt, uId, userStates, bot);
    if (state.action === 'await_bot_desc' && txt) return devBot.askContact(ctx, txt, uId, userStates);
    if (state.action === 'await_bot_contact' && txt) return devBot.askServer(ctx, txt, uId, userStates);
    if (state.action === 'await_admin_bot_pricing' && txt) {
        const clientUserId = state.targetCustomerId;
        ctx.reply("✅ تم الإرسال!");
        bot.telegram.sendMessage(clientUserId, `🎉 التكلفة: ${txt}`).catch(() => {});
        const archiveBtn = Markup.inlineKeyboard([[Markup.button.callback("📂 تسليم الملف", `send_file_now#${clientUserId}`)]]);
        bot.telegram.sendMessage(config.ADMIN_CHANNEL_ID, `📂 أرشفة طلب (${clientUserId})`, { reply_markup: archiveBtn.reply_markup });
        userStates[uId] = null;
        return;
    }
    if (state.action === 'await_admin_upload_file' && (ctx.message.document || ctx.message.text)) {
        const clientUserId = state.targetCustomerId;
        ctx.reply("🚀 تم التسليم!");
        if (ctx.message.document) {
            await bot.telegram.sendDocument(clientUserId, ctx.message.document.file_id, { caption: "🎁 ملف البوت جاهز!" }).catch(() => {});
        } else {
            await bot.telegram.sendMessage(clientUserId, `🎁 كود البوت:\n\n\`${txt}\``).catch(() => {});
        }
        userStates[uId] = null;
        return;
    }

    // شحن رصيد سوري
    if (state.action === 'await_syr_phone' && txt) {
        userStates[uId] = { ...state, phoneNumber: txt, action: 'await_syr_amount' };
        return ctx.reply("💸 اكتب المبلغ:");
    }
    if (state.action === 'await_syr_amount' && txt) {
        const syrAmount = parseFloat(txt);
        if (isNaN(syrAmount) || syrAmount <= 0) return ctx.reply("❌ اكتب رقماً!");
        const requiredUsdPrice = (syrAmount * 1.5) / (db.exchange_rate || 14500);
        if ((db.users[uId]?.balance_usd || 0) < requiredUsdPrice) return ctx.reply(`❌ رصيدك غير كافٍ! المطلوب $${requiredUsdPrice.toFixed(2)}`);
        userStates[uId] = { type: 'card', item: `شحن ${syrAmount} ل.س`, price: requiredUsdPrice, phoneNumber: state.phoneNumber, action: 'confirmed' };
        return ctx.reply(`🎯 تأكيد: ${syrAmount} ل.س = $${requiredUsdPrice.toFixed(2)}`, { ...Markup.inlineKeyboard([[Markup.button.callback("✔️ تأكيد", "confirm_order")]]) });
    }

    // استرجاع أموال
    if (state.action === 'await_refund_amount' && txt) {
        const amount = parseFloat(txt);
        if (isNaN(amount) || amount <= 0) return ctx.reply("❌ اكتب رقماً!");
        if ((db.users[uId]?.balance_usd || 0) < amount) return ctx.reply(`❌ رصيدك لا يكفي!`);
        ctx.reply("🚀 تم الإرسال للإدارة!");
        const btn = Markup.inlineKeyboard([
            [Markup.button.callback("✅ قبول", `ref_app#${uId}#${amount}`)],
            [Markup.button.callback("❌ رفض", `ref_rej#${uId}`)]
        ]);
        await bot.telegram.sendMessage(config.ADMIN_CHANNEL_ID, `⚠️ طلب استرجاع: ${ctx.from.first_name} - $${amount}`, { reply_markup: btn.reply_markup }).catch(() => {});
        userStates[uId] = null;
        return;
    }

    // معالجة خطوات الشحن
    if (state.action && (state.action.startsWith('await_charge') || state.action === 'await_proof')) {
        return charge.handleChargeSteps(ctx, state, uId, userStates, db);
    }
});

// ==================== التشغيل ====================
bot.launch()
    .then(() => console.log("🚀 تم تشغيل البوت"))
    .catch((err) => console.error("❌ خطأ:", err));
