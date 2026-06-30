const dbMod = require('./database');
const { Markup } = require('telegraf');

const mainMenu = Markup.keyboard([['🏪 المتجر'], ['💳 المحفظة', '💰 استرجاع الأموال'], ['⚙️ الإعدادات', '📞 الدعم الفني']]).resize();
const storeMenu = Markup.inlineKeyboard([[Markup.button.callback("🎮 قسم الألعاب والستور", "m#games")]]);
const walletMenu = Markup.inlineKeyboard([[Markup.button.callback("💵 شحن الرصيد", "ch#usd")]]);

function generateAdminPanelInline() {
    return Markup.inlineKeyboard([[Markup.button.callback("📊 إحصائيات النظام", "srv#system_stats")]]);
}

async function handleAdminCallbacks(ctx, bot, db, config) {
    const data = ctx.callbackQuery.data;
    if (data === 'srv#system_stats') {
        let stats = `📊 الزبائن: *${db.users ? Object.keys(db.users).length : 0}*\n📈 الصرف: *${db.exchange_rate || 15000} ل.س*`;
        return ctx.reply(stats, { parse_mode: 'Markdown' });
    }
    return null;
}
module.exports = { generateAdminPanelInline, handleAdminCallbacks, mainMenu, storeMenu, walletMenu };
