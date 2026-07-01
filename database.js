const fs = require('fs');
const path = require('path');
const DB_FILE = path.join(__dirname, 'database.json');
const BACKUP_FILE = path.join(__dirname, 'database_backup.json');

function loadDB() {
    if (!fs.existsSync(DB_FILE) && fs.existsSync(BACKUP_FILE)) {
        try { fs.writeFileSync(DB_FILE, fs.readFileSync(BACKUP_FILE, 'utf8')); } catch (e) {}
    }
    try { 
        let raw = fs.readFileSync(DB_FILE, 'utf8');
        if (!raw || raw.trim() === "" || raw.trim() === "{}") {
            if (fs.existsSync(BACKUP_FILE)) raw = fs.readFileSync(BACKUP_FILE, 'utf8');
        }
        let data = JSON.parse(raw);
        if (!data.users) data.users = {};
        if (!data.banned) data.banned = {};
        if (!data.exchange_rate) data.exchange_rate = 14500;
        return data;
    } catch (e) {
        return { users: {}, banned: {}, exchange_rate: 14500 };
    }
}

function saveDB(d) {
    try {
        if (!d || typeof d !== 'object' || !d.users) return;
        const rawData = JSON.stringify(d, null, 4);
        fs.writeFileSync(DB_FILE, rawData);
        fs.writeFileSync(BACKUP_FILE, rawData); // حفظ فوري في النسخة الاحتياطية لحماية الفلوس
    } catch (e) {}
}

module.exports = { loadDB, saveDB };
