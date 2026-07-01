const { Telegraf, Markup } = require('telegraf'); const fs = require('fs'), path = require('path');
const config = require('./config'), menus = require('./menus'), shop = require('./shop'), charge = require('./charge'), devBot = require('./dev_bot'), settings = require('./settings'), admin = require('./admin'), adminActions = require('./admin_actions'), dbFile = require('./database');

const bot = new Telegraf(config.BOT_TOKEN); let db = dbFile.loadDB(), saveDB = () => dbFile.saveDB(db), userStates = {};
const openPanel = (ctx) => { const p = admin.getAdminPanel(db); return ctx.reply(p.text, { parse_mode: 'Markdown', ...p.markup }); };

bot.command('admin', ctx => { userStates[String(ctx.chat.id)] = { action: 'await_password' }; ctx.reply("🔐 اكتب كلمة السر الملكية للتحقق:"); });
bot.command('panel', ctx => { const uId = String(ctx.chat.id); if (userStates[uId]?.action === 'admin_dashboard' || uId === "8243108672") return openPanel(ctx); ctx.reply("❌ ليس لديك صلاحية أدمن."); });
bot.start(async (ctx) => {
    const uId = String(ctx.chat.id); if (!db.users) db.users = {}; if (db.banned?.[uId]) return ctx.reply("🚫 أنت محظور.");
    if (!db.users[uId]) { db.users[uId] = { name: ctx.from.first_name, balance_usd: 0.0 }; saveDB(); }
    let rate = db.exchange_rate || 14500, usd = db.users[uId].balance_usd || 0;
    ctx.reply(`👑 **بوت شام إن جيم | SHAM IN GAME** 👑\n━━━━━━━━━━━━━━━━━━━━\n👤 **مرحباً بك:** ${ctx.from.first_name}\n💰 **رصيدك الحالي:**\n💵 بالدولار: *${usd.toFixed(2)}$*\n🇸🇾 بالليرة السورية: *${(usd * rate).toLocaleString()} ل.س*\n📈 **سعر الصرف اليوم:** 1$ = *${rate.toLocaleString()} ل.س*\n━━━━━━━━━━━━━━━━━━━━\n⚠️ **تنويه هـام:** قد يستغرق تسليم طلبك بعض الوقت ليلاً لأنني الأدمن الوحيد الذي يشحن يدوياً لضمان أمانكم! ❤️`, { parse_mode: 'Markdown', ...menus.mainMenu });
});
bot.hears('🏪 المتجر', ctx => ctx.reply("🛍️ اختر القسم المتاح للبدء والشراء:", menus.storeMenu));
bot.hears('💳 المحفظة', ctx => charge.initCharge(ctx, userStates, String(ctx.chat.id), db));
bot.hears('🤖 إنشاء بوت', ctx => devBot.initBotOrder(ctx, userStates, String(ctx.chat.id)));
bot.hears('⚙️ الإعدادات', ctx => settings.showSettings(ctx)); bot.hears('📞 الدعم الفني', ctx => settings.showSupport(ctx)); 

bot.on(['text', 'photo'], async (ctx) => {
    const uId = String(ctx.chat.id); let state = userStates[uId], txt = ctx.message.text;
    if (!state) return (txt === '5' || txt === '55') ? ctx.reply("ℹ️ الرقم مستلم، لا توجد عملية معلقة حالياً.") : null;
    if (state.action === 'await_password' && (txt === config.ADMIN_PASSWORD || uId === "8243108672")) { userStates[uId] = { action: 'admin_dashboard' }; return ctx.reply("✅ تم التحقق! اكتب الآن /panel لفتح اللوحة."); }
    if (state.action === 'await_refund_amount' && txt) { bot.telegram.sendMessage(config.ADMIN_CHANNEL_ID, `⚠️ **طلب استرجاع:**\n👤 الزبون: ${ctx.from.first_name}\n🆔 الآيدي: \`${uId}\`\n📝 التفاصيل:\n${txt}`, { parse_mode: 'Markdown' }).catch(()=>{}); userStates[uId] = null; return ctx.reply("🚀 تم إرسال طلب استرجاع الأموال بنجاح!"); }
    if (state.action === 'await_new_notes' && txt) { db.admin_notes = txt; saveDB(); userStates[uId] = { action: 'admin_dashboard' }; return ctx.reply("✅ تم حفظ الملاحظات! اكتب /panel لعرض اللوحة."); }
    if (state.action === 'await_new_rate' && txt) { let r = parseFloat(txt); if (!isNaN(r)) { db.exchange_rate = r; saveDB(); ctx.reply("✅ تم تعديل الصرف!"); } userStates[uId] = { action: 'admin_dashboard' }; return; }
    if (state.action === 'await_gift_uid' && txt) { userStates[uId] = { action: 'await_gift_amount', targetUid: txt }; return ctx.reply("💰 اكتب المبلغ بالدولار لشحنه له:"); }
    if (state.action === 'await_gift_amount' && txt) { let amt = parseFloat(txt); if (!isNaN(amt) && db.users?.[state.targetUid]) { db.users[state.targetUid].balance_usd = (db.users[state.targetUid].balance_usd || 0) + amt; saveDB(); ctx.reply("✅ تم إرسال الأموال بنجاح!"); bot.telegram.sendMessage(state.targetUid, `🎉 تم إيداع رصيد بقيمة $${amt}`).catch(()=>{}); } userStates[uId] = { action: 'admin_dashboard' }; return; }
    if (state.action === 'admin_send_code_now' && txt && state.clientUId) { bot.telegram.sendMessage(state.clientUId, `🎁 **وصلك كود الشحن الخاص بك:**\n\n\`${txt}\`\n\n🚀 موقع الشحن: midasbuy.com`, { parse_mode: 'Markdown' }).catch(()=>{}); userStates[uId] = null; return ctx.reply("✅ تم تسليم الكود بنجاح."); }
    
    // الأوامر الحية لصناعة الفئات وحذف العروض من الأزرار مباشرة وحفظها بالداتا
    if (!db.custom_store) db.custom_store = { games: {}, cards: {} };
    if (state.action === 'await_cat_type' && txt) { const t = txt.toLowerCase(); if (t==='games'||t==='cards') { userStates[uId] = { action: 'await_cat_name', type: t }; return ctx.reply("✍️ اكتب الآن اسم الزر الفرعي للعبة أو نوع البطاقة بالكامل (مثال: ببجي موبايل أو بطاقات زين):"); } ctx.reply("❌ اكتب games أو cards فقط!"); userStates[uId] = { action: 'admin_dashboard' }; return; }
    if (state.action === 'await_cat_name' && txt) { db.custom_store[state.type][txt] = []; saveDB(); userStates[uId] = { action: 'admin_dashboard' }; ctx.reply(`✅ تم إنشاء زر فرعي بالمتجر باسم [${txt}] بنجاح!`); return openPanel(ctx); }
    if (state.action === 'await_offer_cat' && txt) { const found = db.custom_store.games[txt] ? 'games' : (db.custom_store.cards[txt] ? 'cards' : null); if (!found) return ctx.reply("❌ هذا القسم غير موجود بالمتجر!"); userStates[uId] = { action: 'await_offer_details', type: found, catName: txt }; return ctx.reply("✍️ اكتب تفاصيل العرض مع السعر مفصولين بشرطة - (مثال: 60 شدة ببجي - 1.25):"); }
    if (state.action === 'await_offer_details' && txt) { db.custom_store[state.type][state.catName].push(txt); saveDB(); userStates[uId] = { action: 'admin_dashboard' }; ctx.reply("✅ تم إضافة عرض السعر الجديد للمتجر حياً!"); return openPanel(ctx); }
    if (state.action === 'await_del_offer_name' && txt) { if (db.custom_store.games[txt]) delete db.custom_store.games[txt]; else if (db.custom_store.cards[txt]) delete db.custom_store.cards[txt]; saveDB(); userStates[uId] = { action: 'admin_dashboard' }; ctx.reply(`🗑️ تم مسح كافة عروض فئة [${txt}] نهائياً!`); return openPanel(ctx); }
    if (state.action === 'await_game_id' && txt) { state.gameId = txt; userStates[uId] = { ...state, action: 'confirmed' }; return ctx.reply(`🎯 **تأكيد الطلب:**\n🎁 المنتج: *${state.item}*\n💵 السعر: *${state.price}$*\n🆔 آيدي الحساب: \`${txt}\``, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback("✔️ تأكيد ودفع فوراً", "confirm_order")]]) }); }
    if (state.action.startsWith('await_charge') || state.action === 'await_proof') return charge.handleChargeSteps(ctx, state, uId, userStates, db);
    if (state.action === 'await_bot_desc' && txt) return devBot.askServer(ctx, txt, uId, userStates);
});

bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data, uId = String(ctx.from.id); await ctx.answerCbQuery().catch(()=>{});
    if (data === "main_menu") return ctx.reply("👑 القائمة الرئيسية:", menus.mainMenu);
    if (data.startsWith("pay_approve#") || data.startsWith("pay_reject#") || data.startsWith("order_dec#") || data === "confirm_order") {
        if (data === "confirm_order") {
            const state = userStates[uId]; if (!state) return ctx.reply("❌ لا يوجد طلب نشط.");
            if((db.users[uId]?.balance_usd || 0) < state.price) return ctx.reply("❌ رصيدك غير كافٍ! اشحن محفظتك أولاً.");
            await bot.telegram.sendMessage(config.ADMIN_CHANNEL_ID, `📥 **طلب شراء جديد حير:**\n🎯 المنتج: *${state.item}*\n💵 السعر: *${state.price}$*\n🆔 آيدي العميل: \`${uId}\`\n🆔 آيدي اللعبة: \`${state.gameId || 'بطاقة رقمية'}\``, { reply_markup: Markup.inlineKeyboard([[Markup.button.callback("✅ قبول وتفعيل الكود", `order_dec#accept#${uId}#${state.price}`)], [Markup.button.callback("❌ رفض وإلغاء", `order_dec#reject#${uId}`)]]).reply_markup, parse_mode: 'Markdown' }).catch(console.error);
            ctx.reply("🚀 تم إرسال طلب الشراء للإدارة بنجاح! انتظر وصول الكود هنا."); userStates[uId] = null; return;
        }
        const parts = data.split('#'), cId = parts;
        if (data.startsWith("pay_approve#")) {
            let val = parseFloat(parts), finalUsd = parts === 'usd' ? val : (val / (db.exchange_rate || 14500));
            if (!db.users[cId]) db.users[cId] = { balance_usd: 0 }; db.users[cId].balance_usd += finalUsd; saveDB();
            bot.telegram.sendMessage(cId, `🎉 **تم قبول وصل الشحن وتم إيداع $${finalUsd.toFixed(2)} في محفظتك.**`).catch(()=>{}); return ctx.reply("✅ تم قبول الشحن.");
        }
        if (data.startsWith("order_dec#") && parts === "accept") {
            let pr = parseFloat(parts); if ((db.users[cId]?.balance_usd || 0) < pr) return ctx.reply("❌ رصيد العميل لا يكفي للخصم!");
            db.users[cId].balance_usd -= pr; saveDB(); ctx.reply("✅ تم قبول الطلب وخصم الرصيد.\n✍️ أرسل كود الشحن الآن لتسليمه تلقائياً للزبون:");
            userStates[uId] = { action: 'admin_send_code_now', clientUId: cId }; return;
        }
        bot.telegram.sendMessage(cId, `❌ **نعتذر منك، تم رفض وإلغاء طلبك من قبل الإدارة.**`).catch(()=>{}); return ctx.reply("❌ تم الرفض بنجاح.");
    }
    if (data.startsWith("adm#")) return adminActions.handleAdminCallback(ctx, data, uId, userStates, db);
    if (data.startsWith("ch#")) return charge.askAmount(ctx, data, uId, userStates);
    if (data.startsWith("srv#")) return devBot.handleServerChoice(ctx, data, uId, userStates);
    shop.handleStore(ctx, data, uId, db, userStates);
});
bot.launch().then(() => console.log("🚀 SHAM IN GAME IS 100% OPERATIONAL & WORKING!"));
