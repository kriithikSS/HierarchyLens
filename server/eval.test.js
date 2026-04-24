// Evaluation checklist runner
const http = require('http');

function post(data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ data });
    const start = Date.now();
    const req = http.request({
      hostname: 'localhost', port: 3001, path: '/bfhl',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ ms: Date.now() - start, status: res.statusCode, headers: res.headers, body: JSON.parse(raw) }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  let pass = 0, fail = 0;

  function check(label, condition, detail = '') {
    if (condition) { console.log(`  ✅ ${label}`); pass++; }
    else { console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); fail++; }
  }

  // ── 1. CORS header ─────────────────────────────────────────────────────────
  console.log('\n[1] CORS');
  const cors = await post(['A->B']);
  check('Access-Control-Allow-Origin header present', !!cors.headers['access-control-allow-origin']);

  // ── 2. Performance — 50 edges ──────────────────────────────────────────────
  console.log('\n[2] Performance (50 edges)');
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const fiftyEdges = [];
  for (let i = 0; fiftyEdges.length < 50; i++) {
    const a = letters[i % 26], b = letters[(i + 1) % 26];
    if (a !== b) fiftyEdges.push(`${a}->${b}`);
    else i++;
  }
  const perf = await post(fiftyEdges);
  check(`Response in <3000ms (got ${perf.ms}ms)`, perf.ms < 3000);

  // ── 3. Basic spec example ──────────────────────────────────────────────────
  console.log('\n[3] Spec example');
  const spec = await post(['A->B','A->C','B->D','C->E','E->F','X->Y','Y->Z','Z->X','P->Q','Q->R','G->H','G->H','G->I','hello','1->2','A->']);
  const b = spec.body;
  check('HTTP 200', spec.status === 200);
  check('user_id present', !!b.user_id);
  check('email_id present', !!b.email_id);
  check('college_roll_number present', !!b.college_roll_number);
  check('hierarchies is array', Array.isArray(b.hierarchies));
  check('4 hierarchy groups', b.hierarchies.length === 4);
  check('invalid_entries = ["hello","1->2","A->"]', JSON.stringify(b.invalid_entries) === JSON.stringify(['hello','1->2','A->']));
  check('duplicate_edges = ["G->H"]', JSON.stringify(b.duplicate_edges) === JSON.stringify(['G->H']));
  check('summary.total_trees = 3', b.summary.total_trees === 3);
  check('summary.total_cycles = 1', b.summary.total_cycles === 1);
  check('summary.largest_tree_root = "A"', b.summary.largest_tree_root === 'A');

  const treeA = b.hierarchies.find(h => h.root === 'A');
  check('Tree A depth = 4', treeA?.depth === 4);
  check('Tree A has no has_cycle', !('has_cycle' in treeA));
  check('Tree A structure correct', JSON.stringify(treeA?.tree) === JSON.stringify({A:{B:{D:{}},C:{E:{F:{}}}}}));

  const cycleX = b.hierarchies.find(h => h.root === 'X');
  check('Cycle X: tree={}', JSON.stringify(cycleX?.tree) === '{}');
  check('Cycle X: has_cycle=true', cycleX?.has_cycle === true);
  check('Cycle X: no depth field', !('depth' in cycleX));

  const treeP = b.hierarchies.find(h => h.root === 'P');
  check('Tree P depth = 3', treeP?.depth === 3);

  const treeG = b.hierarchies.find(h => h.root === 'G');
  check('Tree G depth = 2', treeG?.depth === 2);
  check('Tree G has H and I', JSON.stringify(treeG?.tree) === JSON.stringify({G:{H:{},I:{}}}));

  // ── 4. Edge cases ──────────────────────────────────────────────────────────
  console.log('\n[4] Edge cases');

  const empty = await post([]);
  check('Empty data → 200 with empty results', empty.status === 200 && empty.body.hierarchies.length === 0);

  const selfLoop = await post(['A->A']);
  check('Self-loop A->A → invalid_entries', selfLoop.body.invalid_entries.includes('A->A'));

  const whitespace = await post([' A->B ']);
  check('Whitespace " A->B " → valid edge A->B', whitespace.body.hierarchies.some(h => h.root === 'A'));

  const multiChar = await post(['AB->C','a->b','1->2','A->']);
  check('AB->C invalid', multiChar.body.invalid_entries.includes('AB->C'));
  check('a->b invalid (lowercase)', multiChar.body.invalid_entries.includes('a->b'));
  check('"1->2" invalid', multiChar.body.invalid_entries.includes('1->2'));
  check('"A->" invalid', multiChar.body.invalid_entries.includes('A->'));

  const diamond = await post(['A->D','B->D','A->E']);
  check('Diamond A->D, B->D: D parent = A', diamond.body.hierarchies.some(h => h.root === 'A' && h.tree.A?.D !== undefined));
  check('Diamond: B->D discarded, B does NOT appear as a hierarchy', !diamond.body.hierarchies.some(h => h.root === 'B'));

  const pureCycle = await post(['Y->Z','Z->X','X->Y']);
  const cycleH = pureCycle.body.hierarchies[0];
  check('Pure cycle root = lex smallest (X)', cycleH?.root === 'X');
  check('Pure cycle has_cycle = true', cycleH?.has_cycle === true);

  const tripledup = await post(['A->B','A->B','A->B']);
  check('Triple duplicate: duplicate_edges has A->B once', tripledup.body.duplicate_edges.length === 1 && tripledup.body.duplicate_edges[0] === 'A->B');
  check('Triple duplicate: hierarchies has 1 tree', tripledup.body.hierarchies.length === 1);

  const badBody = await post(null);
  check('Non-array data → 400', badBody.status === 400);

  // ── 5. Response is not hardcoded ───────────────────────────────────────────
  console.log('\n[5] Not hardcoded');
  const r1 = await post(['A->B']);
  const r2 = await post(['C->D']);
  check('Different inputs → different roots', r1.body.hierarchies[0]?.root !== r2.body.hierarchies[0]?.root);

  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Result: ${pass} passed, ${fail} failed`);
  if (fail === 0) console.log('🎉 ALL CHECKS PASSED');
  else console.log('⚠️  Some checks failed — review above');
}

run().catch(console.error);
