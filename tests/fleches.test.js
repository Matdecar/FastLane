import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { passagesDuTrajet, flechesEspacees } from '../src/map-render.js';
import { storeData } from '../src/store-data.js';
import { produits } from '../src/products-data.js';
import { computeRoute } from '../src/pathfinding.js';
import { parseShoppingListFile, matchShoppingList } from '../src/list-import.js';

// Les flèches de sens sont le point le plus fragile du rendu : deux passages
// voisins qui se rejoignent dans un angle, ou un aller et son retour qui
// partagent le même trait, posaient leurs flèches au même endroit.

function trajetExemple() {
  const chemin = new URL('../exemples/liste-courses.txt', import.meta.url);
  const lignes = parseShoppingListFile(readFileSync(chemin, 'utf8'));
  const ids = matchShoppingList(lignes, produits).matched.map((m) => m.produitId);
  const route = computeRoute({ storeData, produits, produitIdsSelectionnes: ids });

  const noeudParId = new Map(storeData.noeuds.map((n) => [n.id, n]));
  const sommets = route.detailedPath.map((id) => noeudParId.get(id));
  const passages = passagesDuTrajet(sommets);
  return { passages, fleches: flechesEspacees(passages) };
}

test('deux flèches ne se posent jamais l\'une sur l\'autre', () => {
  const { fleches } = trajetExemple();

  let ecartMinimal = Infinity;
  for (let i = 0; i < fleches.length; i++) {
    for (let j = i + 1; j < fleches.length; j++) {
      const ecart = Math.hypot(fleches[i].x - fleches[j].x, fleches[i].y - fleches[j].y);
      ecartMinimal = Math.min(ecartMinimal, ecart);
    }
  }

  assert.ok(fleches.length > 20, `trop peu de flèches posées : ${fleches.length}`);
  // Une flèche mesure environ 3 unités de long.
  assert.ok(ecartMinimal >= 4, `deux flèches à ${ecartMinimal.toFixed(2)} unités l'une de l'autre`);
});

test('un aller-retour indique ses deux sens', () => {
  const { passages, fleches } = trajetExemple();

  const surLeSegment = (f, p) => {
    const t = ((f.x - p.x1) * (p.x2 - p.x1) + (f.y - p.y1) * (p.y2 - p.y1)) / p.longueur ** 2;
    if (t < 0 || t > 1) return false;
    return Math.hypot(p.x1 + t * (p.x2 - p.x1) - f.x, p.y1 + t * (p.y2 - p.y1) - f.y) < 0.01;
  };

  const allersRetours = passages.filter((p) => p.total > 1 && p.rang === 0);
  const sensUnique = allersRetours.filter((p) => {
    const sens = new Set(fleches.filter((f) => surLeSegment(f, p)).map((f) => Math.round(f.angle)));
    return sens.size < 2;
  });

  assert.ok(allersRetours.length > 0, 'le trajet témoin ne comporte aucun aller-retour');
  // Les tronçons trop courts pour loger deux flèches sont tolérés.
  assert.ok(
    sensUnique.length <= allersRetours.length / 3,
    `${sensUnique.length} allers-retours sur ${allersRetours.length} n'indiquent qu'un sens`
  );
});
