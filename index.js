const { Telegraf, Markup } = require('telegraf');
const config = require('./config'), menus = require('./menus'), shop = require('./shop'), charge = require('./charge'), devBot = require('./dev_bot'), settings = require('./settings'), admin = require('./admin'), adminActions = require('./admin_actions'), dbFile = require('./database');

const bot = new Telegraf(config.BOT_TOKEN);
let db = dbFile.loadDB(), saveDB = () => dbFile.saveDB(db), userStates = {};
const openPanel = (ctx) => { const p = admin.getAdminPanel(db); return ctx.reply(p.text, { parse_mode: 'Markdown', ...p.markup }); };

// 🎮 تصفير وحقن الأقسام الجديدة تلقائياً لضمان عمل المتجر والبطاقات فوراً وبثبات
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
    ctx.reply(`👑 **بوت شام إن جيم | SHAM IN GAME** 👑\n━━━━━━━━━━━━━━━━━━━━\n👤 **مرحباً بك:** ${ctx.from.first_name}\n💰 **رصيدك الحالي:**\n💵 بالدولار: *${usd.toFixed(2)}$*\n🇸🇾 بالليرة السورية: *${(usd * rate).toLocaleString()} ل.س*\n📈 **سعر الصرف اليوم:** 1$ = *${rate.toLocaleString()} ل.س*\n━━━━━━━━━━━━━━━━━━━━\n⚠️ **تنويه هـام:** يمكنك الشحن التلقائي وشراء الشدات والبطاقات الآن مباشرة عبر أزرار التحكم بالأسفل! ❤️`, { parse_mode: 'Markdown', ...menus.mainMenu });
});

bot.hears('🏪 المتجر', ctx => { if (db.bot_maintenance && String(ctx.chat.id) !== "8243108672") return ctx.reply("🛑 البوت في وضع الصيانة حالياً."); ctx.reply("🛍️ اختر القسم المتاح للبدء والشراء:", menus.storeMenu); });
bot.hears('💳 المحفظة', ctx => charge.initCharge(ctx, userStates, String(ctx.chat.id), db));
bot.hears('🤖 إنشاء بوت', ctx => devBot.initBotOrder(ctx, userStates, String(ctx.chat.id)));
bot.hears('⚙️ الإعدادات', ctx => settings.showSettings(ctx));
bot.hears('📞 الدعم الفني', ctx => settings.showSupport(ctx));
bot.hears('💰 استرجاع الأموال', ctx => { userStates[String(ctx.chat.id)] = { action: 'await_refund_amount' }; ctx.reply("✍️ اكتب الآن المبلغ بالدولار الرقمي المراد استرجاعه وخصمه من حسابك تلقائياً:"); });

bot.on(['text', 'photo'], async (ctx) => {
    const uId = String(ctx.chat.id); let state = userStates[uId], txt = ctx.message.text; if (!state) return;
    if (state.action === 'await_password') { if (txt === config.ADMIN_PASSWORD) { userStates[uId] = { action: 'admin_dashboard' }; return ctx.reply("✅ تم التحقق! اكتب الآن /panel لفتح اللوحة."); } userStates[uId] = null; return ctx.reply("❌ كلمة السر خاطئة!"); }
    if (state.action === 'await_new_notes' && txt) { db.admin_notes = txt; saveDB(); userStates[uId] = { action: 'admin_dashboard' }; return ctx.reply("✅ تم حفظ الملاحظات! اكتب /panel لعرض اللوحة."); }
    if (state.action === 'await_new_rate' && txt) { let r = parseFloat(txt); if (!isNaN(r)) { db.exchange_rate = r; saveDB(); ctx.reply("✅ تم تعديل الصرف!"); } userStates[uId] = { action: 'admin_dashboard' }; return; }
    if (state.action === 'await_gift_uid' && txt) { userStates[uId] = { action: 'await_gift_amount', targetUid: txt }; return ctx.reply("💰 اكتب المبلغ بالدولار لشحنه له:"); }
    if (state.action === 'await_gift_amount' && txt) { let amt = parseFloat(txt); if (!isNaN(amt) && db.users?.[state.targetUid]) { db.users[state.targetUid].balance_usd = (db.users[state.targetUid].balance_usd || 0) + amt; saveDB(); ctx.reply("✅ تم إرسال الأموال بنجاح!"); bot.telegram.sendMessage(state.targetUid, `🎉 تم إيداع رصيد بقيمة $${amt}`).catch(()=>{}); } userStates[uId] = { action: 'admin_dashboard' }; return; }
    if (state.action === 'await_ban_uid' && txt) { db.banned = db.banned || {}; db.banned[txt] = true; saveDB(); userStates[uId] = { action: 'admin_dashboard' }; return ctx.reply(`🚫 تم حظر العميل [${txt}] بنجاح.`); }
    if (state.action === 'await_unban_uid' && txt) { if (db.banned) delete db.banned[txt]; saveDB(); userStates[uId] = { action: 'admin_dashboard' }; return ctx.reply(`🟢 تم فك الحظر عن العميل [${txt}] بنجاح.`); }
    if (state.action === 'await_broadcast_pin' && txt) { userStates[uId] = { action: 'admin_dashboard' }; ctx.reply("🚀 جاري الإرسال والتثبيت..."); if (db.users) { Object.keys(db.users).forEach(async (id) => { try { let sent = await bot.telegram.sendMessage(id, `📌 **إعلان هام ومثبت:**\n\n${txt}`, { parse_mode: 'Markdown' }); await bot.telegram.pinChatMessage(id, sent.message_id).catch(()=>{}); } catch(e){} }); } return; }
    if (state.action === 'admin_send_code_now' && txt && state.clientUId) { bot.telegram.sendMessage(state.clientUId, `🎁 **وصلك كود الشحن الخاص بك:**\n\n\`${txt}\`\n\n🚀 موقع الشحن: midasbuy.com`, { parse_mode: 'Markdown' }).catch(()=>{}); userStates[uId] = null; return ctx.reply("✅ تم تسليم الكود بنجاح."); }
    if (state.action === 'await_admin_price_time' && txt) return devBot.sendToAdminChannel(ctx, txt, uId, userStates, bot);
    if (state.action === 'await_bot_desc' && txt) return devBot.askContact(ctx, txt, uId, userStates);
    if (state.action === 'await_bot_contact' && txt) return devBot.askServer(ctx, txt, uId, userStates);
    if (state.action === 'await_admin_bot_pricing' && txt) { const clientUserId = state.targetCustomerId; ctx.reply("✅ تم إرسال السعر والوقت للعميل وأرشفة المعاملة!"); bot.telegram.sendMessage(clientUserId, `🎉 **تم مراجعة طلبك للمواصفات! التكلفة والوقت: [ ${txt} ] وسيتم تسليمك الملف فوراً.**`).catch(()=>{}); let archiveBtn = Markup.inlineKeyboard([[Markup.button.callback("📂 إرسال تسليم ملف البوت الجاهز", `send_file_now#${clientUserId}`)]]); bot.telegram.sendMessage(config.ADMIN_CHANNEL_ID, `📂 تم أرشفة طلب العميل (\`${clientUserId}\`)`, { reply_markup: archiveBtn.reply_markup }); userStates[uId] = null; return; }
    if (state.action === 'await_admin_upload_file' && (ctx.message.document || ctx.message.text)) { const clientUserId = state.targetCustomerId; ctx.reply("🚀 تم تسليم ملف الكود بنجاح!"); if (ctx.message.document) { await bot.telegram.sendDocument(clientUserId, ctx.message.document.file_id, { caption: "🎁 تفضل ملف البوت الخاص بك جاهز!" }).catch(()=>{}); } else { await bot.telegram.sendMessage(clientUserId, `🎁 كود البوت الخاص بك:\n\n\`${txt}\``).catch(()=>{}); } userStates[uId] = null; return; }
    
    if (state.action === 'await_syr_phone' && txt) { userStates[uId] = { ...state, phoneNumber: txt, action: 'await_syr_amount' }; return ctx.reply(`💸 **رقم الهاتف مقبول!**\nاكتب الآن كمية الرصيد السوري التي ترغب في شحنها (مثال: 1000 أو 5000):`); }
    if (state.action === 'await_syr_amount' && txt) {
        const syrAmount = parseFloat(txt); if (isNaN(syrAmount) || syrAmount <= 0) return ctx.reply("❌ اكتب الكمية كأرقام فقط!");
        const currentRate = db.exchange_rate || 14500, totalSyrCost = syrAmount * 1.5, requiredUsdPrice = totalSyrCost / currentRate;
        let userBal = db.users[uId]?.balance_usd || 0; if (userBal < requiredUsdPrice) return ctx.reply(`❌ رصيدك الرقمي غير كافٍ!\nالمبلغ بالرسوم هو *${totalSyrCost.toLocaleString()} ل.س* ويساوي *${requiredUsdPrice.toFixed(2)}$*!`);
        userStates[uId] = { type: 'card', item: `شحن رصيد ${state.cardType.toUpperCase()} بقيمة ${syrAmount} ل.س`, price: requiredUsdPrice, phoneNumber: state.phoneNumber, action: 'confirmed' };
        let confirmMsg = `🎯 **تأكيد معاملة التحويل والخصم التلقائي:**\n━━━━━━━━━━━━━━━━━━━━\n📱 الشبكة: *${state.cardType.toUpperCase()}*\n📞 الهاتف: \`${state.phoneNumber}\`\n💰 الرصيد الصافي: *${syrAmount} ل.س*\n🇸🇾 بالرسوم والضرائب: *${totalSyrCost.toLocaleString()} ل.س*\n💵 الخصم المطلوب: *${requiredUsdPrice.toFixed(2)}$*`;
        return ctx.reply(confirmMsg, { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback("✔️ تأكيد الدفع والخصم الفوري", "confirm_order")]]) });
    }

    if (state.action === 'await_refund_amount' && txt) { 
        const amount = parseFloat(txt); if (isNaN(amount) || amount <= 0) return ctx.reply("❌ اكتب رقماً صحيحاً فقط وموجب!"); 
        let userBal = db.users[uId]?.balance_usd || 0; if (userBal < amount) return ctx.reply(`❌ رصيدك الحالي ($${userBal.toFixed(2)}) لا يكفي!`); ctx.reply("🚀 تم إرسال طلب استرجاع الأموال للإدارة!");
        let cap = `⚠️ **طلب استرجاع أموال جديد والخصم من الحساب:**\n👤 الزبون: ${ctx.from.first_name}\n🆔 الآيدي: \`${uId}\`\n💰 المبلغ المراد خصمه وإرجاعه كاش: *${amount} $.*`;
        let btn = Markup.inlineKeyboard([[Markup.button.callback("✅ قبول وخصم الرصيد فوراً", `ref_app#${uId}#${amount}`)], [Markup.button.callback("❌ رفض وإلغاء الطلب", `ref_rej#${uId}`)]]);
        await bot.telegram.sendMessage(config.ADMIN_CHANNEL_ID, cap, { reply_markup: btn.reply_markup, parse_mode: 'Markdown' }).catch(()=>{}); userStates[uId] = null; return;
    }
    if (state.action && (state.action.startsWith('await_cat_') || state.action.startsWith('await_offer_') || state.action === 'await_del_offer_name')) { /* تمرير لملف الأدمن */ }
    if (state.action && (state.action.startsWith('await_charge') || state.action === 'await_proof')) return charge.handleChargeSteps(ctx, state, uId, userStates, db);
    if (data.startsWith("pay_approve#") || data.startsWith("pay_reject#") || data.startsWith("order_dec#") || data === "confirm_order") {
        if (data === "confirm_order") {
            const state = userStates[uId]; if (!state) return ctx.reply("❌ لا يوجد طلب نشط."); if((db.users[uId]?.balance_usd || 0) < state.price) return ctx.reply("❌ رصيدك غير كافٍ!");
            db.users[uId].balance_usd -= state.price; saveDB();
            let adminNotice = `📥 **طلب شراء جديد بقناة الأدمن:**\n━━━━━━━━━━━━━━━━━━━━\n👤 الزبون: ${ctx.from.first_name}\n🆔 الآيدي: \`${uId}\`\n📦 العملية: *${state.item}*\n💵 القيمة: *${state.price.toFixed(2)}$*\n📞 البيانات المستهدفة: \`${state.phoneNumber || state.gameId}\``;
            await bot.telegram.sendMessage(config.ADMIN_CHANNEL_ID, adminNotice); userStates[uId] = null; return ctx.reply("🚀 **تم الخصم بنجاح وإرسال الطلب لقناة الإدارة لتسليمك يدوياً فوراً!**");
        }
        
        // 🌟 إصلاح الفهارس (parts) لقراءة آيدي المشترك والمبلغ بدقة من أزرار القناة
        const parts = data.split('#');
        const cId = parts[1];
        
        if (data.startsWith("pay_approve#")) {
            let val = parseFloat(parts[2]), finalUsd = parts[3] === 'usd' ? val : (val / (db.exchange_rate || 14500));
            if (!db.users[cId]) db.users[cId] = { balance_usd: 0 }; db.users[cId].balance_usd += finalUsd; saveDB();
            bot.telegram.sendMessage(cId, `🎉 تم إيداع $${finalUsd.toFixed(2)} في محفظتك.`).catch(()=>{}); return ctx.reply("✅ تم قبول الشحن.");
        }
        if (data.startsWith("pay_reject#")) { bot.telegram.sendMessage(cId, `❌ تم رفض طلب الشحن من قبل الإدارة.`).catch(()=>{}); return ctx.reply("❌ تم الرفض."); }
    }
    if (data.startsWith("adm#")) return adminActions.handleAdminCallback(ctx, data, uId, userStates, db);
    if (data.startsWith("ch#")) return charge.askAmount(ctx, data, uId, userStates);
});

bot.launch().then(() => console.log("🚀 تم تشغيل البوت وإغلاق كافة الثغرات والعمليات تعمل بثبات تام...")).catch((err) => console.error("❌ خطأ:", err));
