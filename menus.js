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
    [Markup.button.callback("🤖 إنشاء بوت", "bot_order#start")],
    [Markup.button.callback("🔙 العودة للقائمة الرئيسية", "main_menu")]
]);

module.exports = { mainMenu, storeMenu };
