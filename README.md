# FastLane
FastLane — calculates the fastest way to shop in a supermarket.

## Features (V1)

- Store map (shelves, aisles, entrance, cash register) displayed in SVG or PNG (maybe).
- List of products to check, grouped by department.
- Import a shopping list in text format (probably), which automatically pre-checks the recognized products.
- Optimal path calculation (input → selected radii → crate) via Dijkstra.
- Display of the route on the map and as a numbered list of stages.

## Stack technique

JavaScript, HTML/CSS. The store map and product catalog are fictionnal data for now.


## Structure du projet

```
fastlane/
├── index.html
├── style.css
├── src/
│   ├── store-data.js       # graphe du magasin (nœuds, arêtes, rayons, rectangles visuels)
│   ├── products-data.js    # catalogue produits
│   ├── graph.js            # Dijkstra + reconstruction de chemin
│   ├── tsp.js               # Held-Karp + repli nearest-neighbor/2-opt
│   ├── pathfinding.js        # orchestration : dédup rayons → matrice distances → TSP → chemin final
│   ├── list-import.js         # normalisation + correspondance des lignes uploadées avec le catalogue
│   ├── map-render.js           # rendu SVG de la carte + tracé du chemin
│   ├── ui.js                    # liste à cocher, upload, bouton, affichage résultat
│   └── app.js                     # point d'entrée, câblage des modules
└── tests/
```

## Statut

Project under development, also used as learning project (graphs, Dijkstra, dynamic programming).
