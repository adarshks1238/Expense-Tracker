import express from 'express';
import BankAccount from '../models/BankAccount.js';
import Expense from '../models/Expense.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get all bank accounts for a user
router.get('/', protect, async (req, res) => {
    try {
        const accounts = await BankAccount.find({ user: req.user.id }).sort({ bankName: 1 });
        
        // If there is a primary account, automatically migrate legacy expenses to it!
        const primaryAcc = accounts.find(acc => acc.isPrimary);
        if (primaryAcc) {
            const primaryLabel = `${primaryAcc.bankName} - ${primaryAcc.lastFiveDigits}`;
            await Expense.updateMany(
                { user: req.user.id, paymentMethod: { $in: ['Account', null, ''] } },
                { $set: { paymentMethod: primaryLabel } }
            );
        }
        
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add a new bank account
router.post('/', protect, async (req, res) => {
    try {
        const { bankName, lastFiveDigits } = req.body;
        
        if (!bankName || !lastFiveDigits || lastFiveDigits.length !== 5 || !/^\d{5}$/.test(lastFiveDigits)) {
            return res.status(400).json({ message: 'Invalid bank account details. Last 5 digits must be exactly 5 numeric digits.' });
        }

        const accountsCount = await BankAccount.countDocuments({ user: req.user.id });

        const account = new BankAccount({
            user: req.user.id,
            bankName,
            lastFiveDigits,
            isPrimary: accountsCount === 0 // First account becomes primary automatically
        });
        const createdAccount = await account.save();

        // If it's the primary account, instantly migrate generic expenses to it!
        if (createdAccount.isPrimary) {
            const primaryLabel = `${createdAccount.bankName} - ${createdAccount.lastFiveDigits}`;
            await Expense.updateMany(
                { user: req.user.id, paymentMethod: { $in: ['Account', null, ''] } },
                { $set: { paymentMethod: primaryLabel } }
            );
        }

        res.status(201).json(createdAccount);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete a bank account
router.delete('/:id', protect, async (req, res) => {
    try {
        const account = await BankAccount.findById(req.params.id);
        if (!account) return res.status(404).json({ message: 'Bank account not found' });
        if (account.user.toString() !== req.user.id) return res.status(401).json({ message: 'Not authorized' });

        await account.deleteOne();
        res.json({ message: 'Bank account removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Set a bank account as primary
router.put('/:id/primary', protect, async (req, res) => {
    try {
        const account = await BankAccount.findById(req.params.id);
        if (!account) return res.status(404).json({ message: 'Bank account not found' });
        if (account.user.toString() !== req.user.id) return res.status(401).json({ message: 'Not authorized' });

        // Set all user accounts isPrimary to false
        await BankAccount.updateMany({ user: req.user.id }, { isPrimary: false });

        // Set this account to true
        account.isPrimary = true;
        await account.save();

        // Migrate generic legacy expenses to this new primary account
        const primaryLabel = `${account.bankName} - ${account.lastFiveDigits}`;
        await Expense.updateMany(
            { user: req.user.id, paymentMethod: { $in: ['Account', null, ''] } },
            { $set: { paymentMethod: primaryLabel } }
        );

        // Return updated accounts list
        const accounts = await BankAccount.find({ user: req.user.id }).sort({ bankName: 1 });
        res.json(accounts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
