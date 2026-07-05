// ===== داخل handleCallback =====

// ===== 1️⃣ عرض الألعاب =====
if (data === "m#games") {
    const games = db.custom_store?.games || {};
    const keys = Object.keys(games);
    if (keys.length === 0) return ctx.reply("⚠️ لا توجد ألعاب!");
    const buttons = keys.map(g => [Markup.button.callback(g, `shop_cat#${g}`)]);
    buttons.push([Markup.button.callback("🔙 رجوع للمتجر", "store_back")]);
    return ctx.editMessageText("🎮 **اختر اللعبة:**", {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard(buttons)
    });
}

// ===== 2️⃣ عرض فئات اللعبة =====
if (data.startsWith("shop_cat#")) {
    const catName = data.split('#')[1];
    const list = db.custom_store?.games?.[catName] || [];
    if (list.length === 0) return ctx.reply(`⚠️ لا توجد عروض!`);
    const rawButtons = list.map(item => {
        const price = parseFloat(item.split('-')[1]) || 0;
        return Markup.button.callback(item, `buy_item#${catName}#${item}#${price}`);
    });
    let buttons = [];
    for (let i = 0; i < rawButtons.length; i += 2) buttons.push(rawButtons.slice(i, i + 2));
    buttons.push([Markup.button.callback("🔙 رجوع للألعاب", "m#games")]);
    buttons.push([Markup.button.callback("🔙 العودة للقائمة الرئيسية", "main_menu")]);
    return ctx.editMessageText(`🛒 **عروض ${catName}:**`, {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard(buttons)
    });
}

// ===== 3️⃣ شراء منتج (طلب الآيدي) =====
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
    return ctx.reply(`✍️ اكتب الآيدي (ID) الخاص بك:`, { parse_mode: 'Markdown' });
}

// ===== 4️⃣ تأكيد الشراء =====
if (data === "confirm_order") {
    const state = userStates[uId];
    if (!state || state.action !== 'confirmed') {
        return ctx.reply("❌ لا يوجد طلب مؤكد.");
    }
    const userBal = db.users?.[uId]?.balance_usd || 0;
    if (userBal < state.price) {
        return ctx.reply(`❌ رصيدك غير كافٍ!`);
    }
    db.users[uId].balance_usd = userBal - state.price;
    saveDB(db);
    userStates[uId] = null;
    const msg = `✅ **تم الشراء بنجاح!**\n🎁 المنتج: *${state.item}*\n💰 الخصم: *$${state.price}*`;
    await ctx.editMessageText(msg, { parse_mode: 'Markdown' });
    
    const adminBtn = Markup.inlineKeyboard([
        [Markup.button.callback("📤 إرسال الكود", `send_code#${uId}`)]
    ]);
    await ctx.telegram.sendMessage(config.ADMIN_CHANNEL_ID,
        `🛒 **طلب شراء جديد!**\n👤 ${ctx.from.first_name}\n🆔 \`${uId}\`\n🎁 ${state.item}\n💰 $${state.price}\n🆔 الآيدي: \`${state.gameId || 'غير محدد'}\``,
        { reply_markup: adminBtn, parse_mode: 'Markdown' }
    ).catch(() => {});
    return;
}

// ===== 5️⃣ إرسال الكود =====
if (data.startsWith("send_code#")) {
    const clientId = data.split("#")[1];
    userStates[uId] = { action: 'await_send_code', clientUId: clientId };
    return ctx.editMessageText(`✍️ اكتب الكود للمستخدم ${clientId}:`);
}

// ===== 6️⃣ العودة للمتجر =====
if (data === "store_back") {
    return ctx.editMessageText("🛍️ **اختر القسم:**", {
        parse_mode: 'Markdown',
        reply_markup: require('./menus').storeMenu
    });
}
