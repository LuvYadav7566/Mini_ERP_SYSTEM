import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Product from '../models/Product.js';
import StockLedger from '../models/StockLedger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Database connected for seeding...');

    // Clear existing collections
    await User.deleteMany({});
    await Product.deleteMany({});
    await StockLedger.deleteMany({});
    console.log('Cleared existing collections (Users, Products, StockLedger).');

    // Seed Users
    const users = [
      { username: 'admin', password: 'password123', role: 'Admin' },
      { username: 'sales', password: 'password123', role: 'Sales User' },
      { username: 'purchase', password: 'password123', role: 'Purchase User' },
      { username: 'manufacturing', password: 'password123', role: 'Manufacturing User' },
      { username: 'inventory', password: 'password123', role: 'Inventory Manager' },
      { username: 'owner', password: 'password123', role: 'Business Owner' },
    ];

    const seededUsers = [];
    for (const u of users) {
      const user = new User(u);
      const savedUser = await user.save();
      seededUsers.push(savedUser);
      console.log(`Seeded user: ${user.username} (${user.role})`);
    }

    const adminUser = seededUsers.find(u => u.username === 'admin');

    // Seed Products
    const mockProducts = [
      {
        sku: 'SKU-WOOD-LEG',
        name: 'Oak Wood Leg',
        description: 'Standard table leg, oak wood, 75cm height.',
        category: 'Component',
        salesPrice: 15.00,
        costPrice: 6.00,
        freeToUse: 120,
        reserved: 0,
        procurementStrategy: 'MTS',
        procureOnDemand: false,
        procurementType: 'Purchase',
        vendor: 'Apex Timber Supply',
      },
      {
        sku: 'SKU-WOOD-TOP',
        name: 'Oak Table Top (Medium)',
        description: '120x80cm oak wood tabletop, polished finishing.',
        category: 'Component',
        salesPrice: 49.99,
        costPrice: 22.50,
        freeToUse: 30,
        reserved: 0,
        procurementStrategy: 'MTS',
        procureOnDemand: false,
        procurementType: 'Purchase',
        vendor: 'Apex Timber Supply',
      },
      {
        sku: 'SKU-SCREWS-12',
        name: 'Heavy Duty Wood Screws (12pk)',
        description: '3-inch rust-resistant screws for table assembly.',
        category: 'Component',
        salesPrice: 3.50,
        costPrice: 1.20,
        freeToUse: 600,
        reserved: 0,
        procurementStrategy: 'MTS',
        procureOnDemand: false,
        procurementType: 'Purchase',
        vendor: 'Fasteners Outlet Inc.',
      },
      {
        sku: 'SKU-OAK-TABLE',
        name: 'Classic Oak Dining Table',
        description: 'Handcrafted premium oak dining table. Requires 4 legs, 1 top, and 12 screws.',
        category: 'Finished Good',
        salesPrice: 249.99,
        costPrice: 95.00,
        freeToUse: 6,
        reserved: 0,
        procurementStrategy: 'MTO',
        procureOnDemand: true,
        procurementType: 'Manufacturing',
        vendor: '',
      },
      {
        sku: 'SKU-OFFICE-CHAIR',
        name: 'Ergonomic Mesh Office Chair',
        description: 'High-back mesh task chair with lumbar support.',
        category: 'Finished Good',
        salesPrice: 119.99,
        costPrice: 55.00,
        freeToUse: 15,
        reserved: 0,
        procurementStrategy: 'MTS',
        procureOnDemand: true,
        procurementType: 'Purchase',
        vendor: 'Comfort Seating Ltd.',
      }
    ];

    for (const p of mockProducts) {
      const product = new Product(p);
      const savedProd = await product.save();
      console.log(`Seeded product: ${savedProd.sku} - ${savedProd.name}`);

      // Log initialization in Stock Ledger if freeToUse > 0
      if (savedProd.freeToUse > 0) {
        await StockLedger.create({
          product: savedProd._id,
          quantityChange: savedProd.freeToUse,
          prevOnHand: 0,
          newOnHand: savedProd.freeToUse,
          transactionType: 'System Initialization',
          referenceId: 'INITIAL_SEED',
          performedBy: adminUser._id,
          notes: `Initial database seeding of ${savedProd.name}`,
        });
      }
    }

    console.log('All seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedUsers();
