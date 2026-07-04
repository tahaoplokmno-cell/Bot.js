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

// ===== لوحة الأدمن الخارقة =====
const openSuperPanel = (ctx) => {
    const p = adminActions.getSuperAdminPanel(db);
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
        return openSuperPanel(ctx);
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

// ===== استرجاع الأموال (زرين دولار + ليرة) =====
bot.hears('💰 استرجاع الأموال', ctx => {
    const btn = Markup.inlineKeyboard([
        [Markup.button.callback("💵 استرجاع بالدولار", "refund#usd")],
        [Markup.button.callback("🇸🇾 استرجاع بالليرة", "refund#syr")]
    ]);
    ctx.reply("💰 **اختر عملة الاسترجاع:**", btn);
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

    // ===== 1️⃣ كلمة السر =====
    if (state.action === 'await_password') {
        if (txt === config.ADMIN_PASSWORD) {
            userStates[uId] = { action: 'admin_dashboard' };
            return ctx.reply("✅ تم التحقق! اكتب /panel.");
        }
        userStates[uId] = null;
        return ctx.reply("❌ كلمة سر خاطئة!");
    }

    // ===== 2️⃣ ملاحظات الأدمن =====
    if (state.action === 'await_new_notes' && txt) {
        db.admin_notes = txt;
        saveDB();
        userStates[uId] = { action: 'admin_dashboard' };
        return ctx.reply("✅ تم الحفظ!");
    }

    // ===== 3️⃣ تعديل سعر الصرف =====
    if (state.action === 'await_new_rate' && txt) {
        const r = parseFloat(txt);
        if (!isNaN(r) && r > 0) { 
            db.exchange_rate = r; 
            saveDB(); 
            ctx.reply(`✅ تم تعديل سعر الصرف إلى ${r} ل.س`);
        } else {
            ctx.reply("❌ اكتب رقماً صحيحاً!");
        }
        userStates[uId] = { action: 'admin_dashboard' };
        return;
    }

    // ===== 4️⃣ إهداء رصيد =====
    if (state.action === 'await_gift_uid' && txt) {
        userStates[uId] = { action: 'await_gift_amount', targetUid: txt };
        return ctx.reply("💰 اكتب المبلغ بالدولار:");
    }
    if (state.action === 'await_gift_amount' && txt) {
        const amt = parseFloat(txt);
        if (!isNaN(amt) && amt > 0 && db.users?.[state.targetUid]) {
            db.users[state.targetUid].balance_usd = (db.users[state.targetUid].balance_usd || 0) + amt;
            saveDB();
            ctx.reply(`✅ تم إهداء $${amt} للمستخدم ${state.targetUid}`);
            bot.telegram.sendMessage(state.targetUid, `🎉 تم إيداع $${amt} في محفظتك!`).catch(() => {});
        } else {
            ctx.reply("❌ المستخدم غير موجود أو المبلغ غير صحيح!");
        }
        userStates[uId] = { action: 'admin_dashboard' };
        return;
    }

    // ===== 5️⃣ حظر =====
    if (state.action === 'await_ban_uid' && txt) {
        db.banned = db.banned || {};
        db.banned[txt] = true;
        saveDB();
        userStates[uId] = { action: 'admin_dashboard' };
        return ctx.reply(`🚫 تم حظر [${txt}].`);
    }

    // ===== 6️⃣ فك الحظر =====
    if (state.action === 'await_unban_uid' && txt) {
        if (db.banned) delete db.banned[txt];
        saveDB();
        userStates[uId] = { action: 'admin_dashboard' };
        return ctx.reply(`🟢 تم فك حظر [${txt}].`);
    }

    // ===== 7️⃣ إرسال إعلان =====
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

    // ===== 8️⃣ إضافة قسم =====
    if (state.action === 'await_add_category' && txt) {
        const catName = txt.trim();
        if (!db.custom_store) db.custom_store = { games: {} };
        if (!db.custom_store.games[catName]) {
            db.custom_store.games[catName] = [];
            saveDB();
            ctx.reply(`✅ تم إضافة القسم [${catName}] بنجاح!`);
        } else {
            ctx.reply(`⚠️ القسم [${catName}] موجود مسبقاً!`);
        }
        userStates[uId] = { action: 'admin_dashboard' };
        return;
    }

    // ===== 9️⃣ حذف قسم =====
    if (state.action === 'await_delete_category' && txt) {
        const catName = txt.trim();
        if (db.custom_store?.games?.[catName]) {
            delete db.custom_store.games[catName];
            saveDB();
            ctx.reply(`🗑️ تم حذف القسم [${catName}] بنجاح!`);
        } else {
            ctx.reply(`⚠️ القسم [${catName}] غير موجود!`);
        }
        userStates[uId] = { action: 'admin_dashboard' };
        return;
    }

    // ===== 🔟 إضافة منتج =====
    if (state.action === 'await_add_product' && txt) {
        const parts = txt.split('|');
        if (parts.length === 3) {
            const [category, name, price] = parts.map(p => p.trim());
            const priceNum = parseFloat(price);
            if (!isNaN(priceNum) && priceNum > 0 && db.custom_store?.games?.[category]) {
                db.custom_store.games[category].push(`${name} - ${priceNum.toFixed(2)}`);
                saveDB();
                ctx.reply(`✅ تم إضافة المنتج [${name}] بقيمة $${priceNum.toFixed(2)} في قسم [${category}]`);
            } else {
                ctx.reply("❌ القسم غير موجود أو السعر غير صحيح!");
            }
        } else {
            ctx.reply("❌ الصيغة غير صحيحة! استخدم: `القسم|اسم_المنتج|السعر`");
        }
        userStates[uId] = { action: 'admin_dashboard' };
        return;
    }

    // ===== 1️⃣1️⃣ حذف منتج =====
    if (state.action === 'await_delete_product' && txt) {
        const parts = txt.split('|');
        if (parts.length === 2) {
            const [category, productName] = parts.map(p => p.trim());
            if (db.custom_store?.games?.[category]) {
                const index = db.custom_store.games[category].findIndex(item => item.includes(productName));
                if (index !== -1) {
                    db.custom_store.games[category].splice(index, 1);
                    saveDB();
                    ctx.reply(`🗑️ تم حذف المنتج [${productName}] من قسم [${category}]`);
                } else {
                    ctx.reply(`⚠️ المنتج [${productName}] غير موجود في قسم [${category}]`);
                }
            } else {
                ctx.reply(`⚠️ القسم [${category}] غير موجود!`);
            }
        } else {
            ctx.reply("❌ الصيغة غير صحيحة! استخدم: `القسم|اسم_المنتج`");
        }
        userStates[uId] = { action: 'admin_dashboard' };
        return;
    }

    // ===== 1️⃣2️⃣ استرجاع الأموال =====
    if (state.action === 'await_refund_amount' && txt) {
        let amount = 0;
        let currency = state.currency || 'usd';
        
        if (currency === 'usd') {
            amount = parseFloat(txt);
            if (isNaN(amount) || amount <= 0) return ctx.reply("❌ اكتب رقماً صحيحاً بالدولار!");
        } else {
            const syrAmount = parseFloat(txt);
            if (isNaN(syrAmount) || syrAmount <= 0) return ctx.reply("❌ اكتب رقماً صحيحاً بالليرة!");
            amount = syrAmount / (db.exchange_rate || 14500);
        }
        
        if ((db.users[uId]?.balance_usd || 0) < amount) {
            return ctx.reply(`❌ رصيدك لا يكفي!`);
        }
        
        ctx.reply("🚀 تم إرسال طلب الاسترجاع للإدارة!");
        const btn = Markup.inlineKeyboard([
            [Markup.button.callback("✅ قبول", `ref_app#${uId}#${amount}`)],
            [Markup.button.callback("❌ رفض", `ref_rej#${uId}`)]
        ]);
        await bot.telegram.sendMessage(config.ADMIN_CHANNEL_ID, 
            `⚠️ طلب استرجاع: ${ctx.from.first_name} - $${amount.toFixed(2)} (${currency})`, 
            { reply_markup: btn.reply_markup }
        ).catch(() => {});
        userStates[uId] = null;
        return;
    }

    // ===== 1️⃣3️⃣ طلب بوت: السعر والوقت =====
    if (state.action === 'await_admin_price_time' && txt) {
        const clientId = state.targetCustomerId;
        if (clientId) {
            await bot.telegram.sendMessage(clientId, `🎉 **تم قبول طلبك!**\n📝 السعر والوقت: ${txt}`).catch(() => {});
            ctx.reply(`✅ تم إرسال السعر والوقت للمستخدم ${clientId}`);
        }
        userStates[uId] = null;
        return;
    }

    // ===== 1️⃣4️⃣ شحن رصيد سوري =====
    if (state.action === 'await_syr_phone' && txt) {
        userStates[uId] = { ...state, phoneNumber: txt, action: 'await_syr_amount' };
        return ctx.reply("💸 اكتب المبلغ:");
    }
    if (state.action === 'await_syr_amount' && txt) {
        const syrAmount = parseFloat(txt);
        if (isNaN(syrAmount) || syrAmount <= 0) return ctx.reply("❌ اكتب رقماً!");
        const requiredUsdPrice = (syrAmount * 1.5) / (db.exchange_rate || 14500);
        if ((db.users[uId]?.balance_usd || 0) < requiredUsdPrice) {
            return ctx.reply(`❌ رصيدك غير كافٍ! المطلوب $${requiredUsdPrice.toFixed(2)}`);
        }
        userStates[uId] = { type: 'card', item: `شحن ${syrAmount} ل.س`, price: requiredUsdPrice, phoneNumber: state.phoneNumber, action: 'confirmed' };
        return ctx.reply(`🎯 تأكيد: ${syrAmount} ل.س = $${requiredUsdPrice.toFixed(2)}`, { 
            ...Markup.inlineKeyboard([[Markup.button.callback("✔️ تأكيد", "confirm_order")]]) 
        });
    }

    // ===== 1️⃣5️⃣ معالجة الشحن =====
    if (state.action && (state.action.startsWith('await_charge') || state.action === 'await_proof')) {
        return charge.handleChargeSteps(ctx, state, uId, userStates, db);
    }

    // ===== 1️⃣6️⃣ أي رسالة غير معروفة =====
    return ctx.reply("⚠️ لم أفهم طلبك. استخدم الأزرار من القائمة.");
});

// ==================== التشغيل ====================
bot.launch()
    .then(() => console.log("🚀 تم تشغيل البوت الخارق"))
    .catch((err) => console.error("❌ خطأ:", err));
