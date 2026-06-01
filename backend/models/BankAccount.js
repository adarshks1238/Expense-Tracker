import mongoose from 'mongoose';

const bankAccountSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bankName: { type: String, required: true },
    lastFiveDigits: { type: String, required: true, minlength: 5, maxlength: 5 },
    isPrimary: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('BankAccount', bankAccountSchema);
