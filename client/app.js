const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001'
  : '';

function loadExample() {
  document.getElementById('nodeInput').value =
    'A->B\nA->C\nB->D\nC->E\nE->F\nX->Y\nY->Z\nZ->X\nP->Q\nQ->R\nG->H\nG->H\nG->I\nhello\n1->2\nA->';
}

function clearAll() {
  document.getElementById('nodeInput').value = '';
  document.getElementById('results').classList.add('hidden');
  document.getElementById('errorMsg').classList.add('hidden');
}

async function submitData() {
  const raw = document.getElementById('nodeInput').value.trim();
  const errEl = document.getElementById('errorMsg');
  errEl.classList.add('hidden');

  if (!raw) {
    errEl.textContent = 'Please enter at least one node edge.';
    errEl.classList.remove('hidden');
    return;
  }

  const data = raw.split('\n').map(l => l).filter(l => l.length > 0);

  document.getElementById('submitBtn').textContent = 'Loading...';
  document.getElementById('submitBtn').disabled = true;

  try {
    const res = await fetch(`${API_BASE}/bfhl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    });

    if (!res.ok) throw new Error(`Server returned ${res.status}`);

    const json = await res.json();
    renderResults(json);
  } catch (err) {
    errEl.textContent = 'Error: ' + err.message + '. Make sure the server is running.';
    errEl.classList.remove('hidden');
  } finally {
    document.getElementById('submitBtn').textContent = 'Analyze';
    document.getElementById('submitBtn').disabled = false;
  }
}

function renderResults(data) {
  document.getElementById('uid').textContent = data.user_id;
  document.getElementById('email').textContent = data.email_id;
  document.getElementById('roll').textContent = data.college_roll_number;

  document.getElementById('totalTrees').textContent = data.summary.total_trees;
  document.getElementById('totalCycles').textContent = data.summary.total_cycles;
  document.getElementById('largestRoot').textContent = data.summary.largest_tree_root || '—';

  // Hierarchies
  const hBox = document.getElementById('hierarchiesBox');
  hBox.innerHTML = '';
  data.hierarchies.forEach((h, i) => {
    hBox.appendChild(buildHierarchyCard(h, i));
  });

  // Invalid entries
  const invBox = document.getElementById('invalidBox');
  const invCount = data.invalid_entries.length;
  document.getElementById('invCount').textContent = invCount;
  invBox.innerHTML = invCount
    ? data.invalid_entries.map(e => `<span class="tag invalid">${e}</span>`).join('')
    : '<span class="none-text">None</span>';

  // Duplicate edges
  const dupBox = document.getElementById('duplicateBox');
  const dupCount = data.duplicate_edges.length;
  document.getElementById('dupCount').textContent = dupCount;
  dupBox.innerHTML = dupCount
    ? data.duplicate_edges.map(e => `<span class="tag dup">${e}</span>`).join('')
    : '<span class="none-text">None</span>';

  // Raw JSON
  document.getElementById('rawJson').textContent = JSON.stringify(data, null, 2);

  document.getElementById('results').classList.remove('hidden');
}

function buildHierarchyCard(h, idx) {
  const isCycle = !!h.has_cycle;
  const card = document.createElement('div');
  card.className = 'hierarchy-card' + (isCycle ? ' cycle' : '');

  const bodyId = 'hbody-' + idx;

  card.innerHTML = `
    <div class="hierarchy-header" onclick="toggleBody('${bodyId}', this)">
      <div class="root-label ${isCycle ? 'cycle' : ''}">${h.root}</div>
      <div class="h-info">
        <strong>Root: ${h.root}</strong>
        <span>${isCycle ? 'Contains a cycle' : countNodes(h.tree) + ' node(s)'}</span>
      </div>
      ${isCycle
        ? '<span class="badge cycle">⟳ Cycle</span>'
        : `<span class="badge depth">Depth: ${h.depth}</span>`}
      <span>▾</span>
    </div>
    <div class="hierarchy-body" id="${bodyId}">
      ${isCycle
        ? '<em style="color:#888">Cyclic group — tree cannot be displayed.</em>'
        : renderTree(h.tree, 0)}
    </div>
  `;
  return card;
}

function toggleBody(id, header) {
  const body = document.getElementById(id);
  const arrow = header.querySelector('span:last-child');
  if (body.style.display === 'none') {
    body.style.display = 'block';
    arrow.textContent = '▾';
  } else {
    body.style.display = 'none';
    arrow.textContent = '▸';
  }
}

function renderTree(obj, depth) {
  let html = '';
  for (const [node, children] of Object.entries(obj)) {
    const indent = depth * 20;
    html += `<div class="tree-line" style="padding-left:${indent}px">
      ${depth > 0 ? '<span class="connector">└─</span>' : ''}
      <span class="node-box">${node}</span>
    </div>`;
    html += renderTree(children, depth + 1);
  }
  return html;
}

function countNodes(obj) {
  let count = 0;
  function walk(o) {
    for (const [, v] of Object.entries(o)) { count++; walk(v); }
  }
  walk(obj);
  return count;
}

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submitData();
});
