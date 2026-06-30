const { Markup } = require('telegraf');

const mainMenu = Markup.keyboard([
    ['🏪 المتجر'], ['💳 المحفظة', '💰 استرجاع الأموال'], ['⚙️ الإعدادات', '📞 الدعم الفني']
]).resize();

const storeMenu = Markup.inlineKeyboard([
    [Markup.button.callback("🎮 قسم الألعاب والستور", "m#games")], 
    [Markup.button.callback("🎟️ قسم البطاقات الرقمية", "m#cards")], 
    [Markup.button.callback("🤖 إنشاء وتصميم بوت خاص", "bot_order#start")]
]);

const walletMenu = Markup.inlineKeyboard([
    [Markup.button.callback("💵 شحن بالدولار", "ch#usd"), Markup.button.callback("🇸🇾 شحن بالليرة السورية", "ch#syr")]
]);

module.exports = { mainMenu, storeMenu, walletMenu };
