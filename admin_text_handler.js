const admin = require('./admin');

async function handleAdminTexts(ctx, bot, db, userStates, saveDB, uId, state) {
    if (state.action === 'await_password' && ctx.message.text === require('./config').ADMIN_PASSWORD) { 
        userStates[uId] = { action: 'admin_dashboard' }; 
        return ctx.reply("✅ تم التحقق! اكتب الآن الأمر /panel لفتح لوحة التحكم."); 
    }
    if (state.action === 'await_new_notes') { 
        admin.saveNotes(ctx, ctx.message.text); 
        userStates[uId] = { action: 'admin_dashboard' }; 
        const p = admin.getAdminPanel(db); 
        return ctx.reply(p.text, { parse_mode: 'Markdown', ...p.markup }); 
    }
    if (state.action === 'await_new_rate') { 
        const r = parseFloat(ctx.message.text); 
        if(!isNaN(r)){ db.exchange_rate = r; saveDB(); ctx.reply(`✅ تم تعديل الصرف إلى ${r} ل.س`); } 
        userStates[uId] = { action: 'admin_dashboard' }; 
        return; 
    }
    if (state.action === 'await_broadcast_txt') { 
        ctx.reply("📢 جاري إرسال البرودكاست لجميع الزبائن..."); 
        Object.keys(db.users || {}).forEach(id => bot.telegram.sendMessage(id, `📢 **رسالة عامة من الإدارة:**\n\n${ctx.message.text}`).catch(()=>{})); 
        userStates[uId] = { action: 'admin_dashboard' }; 
        return; 
    }
    if (state.action === 'await_ban_uid') { 
        if(!db.banned) db.banned = {}; db.banned[ctx.message.text] = true; saveDB(); 
        ctx.reply("✅ تم حظر الحساب بنجاح."); userStates[uId] = { action: 'admin_dashboard' }; return; 
    }
    if (state.action === 'await_unban_uid') { 
        if(db.banned) delete db.banned[ctx.message.text]; saveDB(); 
        ctx.reply("✅ تم إلغاء حظر الحساب."); userStates[uId] = { action: 'admin_dashboard' }; return; 
    }
}
module.exports = { handleAdminTexts };
