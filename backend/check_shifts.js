const mongoose = require('mongoose');
require('dotenv').config();

const ShiftSchema = new mongoose.Schema({
    name: String,
    branch: mongoose.Schema.Types.ObjectId
});
const Shift = mongoose.model('Shift', ShiftSchema);

async function checkShifts() {
    await mongoose.connect(process.env.MONGO_URI);
    const shifts = await Shift.find();
    console.log('Shifts found:', JSON.stringify(shifts, null, 2));
    process.exit(0);
}
checkShifts();
