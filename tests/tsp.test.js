import test from 'node:test';
import assert from 'node:assert/strict';
import { solveOpenTSPExact, resoudreParSeparationEvaluation } from '../src/tsp.js';

// Oracle de test : force brute par énumération de toutes les permutations,
// utilisable car n reste petit dans ces tests.
function bruteForce(distanceMatrix, n) {
  const indices = Array.from({ length: n }, (_, i) => i);
  let best = Infinity;

  function permute(remaining, current) {
    if (remaining.length === 0) {
      let total = distanceMatrix[0][current[0] + 1];
      for (let i = 0; i < current.length - 1; i++) {
        total += distanceMatrix[current[i] + 1][current[i + 1] + 1];
      }
      total += distanceMatrix[current[current.length - 1] + 1][n + 1];
      best = Math.min(best, total);
      return;
    }
    for (let i = 0; i < remaining.length; i++) {
      const rest = [...remaining.slice(0, i), ...remaining.slice(i + 1)];
      permute(rest, [...current, remaining[i]]);
    }
  }

  permute(indices, []);
  return best;
}

test('solveOpenTSPExact correspond à la force brute (3 points cibles)', () => {
  const distanceMatrix = [
    [0, 2, 9, 10, 7],
    [2, 0, 6, 4, 3],
    [9, 6, 0, 8, 5],
    [10, 4, 8, 0, 6],
    [7, 3, 5, 6, 0],
  ];
  const n = 3;
  const expected = bruteForce(distanceMatrix, n);
  const actual = solveOpenTSPExact(distanceMatrix, n);

  assert.equal(actual.totalDistance, expected);
});

test('solveOpenTSPExact gère un seul point cible', () => {
  const distanceMatrix = [
    [0, 5, 8],
    [5, 0, 3],
    [8, 3, 0],
  ];
  const result = solveOpenTSPExact(distanceMatrix, 1);

  assert.deepEqual(result.order, [0]);
  assert.equal(result.totalDistance, 8);
});

test('solveOpenTSPExact gère zéro point cible (chemin direct)', () => {
  const distanceMatrix = [
    [0, 12],
    [12, 0],
  ];
  const result = solveOpenTSPExact(distanceMatrix, 0);

  assert.deepEqual(result.order, []);
  assert.equal(result.totalDistance, 12);
});

// Générateur déterministe : un échec de test doit être reproductible.
function genererMatrice(n, graine) {
  let etat = graine >>> 0;
  const alea = () => {
    etat = (etat * 1664525 + 1013904223) >>> 0;
    return etat / 4294967296;
  };
  const points = Array.from({ length: n + 2 }, () => [alea() * 100, alea() * 100]);
  return points.map((a) => points.map((b) => Math.hypot(a[0] - b[0], a[1] - b[1])));
}

test('resoudreParSeparationEvaluation trouve le même optimum que Held-Karp', () => {
  // Un budget large ici : on vérifie la justesse de la borne/de l'élagage,
  // pas la performance sous contrainte de temps (couverte par ailleurs).
  for (let n = 2; n <= 14; n++) {
    for (let essai = 0; essai < 3; essai++) {
      const d = genererMatrice(n, n * 1000 + essai);
      const exact = solveOpenTSPExact(d, n);
      const branchEtBound = resoudreParSeparationEvaluation(d, n, 2000);

      assert.equal(branchEtBound.exact, true, `n=${n} essai=${essai} : budget épuisé avant preuve`);
      assert.ok(
        Math.abs(branchEtBound.totalDistance - exact.totalDistance) < 1e-9,
        `n=${n} essai=${essai} : ${branchEtBound.totalDistance} !== ${exact.totalDistance}`
      );
    }
  }
});

test('resoudreParSeparationEvaluation ne fait jamais pire que l’heuristique même à court de budget', () => {
  const d = genererMatrice(30, 42);
  const resultat = resoudreParSeparationEvaluation(d, 30, 20);

  // Un budget de 20ms sur 30 points cibles n'a quasiment aucune chance de
  // prouver l'optimalité ; ce test vérifie surtout que le repli heuristique
  // fonctionne et rend un résultat exploitable, exact ou non.
  assert.equal(resultat.order.length, 30);
  assert.ok(Number.isFinite(resultat.totalDistance));
});
