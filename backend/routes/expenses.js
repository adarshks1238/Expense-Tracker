import express from 'express';
import mongoose from 'mongoose';
import Expense from '../models/Expense.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get all expenses for a user
router.get('/', protect, async (req, res) => {
    try {
        const expenses = await Expense.find({ user: req.user.id }).sort({ date: -1 });
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get expense summaries for charts
router.get('/summary', protect, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        
        // Group by category for pie chart
        const categorySummary = await Expense.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(userId), type: 'debit' } },
            { $group: { _id: '$category', total: { $sum: '$amount' } } },
            { $sort: { total: -1 } }
        ]);

        // Group by month for line/bar chart
        const monthlySummary = await Expense.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(userId) } },
            { 
                $group: { 
                    _id: { 
                        month: { $month: '$date' }, 
                        year: { $year: '$date' },
                        type: '$type'
                    }, 
                    total: { $sum: '$amount' } 
                } 
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        res.json({ categorySummary, monthlySummary });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add a new expense
router.post('/', protect, async (req, res) => {
    try {
        const { amount, type, category, date, paymentMethod } = req.body;
        const expense = new Expense({
            user: req.user.id,
            amount,
            type,
            category,
            date: date || Date.now(),
            paymentMethod: paymentMethod || 'Account'
        });
        const createdExpense = await expense.save();
        res.status(201).json(createdExpense);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update an expense
router.put('/:id', protect, async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);
        if (!expense) return res.status(404).json({ message: 'Expense not found' });
        if (expense.user.toString() !== req.user.id) return res.status(401).json({ message: 'Not authorized' });

        const updatedExpense = await Expense.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(updatedExpense);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete an expense
router.delete('/:id', protect, async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);
        if (!expense) {
            return res.status(404).json({ message: 'Expense not found' });
        }
        if (expense.user.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        await expense.deleteOne();
        res.json({ message: 'Expense removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
