const { Markup } = require('telegraf');

const mainMenu = Markup.keyboard([
    ['🏪 المتجر'],
    ['💳 المحفظة', '💰 استرجاع الأموال'],
    ['⚙️ الإعدادات', '📞 الدعم الفني']
]).resize();

const storeMenu = Markup.inlineKeyboard([
    [Markup.button.callback("🎮 ببجي - 60 شدة (1$)", "buy#ببجي موبايل#60 شدة - 1.00$#1.00")],
    [Markup.button.callback("🎮 ببجي - 325 شدة (5$)", "buy#ببجي موبايل#325 شدة - 5.00$#5.00")],
    [Markup.button.callback("🎮 ببجي - 660 شدة (10$)", "buy#ببجي موبايل#660 شدة - 10.00$#10.00")],
    [Markup.button.callback("🎮 ببجي - 1800 شدة (25$)", "buy#ببجي موبايل#1800 شدة - 25.00$#25.00")],
    [Markup.button.callback("🔥 فري فاير - 100 دايموند (2$)", "buy#فري فاير#100 دايموند - 2.00$#2.00")],
    [Markup.button.callback("🔥 فري فاير - 200 دايموند (4$)", "buy#فري فاير#200 دايموند - 4.00$#4.00")],
    [Markup.button.callback("🔥 فري فاير - 400 دايموند (7$)", "buy#فري فاير#400 دايموند - 7.00$#7.00")],
    [Markup.button.callback("🎮 روبلوكس - 100 روبوكس (1.5$)", "buy#روبلوكس#100 روبوكس - 1.50$#1.50")],
    [Markup.button.callback("🎮 روبلوكس - 500 روبوكس (6$)", "buy#روبلوكس#500 روبوكس - 6.00$#6.00")],
    [Markup.button.callback("🎮 روبلوكس - 1000 روبوكس (11$)", "buy#روبلوكس#1000 روبوكس - 11.00$#11.00")],
    [Markup.button.callback("🎟️ ستيم - 5$ (5.5$)", "buy#بطاقات ستيم#فئة 5$ - 5.50$#5.50")],
    [Markup.button.callback("🎟️ ستيم - 10$ (11$)", "buy#بطاقات ستيم#فئة 10$ - 11.00$#11.00")],
    [Markup.button.callback("🎟️ إكس بوكس - 10$ (10.5$)", "buy#بطاقات إكس بوكس#فئة 10$ - 10.50$#10.50")],
    [Markup.button.callback("🎟️ إكس بوكس - 25$ (26$)", "buy#بطاقات إكس بوكس#فئة 25$ - 26.00$#26.00")],
    [Markup.button.callback("📱 شحن رصيد هاتف", "m#phone")],
    [Markup.button.callback("🤖 إنشاء بوت", "bot_order#start")],
    [Markup.button.callback("🔙 العودة للقائمة الرئيسية", "main_menu")]
]);

module.exports = { mainMenu, storeMenu };
