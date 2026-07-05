const config = require('./config');
const { Markup } = require('telegraf');

const backBtn = Markup.inlineKeyboard([[Markup.button.callback("🔙 العودة للقائمة الرئيسية", "main_menu")]]);

function showSettings(ctx) {
    let msg = `⚙️ **الإعدادات:**\n━━━━━━━━━━━━━━━━━━━━\n👤 الاسم: ${ctx.from.first_name}\n🆔 الآيدي: \`${ctx.chat.id}\`\n📈 سعر الصرف: *${global.db?.exchange_rate || 14500} ل.س*\n━━━━━━━━━━━━━━━━━━━━\n📌 استخدم الآيدي عند التواصل مع الدعم.`;
    ctx.reply(msg, { parse_mode: 'Markdown', ...backBtn });
}

function showSupport(ctx) {
    let msg = `📞 **الدعم الفني:**\n━━━━━━━━━━━━━━━━━━━━\nللتواصل مع المطور:\n${config.DEVELOPER_USERNAME || '@MrXT1_3'}\n\n⏱️ متواجدون لخدمتكم! ❤️`;
    ctx.reply(msg, { parse_mode: 'Markdown', ...backBtn });
}

module.exports = { showSettings, showSupport };
