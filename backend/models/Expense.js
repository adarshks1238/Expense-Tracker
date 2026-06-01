import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    date: { type: Date, required: true, default: Date.now },
    category: { type: String, required: true },
    paymentMethod: { type: String, required: true, default: 'Account' },
}, { timestamps: true });

export default mongoose.model('Expense', expenseSchema);
