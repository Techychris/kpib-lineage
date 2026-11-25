'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { REPO_ROOT } = require('./helpers/extract-scripts');

function loadDataContext() {
  const ctx = vm.createContext({});
  for (const file of ['lineage-data.js', 'class-dads.js', 'relationships.js']) {
    const abs = path.join(REPO_ROOT, file);
    vm.runInContext(fs.readFileSync(abs, 'utf8'), ctx, { filename: abs });
  }
  return ctx;
}

test('lineage-data.js: dataset dimensions, campuses, founders, and crossing formats', () => {
  const ctx = loadDataContext();
  const data = vm.runInContext(`({ records, campuses, schoolIds, crossings, memberAliases })`, ctx);

  assert.equal(data.records.length, 618);
  assert.equal(data.schoolIds.length, data.records.length);
  assert.equal(data.crossings.length, data.records.length);
  assert.deepEqual([...data.campuses], [
    'Northern Illinois',
    'UIC',
    'Mizzou',
    'Illinois Urbana-Champaign',
    'Purdue',
    'Northwestern',
  ]);

  // Every schoolId is in range
  for (const sid of data.schoolIds) {
    assert.ok(Number.isInteger(sid) && sid >= 0 && sid < data.campuses.length);
  }

  // Exactly 6 founders at indices 0..5 with null big brother
  const founders = data.records.map((r, i) => (r[2] ? i : -1)).filter(i => i >= 0);
  assert.deepEqual([...founders], [0, 1, 2, 3, 4, 5]);
  for (const id of founders) {
    assert.equal(data.records[id][1], null);
    assert.deepEqual([...data.crossings[id]], ['Spring 2000', 'Founders']);
  }

  // Every crossing semester matches valid pattern and non-empty cohort
  const semRe = /^(Winter|Spring|Summer|Fall) \d{4}$/;
  for (const [sem, cohort] of data.crossings) {
    assert.match(sem, semRe);
    assert.ok(cohort.length > 0);
  }

  // Every record has non-empty line name & real name, valid parent bounds
  for (let i = 0; i < data.records.length; i++) {
    const [line, big, isFounder, real] = data.records[i];
    assert.ok(typeof line === 'string' && line.length > 0);
    assert.ok(typeof real === 'string' && real.length > 0);
    if (!isFounder) {
      assert.ok(Number.isInteger(big) && big >= 0 && big < data.records.length && big !== i);
    }
  }
});

test('lineage-data.js: normalizeMemberQuery & matchesMember cover diacritics, punctuation, and aliases', () => {
  const ctx = loadDataContext();
  const { normalizeMemberQuery, matchesMember, records } = vm.runInContext(
    `({ normalizeMemberQuery, matchesMember, records })`,
    ctx
  );

  // Diacritics, punctuation, mixed case, extra whitespace
  assert.equal(normalizeMemberQuery('  Déjà Vu!!  '), 'deja vu');
  assert.equal(normalizeMemberQuery('Niño Valencia'), 'nino valencia');
  assert.equal(normalizeMemberQuery('Ch.Σ.RR;Y<+>{βΩ}MB!'), 'ch σ rr y βω mb');
  assert.equal(normalizeMemberQuery('   ---   '), '');

  // Line name match
  assert.equal(matchesMember(records[0], 'so smooth'), true);
  // Real name match
  assert.equal(matchesMember(records[0], 'christopher flores'), true);
  // Non-match on member without alias
  assert.equal(matchesMember(records[0], 'zzzzz'), false);

  // Member WITH alias ('Jose Anaya' -> ['Jose Reyes'], 'Jesmer Dionela' -> ['Jazz Dionela'])
  const jose = records.find(r => r[3] === 'Jose Anaya');
  const jesmer = records.find(r => r[3] === 'Jesmer Dionela');
  assert.ok(jose && jesmer);
  assert.equal(matchesMember(jose, 'jose reyes'), true);
  assert.equal(matchesMember(jesmer, 'jazz dionela'), true);
  assert.equal(matchesMember(jose, 'no match here'), false);
});

test('class-dads.js & relationships.js: acyclic forests, chronological invariants, co-dads, and duplicate names', () => {
  const ctx = loadDataContext();
  const res = vm.runInContext(
    `({ records, campuses, schoolIds, crossings, classDadsBySchool, classDadAliases, kidsByMember, dadsByMember, memberIdsByName, classDadIdsByMember, classDadByMember })`,
    ctx
  );

  assert.equal(res.classDadsBySchool.length, res.campuses.length);

  // Acyclic check & chronological check for both Big Brother and Class Dad trees
  const semOrder = { Winter: 0, Spring: 1, Summer: 2, Fall: 3 };
  const semKey = s => {
    const [t, y] = s.split(' ');
    return Number(y) * 4 + semOrder[t];
  };

  for (let i = 0; i < res.records.length; i++) {
    // Big brother chain terminates at a founder without cycles
    const seenBig = new Set();
    let cur = i;
    while (cur !== null) {
      assert.equal(seenBig.has(cur), false, `Cycle in Big Brother graph at ${cur}`);
      seenBig.add(cur);
      const p = res.records[cur][1];
      if (p !== null) assert.ok(semKey(res.crossings[p][0]) < semKey(res.crossings[cur][0]));
      cur = p;
    }

    // Class dad chain terminates at a founder without cycles
    const seenDad = new Set();
    cur = i;
    while (cur !== null) {
      assert.equal(seenDad.has(cur), false, `Cycle in Class Dad graph at ${cur}`);
      seenDad.add(cur);
      const p = res.classDadByMember[cur];
      if (p !== null) assert.ok(semKey(res.crossings[p][0]) < semKey(res.crossings[cur][0]));
      cur = p;
    }

    // Non-founders must have at least one resolved class dad
    if (!res.records[i][2]) {
      assert.ok(res.dadsByMember[i].length >= 1, `Missing class dad for member ${i}`);
      assert.ok(res.classDadIdsByMember[i].length >= 1, `Unresolved class dad for member ${i}`);
    } else {
      assert.deepEqual([...res.dadsByMember[i]], []);
      assert.equal(res.classDadByMember[i], null);
    }
  }

  // Co-class-dad class: NIU Spring 2019 ALPHA GAMMA GUARDS CLASS (IDs 147..154)
  assert.deepEqual([...res.classDadIdsByMember[147]], [132, 131]);
  assert.equal(res.classDadByMember[147], 132);
  assert.equal(res.kidsByMember[132].length, 8);
  assert.equal(res.kidsByMember[131].length, 8);

  // Duplicate legal name collides to null in memberIdsByName (CR-04 documentation)
  assert.equal(res.memberIdsByName.get('richard chang'), null);
});

test('relationships.js: campus-scoped disambiguation for duplicate names (CR-04) & unresolved dad fallback', () => {
  const ctx = vm.createContext({
    records: [
      ['Founder1', null, true, 'Alpha One'],
      ['DupA', 0, false, 'Same Name'],
      ['DupB', 0, false, 'Same Name'],
      ['DupC', 0, false, 'Same Name'], // duplicate within same school 1
      ['KidResolvedBySchool', 1, false, 'Beta Two'],
      ['KidUnresolved', 2, false, 'Gamma Three'],
    ],
    schoolIds: [0, 0, 1, 1, 0, 1],
    crossings: [
      ['Spring 2000', 'Founders'],
      ['Fall 2000', 'ALPHA'],
      ['Fall 2000', 'ALPHA'],
      ['Fall 2000', 'ALPHA'],
      ['Fall 2001', 'BETA'],
      ['Fall 2001', 'GAMMA'],
    ],
    classDadsBySchool: [
      { 'Fall 2000|ALPHA': ['Alpha One'], 'Fall 2001|BETA': ['Same Name'] },
      { 'Fall 2000|ALPHA': ['Alpha One'], 'Fall 2001|GAMMA': ['Same Name', 'Unknown Person'] },
    ],
    classDadAliases: {},
    normalizeMemberQuery: s => s.toLowerCase().trim(),
  });
  const relPath = path.join(REPO_ROOT, 'relationships.js');
  vm.runInContext(fs.readFileSync(relPath, 'utf8'), ctx, { filename: relPath });

  const out = vm.runInContext(`({ kidsByMember, classDadIdsByMember, classDadByMember })`, ctx);
  // Kid 4 at school 0 disambiguates 'Same Name' -> ID 1 (unique at school 0)!
  assert.equal(out.classDadByMember[4], 1);
  assert.deepEqual([...out.kidsByMember[1]], [4]);
  // Kid 5 at school 1 has duplicate 'Same Name' within school 1 AND 'Unknown Person' -> null safely
  assert.equal(out.classDadByMember[5], null);
  assert.deepEqual([...out.classDadIdsByMember[5]], []);
});
