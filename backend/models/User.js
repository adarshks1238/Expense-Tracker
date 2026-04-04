import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { 
    type: String, 
    required: true, 
    unique: true,
    match: [/^[a-zA-Z0-9_]{4,15}$/, 'userId must be 4-15 characters and contain only letters, numbers, and underscores'] 
  },
  password: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
