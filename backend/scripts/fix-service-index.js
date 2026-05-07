require('dotenv').config();
const mongoose = require('mongoose');

async function fixIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('services');

    console.log('Checking indexes on "services" collection...');
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(i => i.name));

    if (indexes.find(i => i.name === 'name_1')) {
      console.log('Dropping index "name_1"...');
      await collection.dropIndex('name_1');
      console.log('Successfully dropped "name_1"');
    } else {
      console.log('Index "name_1" not found, no action needed.');
    }

    console.log('Ensuring compound index { name: 1, branch: 1 }...');
    await collection.createIndex({ name: 1, branch: 1 }, { unique: true });
    console.log('Successfully created compound index');

    process.exit(0);
  } catch (err) {
    console.error('Error fixing index:', err.message);
    process.exit(1);
  }
}

fixIndex();
