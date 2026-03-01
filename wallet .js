const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- إعدادات API المزود الرئيسي ---
const API_KEY = "0f6bbebeeda8f1fb616a506c9fd54e10";
const API_URL = "https://kd1s.com/api/v2";

// --- إعداد قاعدة البيانات المصغرة (ملف JSON) ---
const DB_PATH = path.join(__dirname, 'database.json');

// دالة لجلب البيانات أو إنشاء ملف جديد إذا لم يوجد
function getDB() {
    if (!fs.existsSync(DB_PATH)) {
        const initialData = { 
            users: { "user123": { balance: 0, name: "عميل سونيك" } }, 
            cards: {} 
        };
        fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
        return initialData;
    }
    return JSON.parse(fs.readFileSync(DB_PATH));
}

// دالة لحفظ التغييرات في الملف
function saveDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // لتشغيل واجهة المستخدم من مجلد public

// ------------------------------------------------
// 1. مسارات الإدارة (Admin) - لتوليد الأكواد
// ------------------------------------------------

// توليد كود شحن جديد
app.post('/api/admin/generate', (req, res) => {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: "المبلغ غير صحيح" });

    const db = getDB();
    // إنشاء كود فريد
    const randomID = Math.random().toString(36).substring(2, 8).toUpperCase();
    const cardCode = `SONIC-${amount}USD-${randomID}`;
    
    db.cards[cardCode] = parseFloat(amount);
    saveDB(db);

    console.log(`✅ تم إنشاء كود جديد: ${cardCode} بقيمة $${amount}`);
    res.json({ success: true, code: cardCode, amount: amount });
});

// عرض جميع الكروت المتوفرة
app.get('/api/admin/cards', (req, res) => {
    const db = getDB();
    res.json(db.cards);
});

// ------------------------------------------------
// 2. مسارات المستخدم (User) - الرصيد والطلب
// ------------------------------------------------

// جلب رصيد المستخدم
app.get('/api/user/balance', (req, res) => {
    const db = getDB();
    res.json(db.users["user123"]);
});

// شحن الرصيد باستخدام كود
app.post('/api/user/recharge', (req, res) => {
    const { code } = req.body;
    const db = getDB();

    if (db.cards[code]) {
        const amount = db.cards[code];
        db.users["user123"].balance += amount;
        delete db.cards[code]; // حذف الكود لضمان استخدامه مرة واحدة فقط
        saveDB(db);
        return res.json({ success: true, message: `تم شحن $${amount} بنجاح في محفظتك!` });
    }
    res.status(400).json({ success: false, message: "عذراً، هذا الكود غير صحيح أو تم استخدامه سابقاً." });
});

// تنفيذ طلب وخصم الرصيد
app.post('/api/order/place', async (req, res) => {
    const { service, link, quantity, totalCost } = req.body;
    const db = getDB();
    const user = db.users["user123"];

    // التأكد من الرصيد المحلي أولاً
    if (user.balance < totalCost) {
        return res.status(400).json({ error: "رصيدك الحالي لا يكفي لإتمام هذه العملية." });
    }

    try {
        const query = new URLSearchParams({
            key: API_KEY,
            action: 'add',
            service, link, quantity
        }).toString();

        const response = await axios.get(`${API_URL}?${query}`);

        if (response.data.order) {
            // خصم المبلغ من الرصيد المحلي وحفظ البيانات
            user.balance -= parseFloat(totalCost);
            saveDB(db);
            res.json({ success: true, order: response.data.order });
        } else {
            res.status(400).json({ error: response.data.error || "فشل الطلب من المزود الرئيسي." });
        }
    } catch (err) {
        res.status(500).json({ error: "خطأ في الاتصال بسيرفر المزود." });
    }
});

// جلب الخدمات (Proxy)
app.get('/api/services', async (req, res) => {
    try {
        const response = await axios.get(`${API_URL}?key=${API_KEY}&action=services`);
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: "فشل في جلب قائمة الخدمات." });
    }
});

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`
    =============================================
    🚀 سيرفر سونيك المتكامل يعمل الآن!
    🌐 رابط الموقع: http://localhost:${PORT}
    🛡️ لوحة الإدارة مدمجة: http://localhost:${PORT}/admin.html
    📂 قاعدة البيانات: database.json
    =============================================
    `);
});