/**
 * wardJurisdictions.js
 * Standardized Ward Jurisdiction Models & Infrastructure Asset Classifications
 * Colombo Municipal Council (CMC) Urban Accessibility Management
 * 
 * Ticket: SPT-010
 */

export const MUNICIPAL_ROLES = {
  CHIEF_ENGINEER: {
    id: 'CHIEF_ENGINEER',
    title: 'Chief Municipal Engineer',
    permissions: ['VIEW_TRIAGE', 'APPROVE_BUDGET', 'REJECT_REPORT', 'ALLOCATE_FUNDS', 'EDIT_ASSETS'],
    badgeColor: '#2563EB',
  },
  WARD_INSPECTOR: {
    id: 'WARD_INSPECTOR',
    title: 'Ward Accessibility Field Inspector',
    permissions: ['VIEW_TRIAGE', 'INSPECT_EVIDENCE', 'REQUEST_INFO', 'CROSS_CHECK_ASSET'],
    badgeColor: '#059669',
  },
  BUDGET_OFFICER: {
    id: 'BUDGET_OFFICER',
    title: 'Municipal Budget & Compliance Officer',
    permissions: ['VIEW_TRIAGE', 'APPROVE_BUDGET', 'EXPORT_AUDIT_LOGS', 'VIEW_COMPLIANCE'],
    badgeColor: '#D97706',
  },
};

export const MUNICIPAL_WARDS = [
  {
    id: 'CMC-W01',
    name: 'Fort & Pettah Commercial Hub',
    wardNumber: 1,
    centerCoordinate: { latitude: 6.9344, longitude: 79.8428 },
    activeBarriers: 14,
    complianceScore: 72,
    allocatedBudgetLKR: 1850000,
    spentBudgetLKR: 1240000,
    inspector: 'Eng. K. Perera (CMC-882)',
    priority: 'CRITICAL',
    description: 'High-density commuter hub, central railway terminal & bus stands.',
  },
  {
    id: 'CMC-W02',
    name: 'Slave Island / Kompannavidiya',
    wardNumber: 2,
    centerCoordinate: { latitude: 6.9218, longitude: 79.8522 },
    activeBarriers: 8,
    complianceScore: 81,
    allocatedBudgetLKR: 1200000,
    spentBudgetLKR: 760000,
    inspector: 'Insp. M. Fernando (CMC-412)',
    priority: 'HIGH',
    description: 'Mixed residential and rapid urban transit redevelopment zone.',
  },
  {
    id: 'CMC-W03',
    name: 'Kollupitiya Coastal Corridor',
    wardNumber: 3,
    centerCoordinate: { latitude: 6.9085, longitude: 79.8519 },
    activeBarriers: 5,
    complianceScore: 89,
    allocatedBudgetLKR: 1500000,
    spentBudgetLKR: 890000,
    inspector: 'Eng. T. Jayawardena (CMC-605)',
    priority: 'MEDIUM',
    description: 'Arterial Galle Road pedestrian corridors and shopping precincts.',
  },
  {
    id: 'CMC-W04',
    name: 'Bambalapitiya High Street',
    wardNumber: 4,
    centerCoordinate: { latitude: 6.8915, longitude: 79.8556 },
    activeBarriers: 11,
    complianceScore: 76,
    allocatedBudgetLKR: 1400000,
    spentBudgetLKR: 1020000,
    inspector: 'Insp. S. De Silva (CMC-329)',
    priority: 'HIGH',
    description: 'Educational corridor, universities, and commercial retail frontage.',
  },
  {
    id: 'CMC-W05',
    name: 'Cinnamon Gardens Civic Ward',
    wardNumber: 5,
    centerCoordinate: { latitude: 6.9092, longitude: 79.8687 },
    activeBarriers: 3,
    complianceScore: 94,
    allocatedBudgetLKR: 1100000,
    spentBudgetLKR: 410000,
    inspector: 'Eng. K. Perera (CMC-882)',
    priority: 'LOW',
    description: 'Town Hall, public parks, libraries, and diplomatic missions.',
  },
  {
    id: 'CMC-W06',
    name: 'Borella Hospital & Health Belt',
    wardNumber: 6,
    centerCoordinate: { latitude: 6.9147, longitude: 79.8778 },
    activeBarriers: 16,
    complianceScore: 68,
    allocatedBudgetLKR: 2200000,
    spentBudgetLKR: 1750000,
    inspector: 'Insp. R. Wickramasinghe (CMC-771)',
    priority: 'CRITICAL',
    description: 'National Hospital complex, medical college, and patient transit ways.',
  },
];

export const ASSET_CATEGORIES = {
  RAMP: {
    id: 'RAMP',
    label: 'Wheelchair Ramp',
    standardGradientMaxDeg: 8.0,
    icon: '♿',
    estimatedRepairCostLKR: 85000,
  },
  ELEVATOR: {
    id: 'ELEVATOR',
    label: 'Pedestrian Overpass Lift',
    standardGradientMaxDeg: 0,
    icon: '🛗',
    estimatedRepairCostLKR: 250000,
  },
  TACTILE_PAVING: {
    id: 'TACTILE_PAVING',
    label: 'Guiding Tactile Surface',
    standardGradientMaxDeg: null,
    icon: '🦯',
    estimatedRepairCostLKR: 45000,
  },
  RESTROOM: {
    id: 'RESTROOM',
    label: 'Accessible Restroom',
    standardGradientMaxDeg: null,
    icon: '🚻',
    estimatedRepairCostLKR: 120000,
  },
  CURB_RAMP: {
    id: 'CURB_RAMP',
    label: 'Sidewalk Dropped Curb',
    standardGradientMaxDeg: 5.0,
    icon: '🚶‍♂️',
    estimatedRepairCostLKR: 35000,
  },
};

export const REJECTION_REASON_CODES = [
  { code: 'DUPLICATE_REPORT', label: 'Duplicate report already in queue' },
  { code: 'OUTSIDE_MUNICIPAL_BOUNDARY', label: 'Obstacle located outside CMC jurisdiction' },
  { code: 'TEMPORARY_EVENT_PERMIT', label: 'Permitted temporary municipal roadwork' },
  { code: 'INSUFFICIENT_EVIDENCE', label: 'Photo unclear or missing identifiable landmarks' },
  { code: 'PRIVATE_PROPERTY_ACCESS', label: 'Barrier is situated within private commercial premise' },
];

export const getWardById = (id) => MUNICIPAL_WARDS.find((w) => w.id === id) || MUNICIPAL_WARDS[0];
export const getAllWards = () => MUNICIPAL_WARDS;
