import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Expense from '../models/Expense.js';
import Category from '../models/Category.js';
import BankAccount from '../models/BankAccount.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/check-userid', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!/^[a-zA-Z0-9_]{4,15}$/.test(userId)) {
            return res.json({ available: false, message: 'Invalid format' });
        }
        const user = await User.findOne({ userId });
        res.json({ available: !user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/register', async (req, res) => {
    try {
        const { name, userId, password } = req.body;
        if (!userId || !/^[a-zA-Z0-9_]{4,15}$/.test(userId)) {
             return res.status(400).json({ message: 'Invalid User ID format' });
        }
        let user = await User.findOne({ userId });
        if (user) {
            return res.status(400).json({ message: 'User ID already exists' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user = new User({ name, userId, password: hashedPassword });
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.status(201).json({ token, user: { id: user._id, name, userId } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { userId, password } = req.body;
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, user: { id: user._id, name: user.name, userId } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/me', protect, (req, res) => {
    res.json(req.user);
});

router.delete('/me', protect, async (req, res) => {
    try {
        // Delete all data associated with the user
        await Expense.deleteMany({ user: req.user.id });
        await Category.deleteMany({ user: req.user.id });
        await BankAccount.deleteMany({ user: req.user.id });
        await User.findByIdAndDelete(req.user.id);
        res.json({ message: 'Profile deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
