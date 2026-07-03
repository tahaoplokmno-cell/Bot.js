const { Telegraf, Markup } = require('telegraf');
const config = require('./config'), menus = require('./menus'), shop = require('./shop'), charge = require('./charge'), devBot = require('./dev_bot'), settings = require('./settings'), admin = require('./admin'), adminActions = require('./admin_actions'), dbFile = require('./database'), callbackHandler = require('./callback_handler');

const bot = new Telegraf(config.BOT_TOKEN);
let db = dbFile.loadDB(), saveDB = () => dbFile.saveDB(db), userStates = {};
const openPanel = (ctx) => { const p = admin.getAdminPanel(db); return ctx.reply(p.text, { parse_mode: 'Markdown', ...p.markup }); };

db.custom_store = {
    games: {
        "ببجي موبايل": ["60 شدة - 1.00", "325 شدة - 5.00", "660 شدة - 10.00", "1800 شدة - 25.00"],
        "بطاقات ستيم STEAM": ["فئة 5$ - 5.50", "فئة 10$ - 11.00"],
        "بطاقات إكس بوكس XBOX": ["فئة 10$ - 10.50", "فئة 25$ - 26.00"]
    }
};
saveDB();

bot.command('admin', ctx => { userStates[String(ctx.chat.id)] = { action: 'await_password' }; ctx.reply("🔐 اكتب كلمة السر الملكية للتحقق:"); });
bot.command('panel', ctx => { const uId = String(ctx.chat.id); if (userStates[uId]?.action === 'admin_dashboard' || uId === "8243108672") return openPanel(ctx); ctx.reply("❌ ليس لديك صلاحية أدمن."); });

bot.start(async (ctx) => {
    const uId = String(ctx.chat.id); if (!db.users) db.users = {}; if (db.banned?.[uId]) return ctx.reply("🚫 أنت محظور.");
    if (!db.users[uId]) { db.users[uId] = { name: ctx.from.first_name, balance_usd: 0.0 }; saveDB(); }
    let rate = db.exchange_rate || 14500, usd = db.users[uId].balance_usd || 0;
    ctx.reply(`👑 **بوت شام إن جيم | SHAM IN GAME** 👑\n━━━━━━━━━━━━━━━━━━━━\n👤 **مرحباً بك:** ${ctx.from.first_name}\n💰 **رصيدك الحالي:**\n💵 بالدولار: *${usd.toFixed(2)}$*\n🇸🇾 بالليرة السورية: *${(usd * rate).toLocaleString()} ل.س*\n📈 **سعر الصرف اليوم:** 1$ = *${rate.toLocaleString()} ل.س*\n━━━━━━━━━━━━━━━━━━━━\n⚠️ يمكنك الشحن التلقائي وشراء الشدات والبطاقات مباشرة عبر الأزرار! ❤️`, { parse_mode: 'Markdown', ...menus.mainMenu });
});

bot.hears('🏪 المتجر', ctx => { if (db.bot_maintenance && String(ctx.chat.id) !== "8243108672") return ctx.reply("🛑 البوت في وضع الصيانة حالياً."); ctx.reply("🛍️ اختر القسم المتاح للبدء والشراء:", menus.storeMenu); });
bot.hears('💳 المحفظة', ctx => charge.initCharge(ctx, userStates, String(ctx.chat.id), db));
bot.hears('🤖 إنشاء بوت', ctx => devBot.initBotOrder(ctx, userStates, String(ctx.chat.id)));
bot.hears('⚙️ الإعدادات', ctx => settings.showSettings(ctx));
bot.hears('📞 الدعم الفني', ctx => settings.showSupport(ctx));
bot.hears('💰 استرجاع الأموال', ctx => { userStates[String(ctx.chat.id)] = { action: 'await_refund_amount' }; ctx.reply("✍️ اكتب المبلغ بالدولار المراد استرجاعه:"); });

// ✅ هذا السطر كان ناقص وهو سبب توقف كل الأزرار (Inline Keyboards) عن العمل
bot.on('callback_query', (ctx) => callbackHandler.handleAllCallbacks(ctx, bot, db, userStates, saveDB));

bot.on(['text', 'photo'], async (ctx) => {
    const uId = String(ctx.chat.id); let state = userStates[uId], txt = ctx.message.text; if (!state) return;
    if (state.action === 'await_password') { if (txt === config.ADMIN_PASSWORD) { userStates[uId] = { action: 'admin_dashboard' }; return ctx.reply("✅ تم التحقق! اكتب /panel لفتح اللوحة."); } userStates[uId] = null; return ctx.reply("❌ كلمة السر خاطئة!"); }
    if (state.action === 'await_new_notes' && txt) { db.admin_notes = txt; saveDB(); userStates[uId] = { action: 'admin_dashboard' }; return ctx.reply("✅ تم حفظ الملاحظات! اكتب /panel."); }
    if (state.action === 'await_new_rate' && txt) { let r = parseFloat(txt); if (!isNaN(r)) { db.exchange_rate = r; saveDB(); ctx.reply("✅ تم تعديل الصرف!"); } userStates[uId] = { action: 'admin_dashboard' }; return; }
    if (state.action === 'await_gift_uid' && txt) { userStates[uId] = { action: 'await_gift_amount', targetUid: txt }; return ctx.reply("💰 اكتب المبلغ بالدولار لشحنه له:"); }
    if (state.action === 'await_gift_amount' && txt) { let amt = parseFloat(txt); if (!isNaN(amt) && db.users?.[state.targetUid]) { db.users[state.targetUid].balance_usd = (db.users[state.targetUid].balance_usd || 0) + amt; saveDB(); ctx.reply("✅ تم الإرسال!"); bot.telegram.sendMessage(state.targetUid, `🎉 تم إيداع رصيد بقيمة $${amt}`).catch(()=>{}); } userStates[uId] = { action: 'admin_dashboard' }; return; }
    if (state.action === 'await_ban_uid' && txt) { db.banned = db.banned || {}; db.banned[txt] = true; saveDB(); userStates[uId] = { action: 'admin_dashboard' }; return ctx.reply(`🚫 تم حظر [${txt}].`); }
    if (state.action === 'await_unban_uid' && txt) { if (db.banned) delete db.banned[txt]; saveDB(); userStates[uId] = { action: 'admin_dashboard' }; return ctx.reply(`🟢 تم فك الحظر عن [${txt}].`); }
    if (state.action === 'await_broadcast_pin' && txt) { userStates[uId] = { action: 'admin_dashboard' }; ctx.reply("🚀 جاري الإرسال..."); if (db.users) { Object.keys(db.users).forEach(async (id) => { try { let sent = await bot.telegram.sendMessage(id, `📌 **إعلان:**\n\n${txt}`, { parse_mode: 'Markdown' }); await bot.telegram.pinChatMessage(id, sent.message_id).catch(()=>{}); } catch(e){} }); } return; }
    if (state.action === 'admin_send_code_now' && txt && state.clientUId) { bot.telegram.sendMessage(state.clientUId, `🎁 **كود الشحن:**\n\n\`${txt}\`\n\n🚀 midasbuy.com`, { parse_mode: 'Markdown' }).catch(()=>{}); userStates[uId] = null; return ctx.reply("✅ تم تسليم الكود."); }
    if (state.action === 'await_admin_price_time' && txt) return devBot.sendToAdminChannel(ctx, txt, uId, userStates, bot);
    if (state.action === 'await_bot_desc' && txt) return devBot.askContact(ctx, txt, uId, userStates);
    if (state.action === 'await_bot_contact' && txt) return devBot.askServer(ctx, txt, uId, userStates);
    if (state.action === 'await_admin_bot_pricing' && txt) { const clientUserId = state.targetCustomerId; ctx.reply("✅ تم الإرسال والأرشفة!"); bot.telegram.sendMessage(clientUserId, `🎉 **التكلفة والوقت: [ ${txt} ]**`).catch(()=>{}); let archiveBtn = Markup.inlineKeyboard([[Markup.button.callback("📂 تسليم الملف", `send_file_now#${clientUserId}`)]]); bot.telegram.sendMessage(config.ADMIN_CHANNEL_ID, `📂 أرشفة طلب (\`${clientUserId}\`)`, { reply_markup: archiveBtn.reply_markup }); userStates[uId] = null; return; }
    if (state.action === 'await_admin_upload_file' && (ctx.message.document || ctx.message.text)) { const clientUserId = state.targetCustomerId; ctx.reply("🚀 تم تسليم الملف!"); if (ctx.message.document) { await bot.telegram.sendDocument(clientUserId, ctx.message.document.file_id, { caption: "🎁 ملف البوت جاهز!" }).catch(()=>{}); } else { await bot.telegram.sendMessage(clientUserId, `🎁 كود البوت:\n\n\`${txt}\``).catch(()=>{}); } userStates[uId] = null; return; }
    if (state.action === 'await_syr_phone' && txt) { userStates[uId] = { ...state, phoneNumber: txt, action: 'await_syr_amount' }; return ctx.reply(`💸 اكتب كمية الرصيد السوري (مثال: 1000):`); }
    if (state.action === 'await_syr_amount' && txt) {
        const syrAmount = parseFloat(txt); if (isNaN(syrAmount) || syrAmount <= 0) return ctx.reply("❌ اكتب رقماً فقط!");
        const currentRate = db.exchange_rate || 14500, totalSyrCost = syrAmount * 1.5, requiredUsdPrice = totalSyrCost / currentRate;
        let userBal = db.users[uId]?.balance_usd || 0; if (userBal < requiredUsdPrice) return ctx.reply(`❌ رصيدك غير كافٍ! المطلوب *${totalSyrCost.toLocaleString()} ل.س* = *${requiredUsdPrice.toFixed(2)}$*`);
        userStates[uId] = { type: 'card', item: `شحن رصيد ${state.cardType.toUpperCase()} بقيمة ${syrAmount} ل.س`, price: requiredUsdPrice, phoneNumber: state.phoneNumber, action: 'confirmed' };
        return ctx.reply(`🎯 **تأكيد المعاملة:**\n📱 الشبكة: *${state.cardType.toUpperCase()}*\n📞 الهاتف: \`${state.phoneNumber}\`\n💰 الصافي: *${syrAmount} ل.س*\n🇸🇾 بالرسوم: *${totalSyrCost.toLocaleString()} ل.س*\n💵 الخصم: *${requiredUsdPrice.toFixed(2)}$*`, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback("✔️ تأكيد الدفع والخصم", "confirm_order")]]) });
    }
    if (state.action === 'await_refund_amount' && txt) {
        const amount = parseFloat(txt); if (isNaN(amount) || amount <= 0) return ctx.reply("❌ اكتب رقماً موجباً!");
        let userBal = db.users[uId]?.balance_usd || 0; if (userBal < amount) return ctx.reply(`❌ رصيدك ($${userBal.toFixed(2)}) لا يكفي!`); ctx.reply("🚀 تم إرسال الطلب للإدارة!");
        let btn = Markup.inlineKeyboard([[Markup.button.callback("✅ قبول وخصم فوراً", `ref_app#${uId}#${amount}`)], [Markup.button.callback("❌ رفض", `ref_rej#${uId}`)]]);
        await bot.telegram.sendMessage(config.ADMIN_CHANNEL_ID, `⚠️ **طلب استرجاع أموال:**\n👤 ${ctx.from.first_name}\n🆔 \`${uId}\`\n💰 *${amount} $.*`, { reply_markup: btn.reply_markup, parse_mode: 'Markdown' }).catch(()=>{}); userStates[uId] = null; return;
    }
    if (state.action && (state.action.startsWith('await_charge') || state.action === 'await_proof')) return charge.handleChargeSteps(ctx, state, uId, userStates, db);
});

bot.launch().then(() => console.log("🚀 تم تشغيل البوت بثبات تام...")).catch((err) => console.error("❌ خطأ:", err));
