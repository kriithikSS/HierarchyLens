# SRM BFHL API — Full Stack Challenge

A REST API that processes hierarchical node relationships and returns structured tree insights.

## Live URLs

- **API**: `https://hierarchylens-api.onrender.com/bfhl`
- **Frontend**: `https://hierarchylens-api.onrender.com`
- **GitHub**: `https://github.com/kriithikSS/HierarchyLens`

## Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla HTML/CSS/JS (no framework dependencies)
- **Hosting**: Render (API) + Netlify (Frontend)

## Local Development

### Backend (API)
```bash
cd server
npm install
npm run dev          # http://localhost:3001
```

### Frontend
```bash
# Just open client/index.html in a browser, or serve with:
npx serve client
```

## API Reference

### POST /bfhl

**Request**
```json
{
  "data": ["A->B", "A->C", "B->D", "X->Y", "Y->Z", "Z->X"]
}
```

**Response**
```json
{
  "user_id": "krishnavamsi_24042000",
  "email_id": "krishnavamsi@srmist.edu.in",
  "college_roll_number": "RA2211003010001",
  "hierarchies": [...],
  "invalid_entries": [],
  "duplicate_edges": [],
  "summary": {
    "total_trees": 1,
    "total_cycles": 1,
    "largest_tree_root": "A"
  }
}
```

## Processing Rules Implemented

- ✅ Edge validation (single uppercase A-Z, `X->Y` format, no self-loops)
- ✅ Duplicate edge detection (first occurrence used, rest tracked)
- ✅ Diamond/multi-parent: first parent edge wins
- ✅ Cycle detection via DFS
- ✅ Pure cycle → lexicographically smallest node as root
- ✅ Tree depth = longest root-to-leaf path node count
- ✅ `has_cycle` only included when true
- ✅ Summary: `largest_tree_root` uses lex tiebreaker
- ✅ CORS enabled
- ✅ Responds in <3s for up to 50 nodes
