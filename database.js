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
        
        // ===== تأمين القوائم الأساسية =====
        if (!data.users) data.users = {};
        if (!data.banned) data.banned = {};
        if (!data.muted) data.muted = {};
        if (!data.exchange_rate) data.exchange_rate = 14500;
        if (!data.admin_notes) data.admin_notes = "";
        if (data.bot_maintenance === undefined) data.bot_maintenance = false;
        if (!data.custom_store) data.custom_store = { games: {} };
        
        // ===== الحقول الجديدة للوحة الخارقة =====
        if (!data.orders) data.orders = [];
        if (!data.bot_orders) data.bot_orders = [];
        if (!data.installments) data.installments = [];
        if (!data.products) data.products = [];
        
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

        // إذا دمرت كل الملفات تماماً (حالة نادرة جداً)، نرجع البنية الأساسية مع الحقول الجديدة
        return { 
            users: {}, 
            banned: {}, 
            muted: {}, 
            exchange_rate: 14500,
            admin_notes: "",
            bot_maintenance: false,
            custom_store: { games: {} },
            orders: [],
            bot_orders: [],
            installments: [],
            products: []
        };
    }
}

function saveDB(d) {
    try {
        if (!d || typeof d !== 'object' || !d.users) return;
        
        // ===== التأكد من وجود جميع الحقول الجديدة قبل الحفظ =====
        if (!d.orders) d.orders = [];
        if (!d.bot_orders) d.bot_orders = [];
        if (!d.installments) d.installments = [];
        if (!d.products) d.products = [];
        if (!d.custom_store) d.custom_store = { games: {} };
        if (d.bot_maintenance === undefined) d.bot_maintenance = false;
        if (!d.admin_notes) d.admin_notes = "";
        
        const rawData = JSON.stringify(d, null, 4);
        
        // الحفظ في الملف الحقيقي وفي الباك أب في نفس اللحظة للحماية القصوى
        fs.writeFileSync(DB_FILE, rawData, 'utf8');
        fs.writeFileSync(BACKUP_FILE, rawData, 'utf8'); 
    } catch (e) {
        console.error("❌ فشل في حفظ قاعدة البيانات على القرص:", e);
    }
}

module.exports = { loadDB, saveDB };
