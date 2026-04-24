# HierarchyLens — SRM Full Stack Engineering Challenge

A REST API that processes hierarchical node relationships and returns structured tree insights.

## Submission Details

| Field | Value |
|---|---|
| **User ID** | `kriithikSS_11052005` |
| **Email** | `ks7872@srmist.edu.in` |
| **Roll Number** | `RA2311026010779` |

## Live URLs

- **API**: `https://hierarchylens-api.onrender.com/bfhl`
- **Frontend**: `https://hierarchylens-api.onrender.com`
- **GitHub**: `https://github.com/kriithikSS/HierarchyLens`

> ⚠️ Hosted on Render free tier — first request may take 30–60 seconds (cold start). Subsequent requests are instant.

## Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla HTML/CSS/JS
- **Hosting**: Render (API + Frontend)

## Local Development

### Backend (API)
```bash
cd server
npm install
npm run dev          # http://localhost:3001
```

### Frontend
Open `http://localhost:3001` in your browser — Express serves the frontend at the same port.

## API Reference

### POST /bfhl

**Request**
```json
{
  "data": ["A->B", "A->C", "B->D"]
}
```

**Response**
```json
{
  "user_id": "kriithikSS_11052005",
  "email_id": "ks7872@srmist.edu.in",
  "college_roll_number": "RA2311026010779",
  "hierarchies": [...],
  "invalid_entries": [],
  "duplicate_edges": [],
  "summary": {
    "total_trees": 1,
    "total_cycles": 0,
    "largest_tree_root": "A"
  }
}
```

## Processing Rules Implemented

- ✅ Edge validation (`X->Y`, single uppercase A–Z, no self-loops, whitespace trimmed)
- ✅ Duplicate edge detection (first occurrence used, rest tracked once)
- ✅ Diamond / multi-parent: first parent edge wins, orphan nodes not emitted
- ✅ Cycle detection via DFS (gray/black coloring)
- ✅ Pure cycle → lexicographically smallest node as root
- ✅ Tree depth = longest root-to-leaf path node count
- ✅ `has_cycle` only included when `true`; omitted for normal trees
- ✅ `largest_tree_root` uses depth descending, lex tiebreaker
- ✅ Connected component grouping via union-find
- ✅ CORS enabled, responds in <3s for up to 50 nodes
