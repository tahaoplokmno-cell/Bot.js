const fs = require('fs');
const path = require('path');
const DB_FILE = path.join(__dirname, 'database.json');
const BACKUP_FILE = path.join(__dirname, 'database_backup.json');

function loadDB() {
    if (!fs.existsSync(DB_FILE)) {
        if (fs.existsSync(BACKUP_FILE)) {
            try { fs.writeFileSync(DB_FILE, fs.readFileSync(BACKUP_FILE, 'utf8')); } catch (e) {}
        } else {
            const initialDB = { users: {}, banned: {}, muted: {}, exchange_rate: 15000 };
            fs.writeFileSync(DB_FILE, JSON.stringify(initialDB, null, 4));
            return initialDB;
        }
    }
    try { 
        let raw = fs.readFileSync(DB_FILE, 'utf8');
        if (!raw || raw.trim() === "" || raw.trim() === "{}") throw new Error();
        let data = JSON.parse(raw);
        if (!data.users) data.users = {};
        if (!data.exchange_rate) data.exchange_rate = 15000;
        fs.writeFileSync(BACKUP_FILE, JSON.stringify(data, null, 4));
        return data;
    } catch (e) {
        return { users: {}, banned: {}, muted: {}, exchange_rate: 15000 };
    }
}

function saveDB(d) {
    try {
        if (!d || typeof d !== 'object' || !d.users) return;
        fs.writeFileSync(DB_FILE, JSON.stringify(d, null, 4));
        fs.writeFileSync(BACKUP_FILE, JSON.stringify(d, null, 4));
    } catch (e) {}
}
module.exports = { loadDB, saveDB };

