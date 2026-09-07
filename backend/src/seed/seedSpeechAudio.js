const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = require('../config/db');
const SpeechPrompt = require('../models/SpeechPrompt');
const HazardCue = require('../models/HazardCue');
const hazardCues = require('./hazardCues.json');
const speechPrompts = require('./speechPrompts.json');

const seed = async () => {
  try {
    await connectDB();
    console.log('Seeding SpeechPrompts...');
    for (const doc of speechPrompts) {
      await SpeechPrompt.updateOne({ promptCode: doc.promptCode }, { $set: doc }, { upsert: true });
    }
    console.log(`✅ SpeechPrompts seeded: ${speechPrompts.length}`);

    console.log('Seeding HazardCues...');
    for (const doc of hazardCues) {
      await HazardCue.updateOne({ cueCode: doc.cueCode }, { $set: doc }, { upsert: true });
    }
    console.log(`✅ HazardCues seeded: ${hazardCues.length}`);

    const promptCount = await SpeechPrompt.countDocuments();
    const cueCount = await HazardCue.countDocuments();
    console.log(`📊 Totals — Prompts: ${promptCount}, Cues: ${cueCount}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
};

if (require.main === module) seed();

module.exports = seed;
