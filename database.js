const fs = require('fs');
const path = require('path');
const DB_FILE = path.join(__dirname, 'database.json');
const BACKUP_FILE = path.join(__dirname, 'database_backup.json');

function loadDB() {
    // 1. إذا كان الملف الرئيسي مفقوداً تماماً ولكن النسخة الاحتياطية موجودة، نقوم باسترجاعها فوراً
    if (!fs.existsSync(DB_FILE) && fs.existsSync(BACKUP_FILE)) {
        try { 
            fs.writeFileSync(DB_FILE, fs.readFileSync(BACKUP_FILE, 'utf8')); 
        } catch (e) {
            console.error("❌ فشل نقل النسخة الاحتياطية إلى الملف الرئيسي:", e);
        }
    }

    let raw = "";
    
    // 2. محاولة قراءة الملف الرئيسي بأمان
    try { 
        if (fs.existsSync(DB_FILE)) {
            raw = fs.readFileSync(DB_FILE, 'utf8');
        }
        
        // إذا كان الملف فارغاً أو تالفاً، نحاول سحب البيانات من النسخة الاحتياطية كخط دفاع ثانٍ
        if (!raw || raw.trim() === "" || raw.trim() === "{}") {
            if (fs.existsSync(BACKUP_FILE)) {
                raw = fs.readFileSync(BACKUP_FILE, 'utf8');
            }
        }

        let data = JSON.parse(raw);
        
        // تأمين القوائم الأساسية لكي لا تتصفر
        if (!data.users) data.users = {};
        if (!data.banned) data.banned = {};
        if (!data.muted) data.muted = {};
        if (!data.exchange_rate) data.exchange_rate = 14500;
        
        return data;

    } catch (e) {
        console.error("⚠️ حدث تلف في الملف الرئيسي، جاري محاولة القراءة من النسخة الاحتياطية لحماية الأموال...", e);
        
        // 3. خط الدفاع الأخير: إذا تلف الـ JSON تماماً، نجبره على قراءة الباك اب ولا نرجع كائناً فارغاً يصفر الحسابات
        try {
            if (fs.existsSync(BACKUP_FILE)) {
                let backupRaw = fs.readFileSync(BACKUP_FILE, 'utf8');
                let backupData = JSON.parse(backupRaw);
                if (!backupData.users) backupData.users = {};
                return backupData;
            }
        } catch (backupError) {
            console.error("❌ حتى النسخة الاحتياطية تالفة أو غير موجودة:", backupError);
        }

        // إذا دمرت كل الملفات تماماً (حالة نادرة جداً)، نرجع البنية الأساسية
        return { users: {}, banned: {}, muted: {}, exchange_rate: 14500 };
    }
}

function saveDB(d) {
    try {
        if (!d || typeof d !== 'object' || !d.users) return;
        const rawData = JSON.stringify(d, null, 4);
        
        // الحفظ في الملف الحقيقي وفي الباك أب في نفس اللحظة للحماية القصوى
        fs.writeFileSync(DB_FILE, rawData, 'utf8');
        fs.writeFileSync(BACKUP_FILE, rawData, 'utf8'); 
    } catch (e) {
        console.error("❌ فشل في حفظ قاعدة البيانات على القرص:", e);
    }
}

module.exports = { loadDB, saveDB };
