const { Markup } = require('telegraf');
const config = require('./config');
const menus = require('./menus');
const admin = require('./admin');
const custom = require('./custom_items');

async function handleCallbacks(ctx, bot, db, userStates, saveDB) {
    const data = ctx.callbackQuery.data; const uId = String(ctx.from.id);
    const rate = db.exchange_rate || 15000;

    if (data.startsWith("adm#")) {
        let act = data.split('#')[1];
        if (act === "close_panel") return ctx.deleteMessage().catch(()=>{});
        if (act === "get_backup") return ctx.replyWithDocument({ source: './database.json', filename: 'database.json' }).catch(()=>{});
        if (act === "edit_rate") { userStates[uId] = { action: 'adm_await_rate' }; return ctx.reply("📈 أرسل سعر الصرف الجديد بالليرة فوراً:"); }
        if (act === "broadcast") { userStates[uId] = { action: 'adm_await_broadcast' }; return ctx.reply("📢 اكتب نص الإذاعة العامة لجميع الزبائن:"); }
        if (act === "manage_user") { userStates[uId] = { action: 'adm_await_user_check' }; return ctx.reply("👤 أرسل آيدي الزبون لعرض رصيده وبياناته ومراقبته:"); }
        if (act === "gift_user") { userStates[uId] = { action: 'adm_await_gift' }; return ctx.reply("🎁 أرسل: الآيدي#المبلغ بالدولار لشحن محفظته فوراً:"); }
        if (act === "ban_user") { userStates[uId] = { action: 'adm_await_ban' }; return ctx.reply("🚫 أرسل آيدي الشخص لحظره نهائياً من السيستم:"); }
        if (act === "unban_user") { userStates[uId] = { action: 'adm_await_unban' }; return ctx.reply("🔓 أرسل آيدي الشخص لفك الحظر عنه:"); }
        if (act === "mute_user") { userStates[uId] = { action: 'adm_await_mute' }; return ctx.reply("🔇 أرسل آيدي الشخص لكتمه التام من المحادثة:"); }
        if (act === "unmute_user") { userStates[uId] = { action: 'adm_await_unmute' }; return ctx.reply("🔊 أرسل آيدي الشخص لفك الكتم الأمني:"); }
        if (act === "add_item_live") { userStates[uId] = { action: 'adm_await_add' }; return ctx.reply("➕ اكتب اسم المنتج الجديد والسعر (شدات ببجي#5$):"); }
        if (act === "del_item_live") { userStates[uId] = { action: 'adm_await_del' }; return ctx.reply("🗑️ اكتب اسم المنتج المراد إبادته وحذفه نهائياً:"); }
        if (act === "discount_item") { userStates[uId] = { action: 'adm_await_disc' }; return ctx.reply("🎯 اكتب اسم اللعبة ونسبة الخصم (ببجي#10%):"); }
        if (act === "edit_welcome_txt") { userStates[uId] = { action: 'adm_await_txt' }; return ctx.reply("📝 اكتب الرسالة الترحيبية الجديدة بالكامل:"); }
        if (act === "zero_balance") { Object.keys(db.users || {}).forEach(id => { db.users[id].balance_usd = 0; }); saveDB(); return ctx.reply("💀 تم تصفير محفظة وأرصدة جميع الزبائن في المتجر بنجاح جعلها (0$)!"); }
        if (act === "view_logs") { return ctx.reply("📋 جميع الطلبات والعمليات السابقة مستقرة ومحفوظة بالكامل داخل قناة الإدارة الخاصة بك."); }
    }
    return false;
}
module.exports = { handleCallbacks };

