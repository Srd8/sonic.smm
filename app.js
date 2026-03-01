const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// إعدادات API المزود
const API_KEY = "0f6bbebeeda8f1fb616a506c9fd54e10";
const API_URL = "https://kd1s.com/api/v2";

app.use(cors()); // السماح بالاتصال من الواجهة الأمامية
app.use(express.json());
app.use(express.static('public')); // لتشغيل ملفات HTML من مجلد public

// نقطة النهاية للتعامل مع طلبات SMM
app.all('/api/smm', async (req, res) => {
    try {
        const queryParams = new URLSearchParams({
            key: API_KEY,
            ...req.query,
            ...req.body
        }).toString();

        const response = await axios({
            method: req.method,
            url: `${API_URL}?${queryParams}`,
            timeout: 10000 // مهلة 10 ثوانٍ
        });

        res.json(response.data);
    } catch (error) {
        console.error("Error connecting to KD1S:", error.message);
        res.status(500).json({ error: "فشل الاتصال بالمزود الرئيسي", details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Sonic Server is running on: http://localhost:${PORT}`);
});