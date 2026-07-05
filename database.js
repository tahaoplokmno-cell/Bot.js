const fs = require('fs');
const path = require('path');
const DB_FILE = path.join(__dirname, 'database.json');
const BACKUP_FILE = path.join(__dirname, 'database_backup.json');

const DEFAULT_DATA = {
    users: {},
    banned: {},
    muted: {},
    exchange_rate: 14500,
    admin_notes: "",
    bot_maintenance: false,
    custom_store: {
        games: {
            "🎮 ببجي موبايل": ["60 شدة - 1.20$", "325 شدة - 5.00$", "660 شدة - 10.00$", "1800 شدة - 25.00$"],
            "🔥 فري فاير": ["100 دايموند - 2.00$", "200 دايموند - 4.00$", "400 دايموند - 7.00$"],
            "🎮 روبلوكس": ["100 روبوكس - 1.50$", "500 روبوكس - 6.00$", "1000 روبوكس - 11.00$"],
            "🎟️ بطاقات ستيم": ["فئة 5$ - 5.50$", "فئة 10$ - 11.00$"],
            "🎟️ بطاقات إكس بوكس": ["فئة 10$ - 10.50$", "فئة 25$ - 26.00$"]
        }
    },
    orders: [],
    bot_orders: [],
    installments: [],
    products: []
};

function loadDB() {
    if (!fs.existsSync(DB_FILE) && fs.existsSync(BACKUP_FILE)) {
        try { fs.writeFileSync(DB_FILE, fs.readFileSync(BACKUP_FILE, 'utf8')); } catch (e) {}
    }
    let raw = "";
    try {
        if (fs.existsSync(DB_FILE)) raw = fs.readFileSync(DB_FILE, 'utf8');
        if (!raw || raw.trim() === "" || raw.trim() === "{}") {
            if (fs.existsSync(BACKUP_FILE)) raw = fs.readFileSync(BACKUP_FILE, 'utf8');
        }
        let data = JSON.parse(raw);
        for (let key in DEFAULT_DATA) {
            if (!data[key]) data[key] = DEFAULT_DATA[key];
        }
        if (!data.custom_store) data.custom_store = { games: {} };
        if (Object.keys(data.custom_store.games).length === 0) {
            data.custom_store.games = DEFAULT_DATA.custom_store.games;
        }
        return data;
    } catch (e) {
        return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
}

function saveDB(d) {
    try {
        if (!d || typeof d !== 'object' || !d.users) return;
        if (!d.custom_store) d.custom_store = { games: {} };
        if (Object.keys(d.custom_store.games).length === 0) {
            d.custom_store.games = DEFAULT_DATA.custom_store.games;
        }
        const rawData = JSON.stringify(d, null, 4);
        fs.writeFileSync(DB_FILE, rawData, 'utf8');
        fs.writeFileSync(BACKUP_FILE, rawData, 'utf8');
    } catch (e) {}
}

module.exports = { loadDB, saveDB };
