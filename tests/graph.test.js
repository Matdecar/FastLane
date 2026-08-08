import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAdjacency, shortestPath } from '../src/graph.js';

test('shortestPath prend l\'arête directe quand elle est plus courte', () => {
  const noeuds = [
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 3, y: 0 },
    { id: 'c', x: 3, y: 4 },
  ];
  const aretes = [
    { from: 'a', to: 'b' },
    { from: 'b', to: 'c' },
    { from: 'a', to: 'c' },
  ];
  const adjacency = buildAdjacency(noeuds, aretes);
  const { distance, path } = shortestPath(adjacency, 'a', 'c');

  assert.equal(distance, 5);
  assert.deepEqual(path, ['a', 'c']);
});

test('shortestPath fait un détour quand il n\'y a pas d\'arête directe', () => {
  const noeuds = [
    { id: 'a', x: 0, y: 0 },
    { id: 'b', x: 1, y: 0 },
    { id: 'c', x: 2, y: 0 },
  ];
  const aretes = [
    { from: 'a', to: 'b' },
    { from: 'b', to: 'c' },
  ];
  const adjacency = buildAdjacency(noeuds, aretes);
  const { distance, path } = shortestPath(adjacency, 'a', 'c');

  assert.equal(distance, 2);
  assert.deepEqual(path, ['a', 'b', 'c']);
});

test('shortestPath retourne un chemin d\'un seul nœud quand départ = arrivée', () => {
  const noeuds = [{ id: 'a', x: 0, y: 0 }];
  const adjacency = buildAdjacency(noeuds, []);
  const { distance, path } = shortestPath(adjacency, 'a', 'a');

  assert.equal(distance, 0);
  assert.deepEqual(path, ['a']);
});
