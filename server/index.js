const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve the frontend
const clientDir = path.join(__dirname, '..', 'client');
app.use(express.static(clientDir));

// ─── Identity ────────────────────────────────────────────────────────────────
const USER_ID = 'krishnavamsi_24042000';
const EMAIL_ID = 'krishnavamsi@srmist.edu.in';
const COLLEGE_ROLL_NUMBER = 'RA2211003010001';

// ─── Validation ──────────────────────────────────────────────────────────────
function validateEntry(raw) {
  const entry = raw.trim();
  // Must match exactly X->Y where X and Y are single uppercase A-Z letters
  // and X !== Y (self-loop)
  if (!/^[A-Z]->[A-Z]$/.test(entry)) return false;
  const [src, dst] = [entry[0], entry[3]];
  if (src === dst) return false; // self-loop
  return true;
}

// ─── Core Processing ─────────────────────────────────────────────────────────
function processData(data) {
  const invalidEntries = [];
  const seenEdges = new Set();
  const duplicateEdges = [];
  const validEdges = []; // [src, dst]

  for (const raw of data) {
    const trimmed = raw.trim();
    if (!validateEntry(trimmed)) {
      invalidEntries.push(raw);
      continue;
    }
    const src = trimmed[0];
    const dst = trimmed[3];
    const key = `${src}->${dst}`;

    if (seenEdges.has(key)) {
      // Track duplicates only once
      if (!duplicateEdges.includes(key)) {
        duplicateEdges.push(key);
      }
      continue;
    }
    seenEdges.add(key);
    validEdges.push([src, dst]);
  }

  // Build adjacency: parent -> [children], and child -> [parents]
  // Apply Diamond rule: first parent edge wins
  const children = {}; // node -> [child, ...]
  const parentOf = {};  // node -> parent (first assignment wins)
  const allNodes = new Set();

  for (const [src, dst] of validEdges) {
    allNodes.add(src);
    allNodes.add(dst);

    if (parentOf[dst] === undefined) {
      // First parent edge for dst — accepted
      parentOf[dst] = src;
      if (!children[src]) children[src] = [];
      children[src].push(dst);
    }
    // else: silently discard (multi-parent / diamond case)
  }

  // Find connected components using Union-Find on accepted edges
  const uf = makeUF([...allNodes]);
  for (const [src, dst] of validEdges) {
    // Only union if this edge was accepted (dst's parent is src)
    if (parentOf[dst] === src) {
      uf.union(src, dst);
    }
  }

  // Group nodes by component
  const components = {};
  for (const node of allNodes) {
    const root = uf.find(node);
    if (!components[root]) components[root] = new Set();
    components[root].add(node);
  }

  const hierarchies = [];
  let totalCycles = 0;
  const nonCyclicTrees = []; // {root, depth}

  for (const compNodes of Object.values(components)) {
    // Find roots: nodes that never appear as a child (in accepted edges)
    const candidates = [...compNodes].filter(n => parentOf[n] === undefined);
    let treeRoot;

    if (candidates.length === 0) {
      // Pure cycle — lexicographically smallest
      treeRoot = [...compNodes].sort()[0];
    } else {
      treeRoot = candidates.sort()[0]; // lex smallest if multiple roots
    }

    // Detect cycle: DFS from treeRoot using accepted child edges
    const hasCycle = detectCycle(treeRoot, children);

    if (hasCycle) {
      totalCycles++;
      hierarchies.push({ root: treeRoot, tree: {}, has_cycle: true });
    } else {
      const tree = buildTree(treeRoot, children);
      const depth = calcDepth(treeRoot, children);
      hierarchies.push({ root: treeRoot, tree, depth });
      nonCyclicTrees.push({ root: treeRoot, depth });
    }
  }

  // Sort hierarchies: non-cyclic first by lex root? 
  // Actually keep insertion order or sort by root lex — problem doesn't specify ordering
  // but example shows A, X (cycle), P, G
  // Let's sort non-cyclic by root lex, cycles by root lex
  hierarchies.sort((a, b) => a.root.localeCompare(b.root));

  // Summary
  const totalTrees = nonCyclicTrees.length;

  let largestTreeRoot = null;
  if (nonCyclicTrees.length > 0) {
    nonCyclicTrees.sort((a, b) => {
      if (b.depth !== a.depth) return b.depth - a.depth;
      return a.root.localeCompare(b.root); // lex smaller wins tie
    });
    largestTreeRoot = nonCyclicTrees[0].root;
  }

  return {
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: COLLEGE_ROLL_NUMBER,
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary: {
      total_trees: totalTrees,
      total_cycles: totalCycles,
      largest_tree_root: largestTreeRoot,
    },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeUF(nodes) {
  const parent = {};
  for (const n of nodes) parent[n] = n;

  function find(x) {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }

  function union(a, b) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  return { find, union };
}

function detectCycle(root, children) {
  const visited = new Set();
  const stack = new Set();

  function dfs(node) {
    visited.add(node);
    stack.add(node);
    for (const child of (children[node] || [])) {
      if (!visited.has(child)) {
        if (dfs(child)) return true;
      } else if (stack.has(child)) {
        return true;
      }
    }
    stack.delete(node);
    return false;
  }

  return dfs(root);
}

function buildTree(node, children) {
  const result = {};
  for (const child of (children[node] || [])) {
    result[child] = buildTreeChildren(child, children);
  }
  return { [node]: result };
}

function buildTreeChildren(node, children) {
  const result = {};
  for (const child of (children[node] || [])) {
    result[child] = buildTreeChildren(child, children);
  }
  return result;
}

function calcDepth(node, children) {
  const kids = children[node] || [];
  if (kids.length === 0) return 1;
  return 1 + Math.max(...kids.map(k => calcDepth(k, children)));
}

// ─── Route ───────────────────────────────────────────────────────────────────
app.post('/bfhl', (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: '`data` must be an array of strings.' });
    }
    const result = processData(data);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Health check (JSON)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'SRM BFHL API — POST /bfhl' });
});

// Fallback: serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
