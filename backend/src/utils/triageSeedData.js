/**
 * triageSeedData.js
 * Realistic accessibility barrier reports & municipal infrastructure assets
 * Colombo Municipal Council (CMC)
 * 
 * Ticket: SPT-111
 */

const { BarrierReport, MunicipalAsset } = require('../models');

const SAMPLE_MUNICIPAL_ASSETS = [
  {
    assetCode: 'CMC-AST-1049',
    name: 'Fort Railway Station North Pedestrian Ramp',
    category: 'Ramp',
    wardId: 'CMC-W01',
    address: 'Olcott Mawatha, Fort, Colombo 01',
    location: {
      type: 'Point',
      coordinates: [79.8512, 6.9344], // [lng, lat]
    },
    specifications: {
      gradientDegrees: 6.2,
      clearWidthMeters: 1.8,
      hasHandrails: true,
      hasTactileIndicators: true,
    },
    operationalStatus: 'OPERATIONAL',
    registeredPhotoUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=600&auto=format&fit=crop',
    installationYear: 2021,
    estimatedReplacementCostLKR: 350000,
  },
  {
    assetCode: 'CMC-AST-2081',
    name: 'Pettah Floating Market Overpass Lift Tower A',
    category: 'Lift',
    wardId: 'CMC-W01',
    address: 'Bastian Mawatha, Pettah, Colombo 11',
    location: {
      type: 'Point',
      coordinates: [79.8558, 6.9351],
    },
    specifications: {
      gradientDegrees: 0,
      clearWidthMeters: 1.5,
      hasHandrails: true,
      maxLoadCapacityKg: 800,
    },
    operationalStatus: 'OPERATIONAL',
    registeredPhotoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?w=600&auto=format&fit=crop',
    installationYear: 2019,
    estimatedReplacementCostLKR: 1200000,
  },
  {
    assetCode: 'CMC-AST-3112',
    name: 'National Hospital Main Entrance Guiding Tactile Surface',
    category: 'Tactile Paving',
    wardId: 'CMC-W06',
    address: 'Regent Street, Borella, Colombo 08',
    location: {
      type: 'Point',
      coordinates: [79.8778, 6.9147],
    },
    specifications: {
      clearWidthMeters: 1.2,
      hasTactileIndicators: true,
    },
    operationalStatus: 'OPERATIONAL',
    registeredPhotoUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=600&auto=format&fit=crop',
    installationYear: 2022,
    estimatedReplacementCostLKR: 180000,
  },
];

const SAMPLE_BARRIER_REPORTS = [
  {
    category: 'Lift',
    rating: 5, // Maximum barrier severity
    corroborationCount: 7, // Highly corroborated by commuters
    triageStatus: 'pending',
    notes: 'Overpass lift display is dead and doors jammed shut. Wheelchair commuters unable to reach railway platforms.',
    photoUrl: 'https://images.unsplash.com/photo-1584467735815-f778f274e296?w=600&auto=format&fit=crop',
    coordinates: { latitude: 6.9352, longitude: 79.8559 },
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days old
  },
  {
    category: 'Ramp',
    rating: 4,
    corroborationCount: 5,
    triageStatus: 'pending',
    notes: 'Severe concrete subsidence on ramp slope exceeding 12 degrees gradient. Wheelchair flipped backward yesterday.',
    photoUrl: 'https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?w=600&auto=format&fit=crop',
    coordinates: { latitude: 6.9345, longitude: 79.8514 },
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days old
  },
  {
    category: 'Tactile Paving',
    rating: 4,
    corroborationCount: 6,
    triageStatus: 'pending',
    notes: 'Tactile paving warning tiles removed during pipe maintenance. Visually impaired patient tripped on open trench.',
    photoUrl: 'https://images.unsplash.com/photo-1508873696983-2df57036476b?w=600&auto=format&fit=crop',
    coordinates: { latitude: 6.9149, longitude: 79.8779 }, // In National Hospital corridor!
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    category: 'Restroom',
    rating: 3,
    corroborationCount: 2,
    triageStatus: 'pending',
    notes: 'Accessible stall lock broken and grab rail loose from wall.',
    photoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop',
    coordinates: { latitude: 6.9085, longitude: 79.8521 },
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    category: 'Ramp',
    rating: 2,
    corroborationCount: 1,
    triageStatus: 'pending',
    notes: 'Faded yellow high-contrast paint on ramp threshold. Minor cosmetic issue.',
    photoUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop',
    coordinates: { latitude: 6.8916, longitude: 79.8558 },
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours old
  },
];

async function seedTriageDataIfEmpty() {
  try {
    const reportCount = await BarrierReport.countDocuments();
    if (reportCount === 0) {
      console.log('🌱 Seeding initial CMC Barrier Reports for Triage Engine...');
      await BarrierReport.create(SAMPLE_BARRIER_REPORTS);
      console.log(`✅ Seeded ${SAMPLE_BARRIER_REPORTS.length} barrier reports.`);
    }

    const assetCount = await MunicipalAsset.countDocuments();
    if (assetCount === 0) {
      console.log('🌱 Seeding initial Municipal Asset Registry records...');
      await MunicipalAsset.create(SAMPLE_MUNICIPAL_ASSETS);
      console.log(`✅ Seeded ${SAMPLE_MUNICIPAL_ASSETS.length} municipal assets.`);
    }
  } catch (error) {
    console.warn('[TriageSeed] Seed check notice:', error.message);
  }
}

module.exports = {
  SAMPLE_MUNICIPAL_ASSETS,
  SAMPLE_BARRIER_REPORTS,
  seedTriageDataIfEmpty,
};
