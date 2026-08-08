import test from 'node:test';
import assert from 'node:assert/strict';
import { matchShoppingList, parseShoppingListFile } from '../src/list-import.js';

const produits = [
  { id: 'p1', nom: 'Lait demi-écrémé', rayonId: 'rayon-cremerie' },
  { id: 'p2', nom: 'Baguette', rayonId: 'rayon-boulangerie' },
  { id: 'p3', nom: 'Œufs', rayonId: 'rayon-cremerie' },
];

test('reconnaît les ligatures écrites au clavier', () => {
  const { matched, unmatched } = matchShoppingList(['oeufs', 'OEUFS'], produits);

  assert.deepEqual(matched.map((m) => m.produitId), ['p3', 'p3']);
  assert.equal(unmatched.length, 0);
});

test('retrouve un produit noté en tiret de liste', () => {
  const { matched } = matchShoppingList(['- Baguette'], produits);

  assert.deepEqual(matched.map((m) => m.produitId), ['p2']);
});

test('reconnaît les lignes malgré la casse et les accents', () => {
  const { matched, unmatched } = matchShoppingList(['LAIT DEMI-ECREME', 'baguette'], produits);

  assert.equal(matched.length, 2);
  assert.equal(unmatched.length, 0);
});

test('sépare les lignes non reconnues', () => {
  const { matched, unmatched } = matchShoppingList(['Baguette', 'Shampoing'], produits);

  assert.equal(matched.length, 1);
  assert.deepEqual(unmatched, ['Shampoing']);
});

test('ignore les lignes vides', () => {
  const { matched, unmatched } = matchShoppingList(['', 'Baguette', '   '], produits);

  assert.equal(matched.length, 1);
  assert.equal(unmatched.length, 0);
});

test('parseShoppingListFile découpe sur les retours à la ligne', () => {
  const lines = parseShoppingListFile('Baguette\nLait demi-écrémé\n');

  assert.deepEqual(lines, ['Baguette', 'Lait demi-écrémé', '']);
});
