import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from './models/Category.js';

dotenv.config();

const cleanDupes = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const categories = await Category.find({});
        
        const unique = new Set();
        const duplicates = [];

        for (const cat of categories) {
            const key = `${cat.user.toString()}-${cat.name}`;
            if (unique.has(key)) {
                duplicates.push(cat._id);
            } else {
                unique.add(key);
            }
        }

        if (duplicates.length > 0) {
            await Category.deleteMany({ _id: { $in: duplicates } });
            console.log(`Removed ${duplicates.length} duplicate categories.`);
        } else {
            console.log('No duplicates found.');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

cleanDupes();
