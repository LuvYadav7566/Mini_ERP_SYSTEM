import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Database connected for seeding...');

    // Clear existing users
    await User.deleteMany({});
    console.log('Cleared existing users.');

    const users = [
      { username: 'admin', password: 'password123', role: 'Admin' },
      { username: 'sales', password: 'password123', role: 'Sales User' },
      { username: 'purchase', password: 'password123', role: 'Purchase User' },
      { username: 'manufacturing', password: 'password123', role: 'Manufacturing User' },
      { username: 'inventory', password: 'password123', role: 'Inventory Manager' },
      { username: 'owner', password: 'password123', role: 'Business Owner' },
    ];

    for (const u of users) {
      const user = new User(u);
      await user.save();
      console.log(`Seeded user: ${user.username} (${user.role})`);
    }

    console.log('All seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedUsers();
