import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRoute } from '../src/pathfinding.js';

const storeData = {
  noeuds: [
    { id: 'entree', x: 0, y: 0, type: 'entree' },
    { id: 'i1', x: 10, y: 0, type: 'intersection' },
    { id: 'acces-a', x: 10, y: 10, type: 'acces-rayon' },
    { id: 'i2', x: 20, y: 0, type: 'intersection' },
    { id: 'acces-b', x: 20, y: 10, type: 'acces-rayon' },
    { id: 'caisse', x: 30, y: 0, type: 'caisse' },
  ],
  aretes: [
    { from: 'entree', to: 'i1' },
    { from: 'i1', to: 'acces-a' },
    { from: 'i1', to: 'i2' },
    { from: 'i2', to: 'acces-b' },
    { from: 'i2', to: 'caisse' },
  ],
  rayons: [
    { id: 'rayon-a', nom: 'Rayon A', nodeId: 'acces-a' },
    { id: 'rayon-b', nom: 'Rayon B', nodeId: 'acces-b' },
  ],
};

const produits = [
  { id: 'p1', nom: 'Produit 1', rayonId: 'rayon-a' },
  { id: 'p2', nom: 'Produit 2', rayonId: 'rayon-a' },
  { id: 'p3', nom: 'Produit 3', rayonId: 'rayon-b' },
];

test('déduplique deux produits du même rayon en un seul arrêt', () => {
  const result = computeRoute({
    storeData,
    produits,
    produitIdsSelectionnes: ['p1', 'p2'],
  });

  assert.deepEqual(result.rayonOrder, ['rayon-a']);
});

test('gère le cas où aucun produit n\'est sélectionné', () => {
  const result = computeRoute({
    storeData,
    produits,
    produitIdsSelectionnes: [],
  });

  assert.deepEqual(result.rayonOrder, []);
  assert.ok(result.totalDistance > 0);
  assert.deepEqual(result.detailedPath[0], 'entree');
  assert.deepEqual(result.detailedPath.at(-1), 'caisse');
});

test('visite les deux rayons dans le bon ordre quand les deux sont sélectionnés', () => {
  const result = computeRoute({
    storeData,
    produits,
    produitIdsSelectionnes: ['p1', 'p3'],
  });

  assert.deepEqual(result.rayonOrder, ['rayon-a', 'rayon-b']);
  assert.deepEqual(result.detailedPath[0], 'entree');
  assert.deepEqual(result.detailedPath.at(-1), 'caisse');
});

// ---------------------------------------------------------------------------
// Vérification sur le vrai magasin : à distance égale, le parcours doit
// ramasser un rayon quand il passe devant. Sans ce départage, le solveur
// renvoyait un ordre aussi court mais qui repassait plus tard au même endroit,
// ce qui est incompréhensible sur la carte.

import { storeData as magasin } from '../src/store-data.js';
import { produits as catalogue } from '../src/products-data.js';
import { buildAdjacency, shortestPath } from '../src/graph.js';

test('le trajet ne traverse jamais un arrêt qu\'il lui reste à faire', () => {
  const selection = catalogue.filter((_, i) => i % 3 === 0).map((p) => p.id);
  const route = computeRoute({
    storeData: magasin,
    produits: catalogue,
    produitIdsSelectionnes: selection,
  });

  const adjacence = buildAdjacency(magasin.noeuds, magasin.aretes);
  const noeudDe = new Map(magasin.rayons.map((r) => [r.id, r.nodeId]));
  const etapes = ['entree', ...route.rayonOrder.map((id) => noeudDe.get(id)), 'caisse'];

  const traversees = [];
  for (let i = 0; i < etapes.length - 1; i++) {
    const traverses = shortestPath(adjacence, etapes[i], etapes[i + 1]).path.slice(1, -1);
    for (let k = i + 1; k < route.rayonOrder.length; k++) {
      if (traverses.includes(noeudDe.get(route.rayonOrder[k]))) {
        traversees.push(route.rayonOrder[k]);
      }
    }
  }

  assert.deepEqual(traversees, []);
});
