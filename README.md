# FastLane
FastLane — calculates the fastest way to shop in a supermarket.

## Features (V1)

- Store map (shelves, aisles, entrance, checkout) displayed in SVG or PNG (maybe).
- List of products to check, grouped by department.
- Import a shopping list in text format (probably), which automatically pre-checks the recognized products.
- Optimal path calculation (entrance → selected departments → checkout) via Dijkstra.
- Display of the route on the map and as a numbered list of stages.

## Tech stack

JavaScript, HTML/CSS. The store map and product catalog are fictional data for now.

## Project structure

```
fastlane/
├── index.html
├── style.css
├── src/
│   ├── store-data.js       # store graph (nodes, edges, departments, visual rectangles)
│   ├── products-data.js    # product catalog
│   ├── graph.js            # Dijkstra + path reconstruction
│   ├── tsp.js               # Held-Karp + nearest-neighbor/2-opt fallback
│   ├── pathfinding.js        # orchestration: dedup departments → distance matrix → TSP → final path
│   ├── list-import.js         # normalization + matching of uploaded lines against the catalog
│   ├── map-render.js           # SVG rendering of the map + route
│   ├── ui.js                    # checklist, upload, button, results display
│   └── app.js                     # entry point, module wiring
└── tests/
```

## Statut

Project under development, also used as learning project (graphs, Dijkstra, dynamic programming).
