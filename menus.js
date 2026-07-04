const { Markup } = require('telegraf');

const mainMenu = Markup.keyboard([
    ['🏪 المتجر'], 
    ['💳 المحفظة', '💰 استرجاع الأموال'], 
    ['⚙️ الإعدادات', '📞 الدعم الفني']
]).resize();

const storeMenu = Markup.inlineKeyboard([
    [Markup.button.callback("🎮 قسم الألعاب", "m#games")],
    [Markup.button.callback("🎟️ بطاقات ستيم وإكس بوكس", "m#cards")],
    [Markup.button.callback("📱 شحن رصيد هاتف", "m#phone")],
    [Markup.button.callback("🤖 إنشاء بوت", "bot_order#start")]
]);

const walletMenu = Markup.inlineKeyboard([
    [Markup.button.callback("💵 شحن بالدولار", "ch#usd"), 
     Markup.button.callback("🇸🇾 شحن بالليرة", "ch#syr")]
]);

const chargeValuesMenu = Markup.inlineKeyboard([
    [Markup.button.callback("فئة 5$", "amt#5"), Markup.button.callback("فئة 10$", "amt#10")],
    [Markup.button.callback("فئة 20$", "amt#20"), Markup.button.callback("فئة 50$", "amt#50")]
]);

const chargeSyrMenu = Markup.inlineKeyboard([
    [Markup.button.callback("فئة 50,000 ل.س", "amts#50000")],
    [Markup.button.callback("فئة 100,000 ل.س", "amts#100000")],
    [Markup.button.callback("فئة 200,000 ل.س", "amts#200000")]
]);

module.exports = { mainMenu, storeMenu, walletMenu, chargeValuesMenu, chargeSyrMenu };
