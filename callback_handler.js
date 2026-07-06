const { Markup } = require('telegraf');

module.exports = async function handleCallback(ctx, bot, db, userStates, saveDB) {
    const data = ctx.callbackQuery.data;
    const uId = String(ctx.from.id);
    await ctx.answerCbQuery().catch(() => {});

    // القائمة الرئيسية
    if (data === "main_menu") {
        const mainMenu = Markup.keyboard([
            ['🏪 المتجر'],
            ['💳 المحفظة', '💰 استرجاع الأموال'],
            ['⚙️ الإعدادات', '📞 الدعم الفني']
        ]).resize();
        return ctx.editMessageText("🎯 **القائمة الرئيسية**", {
            parse_mode: 'Markdown',
            reply_markup: mainMenu
        });
    }

    // عرض الألعاب
    if (data === "m#games") {
        const games = db.custom_store?.games || {};
        const keys = Object.keys(games);
        if (keys.length === 0) return ctx.reply("⚠️ لا توجد ألعاب!");
        const buttons = keys.map(g => [Markup.button.callback(g, `shop_cat#${g}`)]);
        buttons.push([Markup.button.callback("🔙 العودة للقائمة الرئيسية", "main_menu")]);
        return ctx.editMessageText("🎮 **اختر اللعبة:**", {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard(buttons)
        });
    }

    // عرض عروض اللعبة
    if (data.startsWith("shop_cat#")) {
        const catName = data.split('#')[1];
        const list = db.custom_store?.games?.[catName] || [];
        if (list.length === 0) return ctx.reply(`⚠️ لا توجد عروض!`);

        const rawButtons = list.map(item => {
            const price = parseFloat(item.split('-')[1]) || 0;
            return Markup.button.callback(item, `buy_item#${catName}#${item}#${price}`);
        });

        let buttons = [];
        for (let i = 0; i < rawButtons.length; i += 2) {
            buttons.push(rawButtons.slice(i, i + 2));
        }
        buttons.push([Markup.button.callback("🔙 رجوع للألعاب", "m#games")]);
        buttons.push([Markup.button.callback("🔙 العودة للقائمة الرئيسية", "main_menu")]);

        return ctx.editMessageText(`🛒 **عروض ${catName}:**`, {
            parse_mode: 'Markdown',
            reply_markup: Markup.inlineKeyboard(buttons)
        });
    }

    // شراء منتج (طلب الآيدي)
    if (data.startsWith("buy_item#")) {
        const parts = data.split('#');
        const catName = parts[1];
        const item = parts[2];
        const price = parseFloat(parts[3]) || 0;
        const userBal = db.users[uId]?.balance_usd || 0;

        if (userBal < price) {
            return ctx.reply(`❌ رصيدك ($${userBal.toFixed(2)}) لا يكفي!`);
        }

        userStates[uId] = {
            type: 'game',
            name: catName,
            item,
            price,
            action: 'await_game_id'
        };

        return ctx.reply(`✍️ اكتب الآيدي (ID) الخاص بك:`, {
            parse_mode: 'Markdown'
        });
    }

    // تأكيد الشراء
    if (data === "confirm_order") {
        const state = userStates[uId];
        if (!state || state.action !== 'confirmed') {
            return ctx.reply("❌ لا يوجد طلب مؤكد.");
        }

        const userBal = db.users?.[uId]?.balance_usd || 0;
        if (userBal < state.price) {
            return ctx.reply(`❌ رصيدك غير كافٍ! المطلوب $${state.price}`);
        }

        db.users[uId].balance_usd = userBal - state.price;
        saveDB(db);
        userStates[uId] = null;

        const msg = `✅ **تم الشراء بنجاح!**\n🎁 المنتج: *${state.item}*\n💰 الخصم: *$${state.price}*`;
        await ctx.editMessageText(msg, { parse_mode: 'Markdown' });

        const adminBtn = Markup.inlineKeyboard([
            [Markup.button.callback("📤 إرسال الكود للزبون", `send_code#${uId}`)]
        ]);
        await bot.telegram.sendMessage(process.env.ADMIN_CHANNEL_ID || '-1004479419959',
            `🛒 **طلب شراء جديد!**\n👤 ${ctx.from.first_name}\n🆔 \`${uId}\`\n🎁 ${state.item}\n💰 $${state.price}\n🆔 الآيدي: \`${state.gameId || 'غير محدد'}\``,
            { reply_markup: adminBtn, parse_mode: 'Markdown' }
        ).catch(() => {});
        return;
    }

    // إرسال الكود للزبون
    if (data.startsWith("send_code#")) {
        const clientId = data.split("#")[1];
        userStates[uId] = { action: 'await_send_code', clientUId: clientId };
        return ctx.editMessageText(`✍️ اكتب الكود الذي تريد إرساله للمستخدم ${clientId}:`);
    }

    return ctx.reply("⚠️ هذا الزر غير مفعل حالياً.");
};
