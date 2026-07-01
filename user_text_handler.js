const config = require('./config');
const devBot = require('./dev_bot');

async function handleUserTexts(ctx, bot, db, userStates, saveDB, uId, state) {
    // 1. شحن رصيد يدوياً (تحديد الآيدي)
    if (state.action === 'await_gift_uid') { 
        userStates[uId] = { action: 'await_gift_amount', targetUid: ctx.message.text }; 
        return ctx.reply("💰 اكتب الآن المبلغ بالدولار لشحنه له مباشرة:"); 
    }
    
    // 2. شحن رصيد يدوياً (تأكيد المبلغ وإرسال الإشعار)
    if (state.action === 'await_gift_amount') { 
        let amt = parseFloat(ctx.message.text); 
        if(!isNaN(amt) && db.users[state.targetUid]){ 
            db.users[state.targetUid].balance_usd = (db.users[state.targetUid].balance_usd || 0) + amt; 
            saveDB(); 
            ctx.reply("✅ تم إضافة الرصيد يدوياً!"); 
            bot.telegram.sendMessage(state.targetUid, `🎉 تم إيداع رصيد هدية بقيمة $${amt}`).catch(()=>{}); 
        } else {
            ctx.reply("❌ حدث خطأ: آيدي الحساب غير مسجل أو الرقم غير صحيح.");
        }
        userStates[uId] = { action: 'admin_dashboard' }; return; 
    }

    // 3. طلب استرجاع الأموال وإرساله لقناة الإدارة
    if (state.action === 'await_refund_amount' && ctx.message.text) {
        let uBal = db.users[uId]?.balance_usd || 0; 
        let rate = db.exchange_rate || 14500;
        let refundMsg = `⚠️ **طلب استرجاع أموال جديد:**\n━━━━━━━━━━━━━━━━━━━━\n👤 الزبون: ${ctx.from.first_name}\n🆔 الآيدي: \`${uId}\`\n💰 **إجمالي رصيده:** *$${uBal.toFixed(2)}* (${(uBal * rate).toLocaleString()} ل.س)\n📝 **المبلغ والتفاصيل:**\n${ctx.message.text}`;
        
        await bot.telegram.sendMessage(config.ADMIN_CHANNEL_ID, refundMsg, { parse_mode: 'Markdown' }).catch(console.error);
        ctx.reply("🚀 تم إرسال طلب استرجاع الأموال بنجاح! سيتم مراجعة رصيدك وتحويل المستحقات قريباً.");
        userStates[uId] = null; return;
    }

    // 4. فحص واختراق حساب زبون ومعاينة رصيده (تفعيل الزر المعطل)
    if (state.action === 'await_inspect_uid') {
        const target = ctx.message.text;
        if(db.users && db.users[target]) {
            let r = db.exchange_rate || 14500; let b = db.users[target].balance_usd || 0;
            ctx.reply(`🔎 **تقرير الفحص للزبون:**\n━━━━━━━━━━━━━━━━━━━━\n👤 الاسم: ${db.users[target].name}\n💵 الرصيد بالدولار: *$${b.toFixed(2)}*\n🇸🇾 بالليرة: *${(b * r).toLocaleString()} ل.س*\n🚫 محظور: ${db.banned?.[target] ? "نعم" : "لا"}\n🔇 مكتوم: ${db.muted?.[target] ? "نعم" : "لا"}`);
        } else { 
            ctx.reply("❌ هذا الآيدي غير مسجل في السيستم."); 
        }
        userStates[uId] = { action: 'admin_dashboard' }; return;
    }

    // 5. كتم وإلغاء كتم زبون (تفعيل الزر المعطل)
    if (state.action === 'await_mute_uid') {
        if(!db.muted) db.muted = {}; db.muted[ctx.message.text] = true; saveDB();
        ctx.reply("✅ تم كتم المشترك بنجاح في السيستم."); userStates[uId] = { action: 'admin_dashboard' }; return;
    }
    if (state.action === 'await_unmute_uid') {
        if(db.muted) delete db.muted[ctx.message.text]; saveDB();
        ctx.reply("✅ تم إلغاء الكتم عن المشترك بنجاح."); userStates[uId] = { action: 'admin_dashboard' }; return;
    }

    // 6. إضافة منتج جديد حياً ومباشرة للمتجر (تفعيل الزر المعطل)
    if (state.action === 'await_new_item_name') {
        userStates[uId] = { action: 'await_new_item_price', itemName: ctx.message.text };
        return ctx.reply("💵 ممتاز، الآن اكتب سعر هذا المنتج بالدولار (مثال: 1.25):");
    }
    if (state.action === 'await_new_item_price') {
        const price = parseFloat(ctx.message.text);
        if(!isNaN(price)) {
            if(!db.products) db.products = {};
            db.products[state.itemName] = price; saveDB();
            ctx.reply(`✅ تم إضافة المنتج [${state.itemName}] للمتجر بنجاح بسعر $${price}`);
        } else { ctx.reply("❌ السعر غير صحيح، يرجى كتابة أرقام فقط."); }
        userStates[uId] = { action: 'admin_dashboard' }; return;
    }

    // 7. حذف منتج من المتجر (تفعيل الزر المعطل)
    if (state.action === 'await_del_item_name') {
        if(db.products && db.products[ctx.message.text]) {
            delete db.products[ctx.message.text]; saveDB();
            ctx.reply(`🗑️ تم حذف المنتج [${ctx.message.text}] نهائياً من المتجر.`);
        } else { ctx.reply("❌ هذا المنتج غير موجود بالمتجر، تأكد من الاسم الدقيق."); }
        userStates[uId] = { action: 'admin_dashboard' }; return;
    }

    // 8. تمرير نصوص إنشاء البوت لملف المطور
    if (state.action === 'await_bot_desc' && ctx.message.text) return devBot.askServer(ctx, ctx.message.text, uId, userStates);
}

module.exports = { handleUserTexts };
