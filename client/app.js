/* ═══════════════════════════════════════════════════
   BFHL Analyzer — App Logic
   ═══════════════════════════════════════════════════ */

// If frontend is served by the same server (Express), use relative path.
// Otherwise (e.g., Netlify), point to the deployed API.
const API_BASE = (window.location.port === '3001' || window.location.hostname !== 'localhost' && !window.location.hostname.includes('netlify'))
  ? ''   // Same-origin: relative URL works
  : 'https://srm-bfhl-api.onrender.com'; // Replace with your actual Render URL

let lastResponse = null;

// ── Example Data ─────────────────────────────────────────────────────────────
function loadExample() {
  document.getElementById('nodeInput').value =
    `A->B\nA->C\nB->D\nC->E\nE->F\nX->Y\nY->Z\nZ->X\nP->Q\nQ->R\nG->H\nG->H\nG->I\nhello\n1->2\nA->`;
}

function clearInput() {
  document.getElementById('nodeInput').value = '';
  document.getElementById('errorBanner').classList.add('hidden');
  document.getElementById('resultsPanel').classList.add('hidden');
  document.getElementById('emptyState').classList.remove('hidden');
  lastResponse = null;
}

// ── Analyze ──────────────────────────────────────────────────────────────────
async function analyze() {
  const raw = document.getElementById('nodeInput').value.trim();
  if (!raw) {
    showError('Please enter at least one node string.');
    return;
  }

  const data = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  hideError();
  showLoading();

  try {
    const res = await fetch(`${API_BASE}/bfhl`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const json = await res.json();
    lastResponse = json;
    renderResults(json);
  } catch (err) {
    showError(`API Error: ${err.message}. Make sure the server is running.`);
  } finally {
    hideLoading();
  }
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderResults(data) {
  // Show/hide panels
  document.getElementById('emptyState').classList.add('hidden');
  const panel = document.getElementById('resultsPanel');
  panel.classList.remove('hidden');
  panel.classList.add('anim-in');

  // Summary cards
  const { summary } = data;
  document.getElementById('summaryCards').innerHTML = `
    <div class="summary-card">
      <span class="card-value">${summary.total_trees}</span>
      <span class="card-label">Valid Trees</span>
    </div>
    <div class="summary-card">
      <span class="card-value">${summary.total_cycles}</span>
      <span class="card-label">Cycles</span>
    </div>
    <div class="summary-card">
      <span class="card-value">${summary.largest_tree_root ?? '—'}</span>
      <span class="card-label">Largest Tree Root</span>
    </div>
  `;

  // Identity
  document.getElementById('identityRow').innerHTML = `
    <div class="identity-chip">
      <span class="chip-label">User ID</span>
      <span class="chip-value">${data.user_id}</span>
    </div>
    <div class="identity-chip">
      <span class="chip-label">Email</span>
      <span class="chip-value">${data.email_id}</span>
    </div>
    <div class="identity-chip">
      <span class="chip-label">Roll Number</span>
      <span class="chip-value">${data.college_roll_number}</span>
    </div>
  `;

  // Hierarchy count
  document.getElementById('hierarchyCount').textContent = data.hierarchies.length;

  // Hierarchies
  const hContainer = document.getElementById('hierarchiesContainer');
  hContainer.innerHTML = '';
  data.hierarchies.forEach((h, i) => {
    hContainer.appendChild(buildHierarchyCard(h, i));
  });

  // Invalid entries
  const invCount = data.invalid_entries.length;
  document.getElementById('invalidCount').textContent = invCount;
  const invList = document.getElementById('invalidList');
  invList.innerHTML = invCount
    ? data.invalid_entries.map(e => `<span class="tag tag-red">${escHtml(e)}</span>`).join('')
    : `<span class="tag-empty">None</span>`;

  // Duplicates
  const dupCount = data.duplicate_edges.length;
  document.getElementById('duplicateCount').textContent = dupCount;
  const dupList = document.getElementById('duplicateList');
  dupList.innerHTML = dupCount
    ? data.duplicate_edges.map(e => `<span class="tag tag-yellow">${escHtml(e)}</span>`).join('')
    : `<span class="tag-empty">None</span>`;

  // Raw JSON
  document.getElementById('rawJSON').textContent = JSON.stringify(data, null, 2);
}

function buildHierarchyCard(h, idx) {
  const isCycle = !!h.has_cycle;
  const card = document.createElement('div');
  card.className = `hierarchy-card${isCycle ? ' has-cycle' : ''} anim-in`;
  card.style.animationDelay = `${idx * 60}ms`;

  const bodyId = `hbody-${idx}`;

  card.innerHTML = `
    <div class="hierarchy-header" onclick="toggleHBody('${bodyId}', this)">
      <div class="root-badge${isCycle ? ' cycle' : ''}">${h.root}</div>
      <div class="hierarchy-meta">
        <div class="h-root">Root: <strong>${h.root}</strong></div>
        <div class="h-sub">${isCycle ? 'Cyclic group' : `${countNodes(h.tree)} nodes`}</div>
      </div>
      ${isCycle
        ? `<span class="cycle-tag">⟳ Cycle</span>`
        : `<span class="depth-tag">Depth ${h.depth}</span>`}
      <svg class="chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </div>
    <div class="hierarchy-body" id="${bodyId}">
      ${isCycle
        ? `<p style="color:var(--text-muted);font-size:13px;">This group contains a cycle — tree structure cannot be rendered.</p>`
        : `<div class="tree-visual">${renderTreeLines(h.tree)}</div>`}
    </div>
  `;

  return card;
}

function toggleHBody(id, header) {
  const body = document.getElementById(id);
  const chevron = header.querySelector('.chevron');
  const isHidden = body.style.display === 'none';
  body.style.display = isHidden ? 'block' : 'none';
  chevron.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
}

// Render a nested tree object as indented node labels
function renderTreeLines(treeObj, depth = 0) {
  let html = '';
  for (const [node, children] of Object.entries(treeObj)) {
    const indent = '&nbsp;'.repeat(depth * 4);
    const connector = depth > 0 ? '<span class="tree-connector">└─&nbsp;</span>' : '';
    html += `<div class="tree-node" style="padding-left:${depth * 16}px">
      ${connector}<span class="tree-node-label">${node}</span>
    </div>`;
    html += renderTreeLines(children, depth + 1);
  }
  return html;
}

function countNodes(treeObj) {
  let count = 0;
  function walk(obj) {
    for (const [, children] of Object.entries(obj)) {
      count++;
      walk(children);
    }
  }
  walk(treeObj);
  return count;
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function copyJSON() {
  if (!lastResponse) return;
  navigator.clipboard.writeText(JSON.stringify(lastResponse, null, 2))
    .then(() => {
      const btn = event.currentTarget;
      const orig = btn.innerHTML;
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Copied!`;
      btn.style.color = 'var(--green)';
      setTimeout(() => { btn.innerHTML = orig; btn.style.color = ''; }, 2000);
    });
}

function showError(msg) {
  const banner = document.getElementById('errorBanner');
  document.getElementById('errorText').textContent = msg;
  banner.classList.remove('hidden');
}
function hideError() {
  document.getElementById('errorBanner').classList.add('hidden');
}
function showLoading() {
  document.getElementById('loadingOverlay').classList.remove('hidden');
}
function hideLoading() {
  document.getElementById('loadingOverlay').classList.add('hidden');
}
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Keyboard shortcut ─────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') analyze();
});
