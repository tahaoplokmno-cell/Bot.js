const fs = require('fs');
const path = require('path');
const DB_FILE = path.join(__dirname, 'database.json');
const BACKUP_FILE = path.join(__dirname, 'database_backup.json');

// ===== البيانات الافتراضية (بدون ألعاب، لأن الأزرار مباشرة) =====
const DEFAULT_DATA = {
    users: {},
    banned: {},
    muted: {},
    exchange_rate: 14500,
    admin_notes: "",
    bot_maintenance: false,
    custom_store: {
        games: {}  // 🔥 فاضي لأن الأزرار مباشرة وما بتحتاج كتالوج
    },
    orders: [],
    bot_orders: [],
    installments: [],
    products: []
};

function loadDB() {
    if (!fs.existsSync(DB_FILE) && fs.existsSync(BACKUP_FILE)) {
        try {
            fs.writeFileSync(DB_FILE, fs.readFileSync(BACKUP_FILE, 'utf8'));
        } catch (e) {
            console.error("❌ فشل استعادة النسخة الاحتياطية:", e);
        }
    }

    let raw = "";
    try {
        if (fs.existsSync(DB_FILE)) {
            raw = fs.readFileSync(DB_FILE, 'utf8');
        }
        if (!raw || raw.trim() === "" || raw.trim() === "{}") {
            if (fs.existsSync(BACKUP_FILE)) {
                raw = fs.readFileSync(BACKUP_FILE, 'utf8');
            }
        }

        let data = JSON.parse(raw);

        for (let key in DEFAULT_DATA) {
            if (!data[key]) {
                data[key] = DEFAULT_DATA[key];
            }
        }

        if (!data.custom_store) data.custom_store = { games: {} };

        return data;

    } catch (e) {
        console.error("⚠️ تلف في الملف، جاري استخدام البيانات الافتراضية:", e);
        return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
}

function saveDB(d) {
    try {
        if (!d || typeof d !== 'object' || !d.users) return;

        if (!d.custom_store) d.custom_store = { games: {} };

        const rawData = JSON.stringify(d, null, 4);
        fs.writeFileSync(DB_FILE, rawData, 'utf8');
        fs.writeFileSync(BACKUP_FILE, rawData, 'utf8');
    } catch (e) {
        console.error("❌ فشل حفظ قاعدة البيانات:", e);
    }
}

module.exports = { loadDB, saveDB };
