import test from 'node:test';
import assert from 'node:assert/strict';
import { storeData } from '../src/store-data.js';
import { produits } from '../src/products-data.js';
import { buildAdjacency, shortestPath } from '../src/graph.js';

// Ces invariants sont ceux qu'on vérifiait à l'œil sur le rendu à chaque
// retouche du plan. Les figer ici évite qu'une correction de géométrie en
// casse une autre sans qu'on s'en aperçoive.

const noeudParId = new Map(storeData.noeuds.map((n) => [n.id, n]));
const rayonIds = new Set(storeData.rayons.map((r) => r.id));

function dansLeContour(x, y) {
  const pts = storeData.contour.points;
  let dedans = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}

function distanceAuMeuble(noeud, meuble) {
  const dx = Math.max(meuble.x - noeud.x, 0, noeud.x - (meuble.x + meuble.largeur));
  const dy = Math.max(meuble.y - noeud.y, 0, noeud.y - (meuble.y + meuble.hauteur));
  return Math.hypot(dx, dy);
}

test('toutes les arêtes relient des nœuds existants', () => {
  const orphelines = storeData.aretes.filter(
    (a) => !noeudParId.has(a.from) || !noeudParId.has(a.to)
  );
  assert.deepEqual(orphelines, []);
});

test('aucun couloir ne coupe en diagonale', () => {
  const diagonales = storeData.aretes.filter((a) => {
    const p = noeudParId.get(a.from);
    const q = noeudParId.get(a.to);
    return p.x !== q.x && p.y !== q.y;
  });
  assert.deepEqual(diagonales.map((a) => `${a.from} → ${a.to}`), []);
});

test('aucun nœud de circulation ne tombe dans un meuble', () => {
  const dedans = (n, m) =>
    n.x > m.x && n.x < m.x + m.largeur && n.y > m.y && n.y < m.y + m.hauteur;
  const fautifs = storeData.noeuds.filter((n) => storeData.meubles.some((m) => dedans(n, m)));
  assert.deepEqual(fautifs.map((n) => n.id), []);
});

test('meubles et nœuds restent à l\'intérieur du bâtiment', () => {
  const coins = (m) => [
    [m.x + 0.4, m.y + 0.4],
    [m.x + m.largeur - 0.4, m.y + 0.4],
    [m.x + 0.4, m.y + m.hauteur - 0.4],
    [m.x + m.largeur - 0.4, m.y + m.hauteur - 0.4],
  ];
  const meublesDehors = storeData.meubles.filter((m) =>
    coins(m).some(([x, y]) => !dansLeContour(x, y))
  );
  assert.deepEqual(meublesDehors.map((m) => m.label || m.rayonId || 'décor'), []);

  const noeudsDehors = storeData.noeuds.filter((n) => !dansLeContour(n.x, n.y));
  assert.deepEqual(noeudsDehors.map((n) => n.id), []);
});

test('chaque rayon est atteignable depuis l\'entrée', () => {
  const adjacence = buildAdjacency(storeData.noeuds, storeData.aretes);
  const isoles = storeData.rayons.filter(
    (r) => !Number.isFinite(shortestPath(adjacence, 'entree', r.nodeId).distance)
  );
  assert.deepEqual(isoles.map((r) => r.id), []);
});

test('le point d\'accès d\'un rayon est contre son meuble', () => {
  // Un accès placé à l'autre bout de l'allée ferait calculer un détour qui
  // n'existe pas dans le magasin.
  const TOLERANCE = 8;
  const eloignes = storeData.rayons
    .map((rayon) => {
      const noeud = noeudParId.get(rayon.nodeId);
      const siens = storeData.meubles.filter((m) => m.rayonId === rayon.id);
      return { rayon, ecart: Math.min(...siens.map((m) => distanceAuMeuble(noeud, m))) };
    })
    .filter(({ ecart }) => ecart > TOLERANCE);

  assert.deepEqual(eloignes.map(({ rayon, ecart }) => `${rayon.nom} (${ecart.toFixed(1)})`), []);
});

test('chaque rayon dessiné et chaque produit renvoient à un rayon connu', () => {
  const meublesInconnus = storeData.meubles.filter((m) => m.rayonId && !rayonIds.has(m.rayonId));
  assert.deepEqual([...new Set(meublesInconnus.map((m) => m.rayonId))], []);

  const produitsOrphelins = produits.filter((p) => !rayonIds.has(p.rayonId));
  assert.deepEqual(produitsOrphelins.map((p) => p.id), []);
});

test('aucun couloir n\'est modélisé deux fois', () => {
  // Deux arêtes qui se recouvrent géométriquement décrivent le même passage
  // physique. Elles ne sont pourtant reliées qu'à leurs extrémités : aller de
  // l'une à l'autre impose un détour qui n'existe pas dans le magasin, et le
  // tracé semble emprunter deux fois la même allée.
  const chevauche = (a1, a2, b1, b2) => Math.min(a2, b2) - Math.max(a1, b1) > 0.5;
  const segments = storeData.aretes.map((a) => ({
    a,
    p: noeudParId.get(a.from),
    q: noeudParId.get(a.to),
  }));

  const doublons = [];
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const [A, B] = [segments[i], segments[j]];
      const memeLigneH = A.p.y === A.q.y && B.p.y === B.q.y && A.p.y === B.p.y;
      const memeLigneV = A.p.x === A.q.x && B.p.x === B.q.x && A.p.x === B.p.x;
      const bornes = (s, axe) => [s.p[axe], s.q[axe]].sort((u, v) => u - v);

      if (memeLigneH && chevauche(...bornes(A, 'x'), ...bornes(B, 'x'))) {
        doublons.push(`${A.a.from}↔${A.a.to} / ${B.a.from}↔${B.a.to}`);
      }
      if (memeLigneV && chevauche(...bornes(A, 'y'), ...bornes(B, 'y'))) {
        doublons.push(`${A.a.from}↔${A.a.to} / ${B.a.from}↔${B.a.to}`);
      }
    }
  }

  assert.deepEqual(doublons, []);
});
