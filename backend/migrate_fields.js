const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://sabarishthavamani:admin123@cluster0.he0egyn.mongodb.net/Spa_CRM_Staging';

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const Expense = mongoose.model('Expense', new mongoose.Schema({
      category: String,
      sectorCategory: String
    }, { strict: false }));

    const Inventory = mongoose.model('Inventory', new mongoose.Schema({
      category: String,
      sectorCategory: String
    }, { strict: false }));

    // 1. Migrate Expenses
    const expensesToUpdate = await Expense.find({ category: { $exists: true }, sectorCategory: { $exists: false } });
    console.log(`Found ${expensesToUpdate.length} expenses to migrate`);
    
    for (const doc of expensesToUpdate) {
      await Expense.updateOne(
        { _id: doc._id },
        { 
          $set: { sectorCategory: doc.category },
          $unset: { category: "" }
        }
      );
    }
    console.log('Expense migration complete');

    // 2. Migrate Inventories
    const itemsToUpdate = await Inventory.find({ category: { $exists: true }, sectorCategory: { $exists: false } });
    console.log(`Found ${itemsToUpdate.length} inventory items to migrate`);
    
    for (const doc of itemsToUpdate) {
      await Inventory.updateOne(
        { _id: doc._id },
        { 
          $set: { sectorCategory: doc.category },
          $unset: { category: "" }
        }
      );
    }
    console.log('Inventory migration complete');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrate();
