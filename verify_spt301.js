/**
 * SPT-301 Verification Script
 * Checks:
 * 1. Corroborate as User A -> upvotedBy contains ID & count increments
 * 2. Second corroborate as same user -> 409
 * 3. UrgencyIndex increases with corroborations (35% weight)
 * 4. Triage queue re-sorts by corroboration/urgency
 */
const mongoose = require('./backend/node_modules/mongoose');
const { calculateUrgencyIndex } = require('./backend/src/services/triageEngine');
const BarrierReport = require('./backend/src/models/BarrierReport');
const reportController = require('./backend/src/controllers/reportController');

async function testSchemaSync() {
  console.log('=== TEST 1: Schema sync upvotedBy <-> corroborationCount ===');
  const doc = new BarrierReport({
    coordinates: { latitude: 6.9352, longitude: 79.8559 },
    photoUrl: 'https://example.com/a.jpg',
    category: 'Ramp',
    rating: 3,
    upvotedBy: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
  });
  await doc.validate();
  console.log(`  upvotedBy.length=${doc.upvotedBy.length}, corroborationCount=${doc.corroborationCount}`);
  console.log(`  ${doc.corroborationCount === doc.upvotedBy.length ? 'PASS' : 'FAIL'}: count equals length`);
  // Check indexes
  const hasIndex = BarrierReport.schema.indexes().some(i => JSON.stringify(i[0]).includes('upvotedBy'));
  console.log(`  Index on upvotedBy exists: ${hasIndex ? 'PASS' : 'FAIL'}`);
  const enumVals = BarrierReport.schema.path('verificationLog').schema.path('action').enumValues;
  console.log(`  Enum includes corroborated: ${enumVals.includes('corroborated') ? 'PASS' : 'FAIL'}`);
  console.log(`  Enum includes uncorroborated: ${enumVals.includes('uncorroborated') ? 'PASS' : 'FAIL'}`);
}

async function testUrgencyIncrease() {
  console.log('\n=== TEST 2: UrgencyIndex increases with corroborations (35% weight) ===');
  const baseReport = {
    rating: 3,
    category: 'Ramp',
    coordinates: { latitude: 6.9085, longitude: 79.8521 }, // outside vital corridor => multiplier 1.0
    createdAt: new Date(Date.now() - 1 * 86400000), // 1 day old
    corroborationCount: 0,
  };
  const results = [];
  for (let c of [0, 1, 2, 5, 8]) {
    const r = { ...baseReport, corroborationCount: c };
    const triage = calculateUrgencyIndex(r, 'CMC-W01');
    results.push({ c, urgency: triage.urgencyIndex, badge: triage.priorityBadge });
    console.log(`  corroborations=${c} => urgency=${triage.urgencyIndex} badge=${triage.priorityBadge} factors=${JSON.stringify(triage.formulaFactors)}`);
  }
  const increasing = results.every((v, i, arr) => i === 0 || v.urgency >= arr[i-1].urgency);
  console.log(`  ${increasing ? 'PASS' : 'FAIL'}: urgency non-decreasing with more corroborations`);
  const zeroVsFive = results.find(r=>r.c===0).urgency < results.find(r=>r.c===5).urgency;
  console.log(`  ${zeroVsFive ? 'PASS' : 'FAIL'}: 0 corroborations < 5 corroborations (35% weight visible)`);
  // Detailed weight check: corroborationScore = c*12.5, base = severity*0.4 + corroboration*0.35 + age*0.25
  console.log(`  Formula: base = severity(60 avg)*0.4=24 + corroborationScore*0.35 + ageScore(10)*0.25=2.5 => increase per corroboration ~4.375 before category weight`);
}

async function testControllerCorroboration() {
  console.log('\n=== TEST 3: Controller corroborate -> upvotedBy & count, 409 on duplicate ===');
  const fakeUserA = new mongoose.Types.ObjectId();
  const fakeReportId = new mongoose.Types.ObjectId();
  const otherUser = new mongoose.Types.ObjectId();

  // Mock DB
  const originalFindById = BarrierReport.findById;
  const originalFindOneAndUpdate = BarrierReport.findOneAndUpdate;

  // Mock report in DB
  const mockReportInDb = {
    _id: fakeReportId,
    reporterId: otherUser,
    triageStatus: 'pending',
    upvotedBy: [],
    corroborationCount: 0,
    rating: 4,
    category: 'Ramp',
    coordinates: { latitude: 6.9352, longitude: 79.8559 },
    createdAt: new Date(),
  };

  let dbState = { ...mockReportInDb, upvotedBy: [] };

  BarrierReport.findById = async (id) => {
    if (id.toString() === fakeReportId.toString()) return { ...dbState, reporterId: mockReportInDb.reporterId, toString: () => dbState._id.toString() };
    return null;
  };
  BarrierReport.findOneAndUpdate = async (filter, update, opts) => {
    // Simulate atomic $ne check
    const filterHasNe = filter.upvotedBy && filter.upvotedBy.$ne;
    if (filterHasNe) {
      const userId = filterHasNe;
      if (dbState.upvotedBy.some(id => id.toString() === userId.toString())) {
        return null; // already exists => 409
      }
      // apply $addToSet, $inc, $push
      dbState.upvotedBy = [...dbState.upvotedBy, userId];
      dbState.corroborationCount += 1;
      return { ...dbState, ...update.$push ? { verificationLog: [] } : {} };
    }
    // For uncorroborate
    if (filter.upvotedBy) {
      const userId = filter.upvotedBy;
      if (!dbState.upvotedBy.some(id => id.toString() === userId.toString())) return null;
      dbState.upvotedBy = dbState.upvotedBy.filter(id => id.toString() !== userId.toString());
      dbState.corroborationCount = Math.max(0, dbState.corroborationCount - 1);
      return { ...dbState };
    }
    return null;
  };

  const mockRes = () => {
    let code, body;
    return {
      status: (c) => { code = c; return { json: (d) => { body = d; return { code, body }; } }; },
      getCode: () => code,
      getBody: () => body,
    };
  };

  // First corroborate as User A -> should succeed 200
  let req1 = { params: { id: fakeReportId.toString() }, user: { _id: fakeUserA } };
  let res1 = mockRes();
  let out1 = null;
  const origRes1Json = res1.status(200).json;
  // we need to capture: call controller and intercept res.status
  let captured1 = {};
  const res1Mock = {
    status: (c) => { captured1.code = c; return { json: (d) => { captured1.body = d; } }; }
  };
  await reportController.corroborateReport(req1, res1Mock);
  console.log(`  First corroborate as User A: code=${captured1.code}, success=${captured1.body?.success}`);
  console.log(`    dbState upvotedBy contains User A: ${dbState.upvotedBy.some(id=>id.toString()===fakeUserA.toString()) ? 'PASS' : 'FAIL'}`);
  console.log(`    corroborationCount=${dbState.corroborationCount} expected 1: ${dbState.corroborationCount===1 ? 'PASS' : 'FAIL'}`);
  console.log(`    ${captured1.code===200 ? 'PASS' : 'FAIL'}: first corroborate returns 200`);

  // Second corroborate as same User A -> should 409
  let captured2 = {};
  const res2Mock = { status: (c) => { captured2.code = c; return { json: (d) => { captured2.body = d; } }; } };
  await reportController.corroborateReport(req1, res2Mock);
  console.log(`  Second corroborate as same User A: code=${captured2.code}, message=${captured2.body?.message}`);
  console.log(`    ${captured2.code===409 ? 'PASS' : 'FAIL'}: duplicate returns 409 Conflict`);

  // Test self-corroboration -> 403
  BarrierReport.findById = async (id) => ({ _id: fakeReportId, reporterId: fakeUserA, triageStatus: 'pending', upvotedBy: [] });
  let captured3 = {};
  const res3Mock = { status: (c) => { captured3.code = c; return { json: (d) => { captured3.body = d; } }; } };
  await reportController.corroborateReport(req1, res3Mock);
  console.log(`  Self-corroboration (reporter is User A): code=${captured3.code}`);
  console.log(`    ${captured3.code===403 ? 'PASS' : 'FAIL'}: self-corroboration blocked with 403`);

  // Test uncorroborate
  dbState = { ...mockReportInDb, upvotedBy: [fakeUserA], corroborationCount: 1 };
  BarrierReport.findById = async (id) => ({ _id: fakeReportId, triageStatus: 'pending', upvotedBy: dbState.upvotedBy });
  BarrierReport.findOneAndUpdate = async (filter, update, opts) => {
    if (filter.upvotedBy && !filter.upvotedBy.$ne) {
      const uid = filter.upvotedBy;
      if (!dbState.upvotedBy.some(id=>id.toString()===uid.toString())) return null;
      dbState.upvotedBy = dbState.upvotedBy.filter(id=>id.toString()!==uid.toString());
      dbState.corroborationCount = Math.max(0, dbState.corroborationCount-1);
      return { ...dbState };
    }
    return null;
  };
  let captured4 = {};
  const res4Mock = { status: (c) => { captured4.code = c; return { json: (d) => { captured4.body = d; } }; } };
  await reportController.uncorroborateReport(req1, res4Mock);
  console.log(`  Uncorroborate as User A: code=${captured4.code}, count after=${dbState.corroborationCount}`);
  console.log(`    ${captured4.code===200 && dbState.corroborationCount===0 ? 'PASS' : 'FAIL'}: uncorroborate decrements and returns 200`);

  // Restore
  BarrierReport.findById = originalFindById;
  BarrierReport.findOneAndUpdate = originalFindOneAndUpdate;
}

async function testQueueResort() {
  console.log('\n=== TEST 4: Triage Queue re-sorts by corroboration/urgency ===');
  // Use identical rating/location/age so urgency directly reflects corroboration (35% weight)
  const base = { rating: 3, category: 'Ramp', coordinates: { latitude: 6.9085, longitude: 79.8521 }, createdAt: new Date(Date.now() - 1*86400000) };
  const mockReports = [
    { _id: 'RPT-1', ...base, corroborationCount: 1 },
    { _id: 'RPT-2', ...base, corroborationCount: 3 },
    { _id: 'RPT-3', ...base, corroborationCount: 5 },
  ];
  const withTriage = mockReports.map(r => ({ ...r, triage: calculateUrgencyIndex(r, 'CMC-W01') }));
  console.log('  Before corroboration (identical rating/location, only cor differs):');
  withTriage.forEach(r => console.log(`    ${r._id} cor=${r.corroborationCount} urgency=${r.triage.urgencyIndex} badge=${r.triage.priorityBadge}`));

  // Sort by urgency (default) - should match corroboration order when other factors equal
  const byUrgency = [...withTriage].sort((a,b)=> b.triage.urgencyIndex - a.triage.urgencyIndex);
  console.log('  Sorted by urgency (desc):', byUrgency.map(r=>`${r._id}(${r.triage.urgencyIndex})`).join(' -> '));
  const urgencyOrderMatchesCorr = byUrgency[0]._id==='RPT-3' && byUrgency[2]._id==='RPT-1';
  console.log(`    ${urgencyOrderMatchesCorr ? 'PASS' : 'FAIL'}: urgency order mirrors corroboration order`);
  // Sort by corroboration
  const byCorr = [...withTriage].sort((a,b)=> b.corroborationCount - a.corroborationCount);
  console.log('  Sorted by corroboration (desc):', byCorr.map(r=>`${r._id}(${r.corroborationCount})`).join(' -> '));

  // Now simulate corroborating RPT-1 from 1 to 8 (increase) - should jump to top in both sorts
  const updatedRpt1 = { ...mockReports[0], corroborationCount: 8 };
  updatedRpt1.triage = calculateUrgencyIndex(updatedRpt1, 'CMC-W01');
  console.log(`\n  After corroborating RPT-1: 1 -> 8`);
  console.log(`    RPT-1 new urgency=${updatedRpt1.triage.urgencyIndex} (was ${withTriage[0].triage.urgencyIndex})`);
  console.log(`    ${updatedRpt1.triage.urgencyIndex > withTriage[0].triage.urgencyIndex ? 'PASS' : 'FAIL'}: urgency increased`);

  const updatedList = [updatedRpt1, withTriage[1], withTriage[2]];
  const resortByUrgency = [...updatedList].sort((a,b)=> b.triage.urgencyIndex - a.triage.urgencyIndex);
  console.log('  Resort by urgency after update:', resortByUrgency.map(r=>`${r._id}(${r.triage.urgencyIndex},cor${r.corroborationCount})`).join(' -> '));
  const rpt1NowTopUrgency = resortByUrgency[0]._id === 'RPT-1';
  console.log(`    ${rpt1NowTopUrgency ? 'PASS' : 'FAIL'}: RPT-1 moved to top by urgency after gaining corroborations`);
  const resortByCorr = [...updatedList].sort((a,b)=> b.corroborationCount - a.corroborationCount);
  console.log('  Resort by corroboration after update:', resortByCorr.map(r=>`${r._id}(cor${r.corroborationCount})`).join(' -> '));
  console.log(`    ${resortByCorr[0]._id==='RPT-1' ? 'PASS' : 'FAIL'}: RPT-1 top when sorting by corroborations`);
}

async function runAll() {
  console.log('SPT-301 Verification Suite\n');
  await testSchemaSync();
  await testUrgencyIncrease();
  await testControllerCorroboration();
  await testQueueResort();
  console.log('\n=== SUMMARY: All SPT-301 verification checks executed ===');
}

runAll().catch(e=>{ console.error(e); process.exit(1); });
