const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const nodemailer = require('nodemailer');

// 郵件發送配置
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: `miqaiantenna@gmail.com`,
        pass: `MiqAi1234`
    }
});

// 登入頁面
router.get('/login', (req, res) => {
    res.render('login');
});

// 登入處理
router.post('/login', async (req, res) => {
    try {
        const { id, password } = req.body;
        const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
        
        if (users.length === 0) {
            return res.status(400).json({ message: '用戶不存在' });
        }

        const isValid = await bcrypt.compare(password, users[0].password);
        if (!isValid) {
            return res.status(400).json({ message: '密碼錯誤' });
        }

        const token = jwt.sign({ id: users[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: '伺服器錯誤' });
    }
});

// 修改密碼頁面
router.get('/change-password', (req, res) => {
    res.render('change-password');
});

// 修改密碼處理
router.post('/change-password', async (req, res) => {
    try {
        const { id, oldPassword, newPassword } = req.body;
        const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
        
        if (users.length === 0) {
            return res.status(400).json({ message: '用戶不存在' });
        }

        const isValid = await bcrypt.compare(oldPassword, users[0].password);
        if (!isValid) {
            return res.status(400).json({ message: '舊密碼錯誤' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: '伺服器錯誤' });
    }
});

// 忘記密碼頁面
router.get('/forgot-password', (req, res) => {
    res.render('forgot-password');
});

// 忘記密碼處理
router.post('/forgot-password', async (req, res) => {
    try {
        const { id } = req.body;
        const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
        
        if (users.length === 0) {
            return res.status(400).json({ message: '用戶不存在' });
        }

        const mailOptions = {
            from: `miqaiantenna@gmail.com`,
            to: users[0].email,
            subject: '忘記密碼，系統發送',
            text: `您的密碼是: ${users[0].password}`
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: '伺服器錯誤' });
    }
});

// 登出
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/auth/login');
});

module.exports = router;