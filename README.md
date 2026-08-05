# FastLane
FastLane — calcule le chemin le plus rapide pour faire ses courses dans un supermarché.

## Fonctionnalités (V1)

- Carte du magasin (rayons, allées, entrée, caisse) affichée en SVG ou PNG surement.
- Liste de produits à cocher, groupée par rayon.
- Import d'une liste de courses au format texte (probablment), qui pré-coche automatiquement les produits reconnus.
- Calcul du chemin optimal (entrée → rayons sélectionnés → caisse) via Dijkstra.
- Affichage du trajet sur la carte et sous forme de liste d'étapes numérotée.

## Stack technique

JavaScript, HTML/CSS. La carte du magasin et le catalogue de produits sont 
des données fictives pour le moment.


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

Projet en cours de développement, également utilisé comme 
projet d'apprentissage (graphes, Dijkstra, programmation dynamique).
