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

    // Programmatically generate another 105 products to cross 100 data
    const woods = ['Teak', 'Mahogany', 'Maple', 'Pine', 'Walnut', 'Birch', 'Cherry'];
    const itemTypes = [
      { name: 'Dining Chair', category: 'Finished Good', baseCost: 30, markup: 2.2, type: 'Purchase', vendor: 'Comfort Seating Ltd.' },
      { name: 'Coffee Table', category: 'Finished Good', baseCost: 45, markup: 2.5, type: 'Manufacturing' },
      { name: 'Bookshelf', category: 'Finished Good', baseCost: 60, markup: 2.3, type: 'Manufacturing' },
      { name: 'Desk Drawer', category: 'Component', baseCost: 15, markup: 2.0, type: 'Purchase', vendor: 'Apex Timber Supply' },
      { name: 'Support Bracket', category: 'Component', baseCost: 2, markup: 2.5, type: 'Purchase', vendor: 'Fasteners Outlet Inc.' },
      { name: 'Plank (Large)', category: 'Raw Material', baseCost: 8, markup: 1.8, type: 'Purchase', vendor: 'Apex Timber Supply' },
      { name: 'Wood Polish', category: 'Other', baseCost: 4, markup: 2.0, type: 'Purchase', vendor: 'Fasteners Outlet Inc.' },
    ];

    let skuCounter = 1;
    for (let w of woods) {
      for (let type of itemTypes) {
        const costPrice = parseFloat((type.baseCost + Math.random() * 10).toFixed(2));
        const salesPrice = parseFloat((costPrice * type.markup).toFixed(2));
        const freeToUse = Math.floor(Math.random() * 80) + 10;
        
        mockProducts.push({
          sku: `SKU-${w.substring(0, 3).toUpperCase()}-${type.name.replace(/\s+/g, '-').substring(0, 5).toUpperCase()}-${String(skuCounter++).padStart(3, '0')}`,
          name: `${w} ${type.name}`,
          description: `Premium quality ${w.toLowerCase()} wood ${type.name.toLowerCase()} suitable for home and office use.`,
          category: type.category,
          salesPrice,
          costPrice,
          freeToUse,
          reserved: 0,
          procurementStrategy: type.type === 'Manufacturing' ? 'MTO' : 'MTS',
          procureOnDemand: type.type === 'Manufacturing',
          procurementType: type.type,
          vendor: type.vendor || '',
        });
      }
    }

    const materials = ['Steel', 'Glass', 'Leather', 'Aluminum', 'Brass', 'Copper', 'Plastic', 'Fabric'];
    const hardwareTypes = [
      { name: 'Handle Pull', category: 'Component', baseCost: 3.50, markup: 2.1, type: 'Purchase', vendor: 'Fasteners Outlet Inc.' },
      { name: 'Hinge Joint', category: 'Component', baseCost: 1.20, markup: 2.5, type: 'Purchase', vendor: 'Fasteners Outlet Inc.' },
      { name: 'Frame Bar', category: 'Raw Material', baseCost: 12.00, markup: 1.9, type: 'Purchase', vendor: 'Apex Timber Supply' },
      { name: 'Cushion Foam', category: 'Raw Material', baseCost: 7.00, markup: 2.0, type: 'Purchase', vendor: 'Comfort Seating Ltd.' },
      { name: 'Office Stool', category: 'Finished Good', baseCost: 25.00, markup: 2.2, type: 'Manufacturing' },
      { name: 'Side Shelf', category: 'Finished Good', baseCost: 35.05, markup: 2.4, type: 'Manufacturing' },
      { name: 'Edge Banding', category: 'Other', baseCost: 0.80, markup: 3.0, type: 'Purchase', vendor: 'Fasteners Outlet Inc.' },
    ];

    for (let m of materials) {
      for (let h of hardwareTypes) {
        const costPrice = parseFloat((h.baseCost + Math.random() * 5).toFixed(2));
        const salesPrice = parseFloat((costPrice * h.markup).toFixed(2));
        const freeToUse = Math.floor(Math.random() * 150) + 15;
        
        mockProducts.push({
          sku: `SKU-${m.substring(0, 3).toUpperCase()}-${h.name.replace(/\s+/g, '-').substring(0, 5).toUpperCase()}-${String(skuCounter++).padStart(3, '0')}`,
          name: `${m} ${h.name}`,
          description: `Durable ${m.toLowerCase()} ${h.name.toLowerCase()} design for ergonomic stability.`,
          category: h.category,
          salesPrice,
          costPrice,
          freeToUse,
          reserved: 0,
          procurementStrategy: h.type === 'Manufacturing' ? 'MTO' : 'MTS',
          procureOnDemand: h.type === 'Manufacturing',
          procurementType: h.type,
          vendor: h.vendor || '',
        });
      }
    }

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
