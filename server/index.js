const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '..', 'client')));

const IDENTITY = {
  user_id: 'kriithikSS_11052005',
  email_id: 'ks7872@srmist.edu.in',
  college_roll_number: 'RA2311026010779',
};

function parseEdges(rawData) {
  const seen = new Set();
  const valid = [];
  const invalid = [];
  const duplicates = [];

  for (const item of rawData) {
    const s = item.trim();

    if (s.length !== 4 || s[1] !== '-' || s[2] !== '>' ||
        !/[A-Z]/.test(s[0]) || !/[A-Z]/.test(s[3]) || s[0] === s[3]) {
      invalid.push(item);
      continue;
    }

    const edge = `${s[0]}->${s[3]}`;
    if (seen.has(edge)) {
      if (!duplicates.includes(edge)) duplicates.push(edge);
    } else {
      seen.add(edge);
      valid.push([s[0], s[3]]);
    }
  }

  return { valid, invalid, duplicates };
}

function buildGraph(edges) {
  const adj = new Map();
  const firstParent = new Map();
  const nodes = new Set();

  for (const [u, v] of edges) {
    nodes.add(u);
    nodes.add(v);
    if (!firstParent.has(v)) {
      firstParent.set(v, u);
      if (!adj.has(u)) adj.set(u, []);
      adj.get(u).push(v);
    }
  }

  return { adj, firstParent, nodes };
}

function getComponents(nodes, acceptedEdges) {
  const parent = {};
  for (const n of nodes) parent[n] = n;

  function find(x) {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }

  for (const [u, v] of acceptedEdges) {
    const ru = find(u), rv = find(v);
    if (ru !== rv) parent[ru] = rv;
  }

  const groups = {};
  for (const n of nodes) {
    const rep = find(n);
    if (!groups[rep]) groups[rep] = [];
    groups[rep].push(n);
  }

  return Object.values(groups);
}

function checkCycle(start, adj) {
  const color = new Map();

  function visit(node) {
    color.set(node, 'gray');
    for (const child of (adj.get(node) || [])) {
      if (color.get(child) === 'gray') return true;
      if (!color.has(child) && visit(child)) return true;
    }
    color.set(node, 'black');
    return false;
  }

  return visit(start);
}

function subtree(node, adj) {
  const obj = {};
  for (const child of (adj.get(node) || [])) {
    obj[child] = subtree(child, adj);
  }
  return obj;
}

function longestPath(node, adj) {
  const kids = adj.get(node) || [];
  if (kids.length === 0) return 1;
  return 1 + Math.max(...kids.map(k => longestPath(k, adj)));
}

function processData(rawData) {
  const { valid, invalid, duplicates } = parseEdges(rawData);
  const { adj, firstParent, nodes } = buildGraph(valid);

  const acceptedEdges = valid.filter(([u, v]) => firstParent.get(v) === u);
  const components = getComponents(nodes, acceptedEdges);

  const hierarchies = [];
  const trees = [];
  let totalCycles = 0;

  for (const group of components) {
    const rootNodes = group.filter(n => !firstParent.has(n));
    const root = rootNodes.length > 0
      ? rootNodes.sort()[0]
      : group.slice().sort()[0];

    if (checkCycle(root, adj)) {
      totalCycles++;
      hierarchies.push({ root, tree: {}, has_cycle: true });
    } else {
      const depth = longestPath(root, adj);
      const tree = { [root]: subtree(root, adj) };
      hierarchies.push({ root, tree, depth });
      trees.push({ root, depth });
    }
  }

  hierarchies.sort((a, b) => a.root < b.root ? -1 : 1);

  trees.sort((a, b) => b.depth - a.depth || (a.root < b.root ? -1 : 1));

  return {
    ...IDENTITY,
    hierarchies,
    invalid_entries: invalid,
    duplicate_edges: duplicates,
    summary: {
      total_trees: trees.length,
      total_cycles: totalCycles,
      largest_tree_root: trees.length > 0 ? trees[0].root : null,
    },
  };
}

app.post('/bfhl', (req, res) => {
  const { data } = req.body;
  if (!Array.isArray(data)) {
    return res.status(400).json({ error: 'data must be an array' });
  }
  res.json(processData(data));
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
