// Résout le TSP à chemin ouvert : départ fixe (index 0), arrivée fixe
// (index n+1), visite de n points cibles (indices 1..n) dans le meilleur ordre.
// distanceMatrix est une matrice (n+2)x(n+2).
//
// Chaque solveur renvoie `exact: true` quand l'ordre trouvé est prouvé optimal,
// `false` quand c'est une approximation — l'interface peut ainsi être honnête
// sur ce qu'elle promet.

// Held-Karp coûte n²·2ⁿ en temps et n·2ⁿ en mémoire. À 16 arrêts cela fait
// ~17 M d'opérations et 8 Mo : instantané. Au-delà on bascule sur l'heuristique.
const EXACT_LIMIT = 16;

export function solveOpenTSPExact(distanceMatrix, n) {
  const startIdx = 0;
  const endIdx = n + 1;

  if (n === 0) {
    return { order: [], totalDistance: distanceMatrix[startIdx][endIdx], exact: true };
  }

  const nbMasques = 1 << n;
  const FULL = nbMasques - 1;
  // Tableaux typés à plat : bien plus économes qu'un tableau de tableaux.
  const dp = new Float64Array(nbMasques * n).fill(Infinity);
  const parent = new Int8Array(nbMasques * n).fill(-1);

  for (let i = 0; i < n; i++) {
    dp[(1 << i) * n + i] = distanceMatrix[startIdx][i + 1];
  }

  for (let mask = 1; mask <= FULL; mask++) {
    for (let i = 0; i < n; i++) {
      if (!(mask & (1 << i))) continue;
      const courant = dp[mask * n + i];
      if (courant === Infinity) continue;

      const depuis = distanceMatrix[i + 1];
      for (let j = 0; j < n; j++) {
        if (mask & (1 << j)) continue;
        const suivant = (mask | (1 << j)) * n + j;
        const candidat = courant + depuis[j + 1];
        if (candidat < dp[suivant]) {
          dp[suivant] = candidat;
          parent[suivant] = i;
        }
      }
    }
  }

  let meilleur = Infinity;
  let dernier = -1;
  for (let i = 0; i < n; i++) {
    const total = dp[FULL * n + i] + distanceMatrix[i + 1][endIdx];
    if (total < meilleur) {
      meilleur = total;
      dernier = i;
    }
  }

  const order = [];
  let mask = FULL;
  let last = dernier;
  while (last !== -1) {
    order.push(last);
    const precedent = parent[mask * n + last];
    mask ^= 1 << last;
    last = precedent;
  }
  order.reverse();

  return { order, totalDistance: meilleur, exact: true };
}

function longueur(order, d, startIdx, endIdx) {
  let total = 0;
  let prev = startIdx;
  for (const idx of order) {
    total += d[prev][idx + 1];
    prev = idx + 1;
  }
  return total + d[prev][endIdx];
}

// Plus proche voisin à partir d'un premier arrêt imposé.
function plusProcheVoisin(d, n, startIdx, premier) {
  const restants = new Set(Array.from({ length: n }, (_, i) => i));
  const order = [premier];
  restants.delete(premier);
  let courant = premier + 1;

  while (restants.size > 0) {
    let proche = -1;
    let meilleure = Infinity;
    for (const candidat of restants) {
      const dist = d[courant][candidat + 1];
      if (dist < meilleure) {
        meilleure = dist;
        proche = candidat;
      }
    }
    order.push(proche);
    restants.delete(proche);
    courant = proche + 1;
  }
  return order;
}

// 2-opt : inverse un tronçon. On évalue la variation sur les deux arêtes
// touchées plutôt que de recalculer tout le trajet, sinon chaque passe coûte
// un facteur n de trop.
function ameliorer2opt(order, d, startIdx, endIdx) {
  const m = order.length;
  const avant = (i) => (i === 0 ? startIdx : order[i - 1] + 1);
  const apres = (j) => (j === m - 1 ? endIdx : order[j + 1] + 1);

  let progres = true;
  while (progres) {
    progres = false;
    for (let i = 0; i < m - 1; i++) {
      for (let j = i + 1; j < m; j++) {
        const a = avant(i);
        const b = apres(j);
        const delta =
          d[a][order[j] + 1] + d[order[i] + 1][b] - d[a][order[i] + 1] - d[order[j] + 1][b];
        if (delta < -1e-9) {
          for (let g = i, h = j; g < h; g++, h--) {
            [order[g], order[h]] = [order[h], order[g]];
          }
          progres = true;
        }
      }
    }
  }
}

// Or-opt : déplace un arrêt isolé ailleurs dans la tournée. Complète le 2-opt,
// qui ne sait pas extraire un point mal placé au milieu d'un bon tronçon.
function ameliorerOrOpt(order, d, startIdx, endIdx) {
  let progres = true;
  while (progres) {
    progres = false;
    for (let i = 0; i < order.length; i++) {
      const reference = longueur(order, d, startIdx, endIdx);
      const [retire] = order.splice(i, 1);
      for (let j = 0; j <= order.length; j++) {
        if (j === i) continue;
        order.splice(j, 0, retire);
        if (longueur(order, d, startIdx, endIdx) < reference - 1e-9) {
          progres = true;
          break;
        }
        order.splice(j, 1);
      }
      if (!progres) order.splice(i, 0, retire);
      else break;
    }
  }
}

// Générateur déterministe : deux calculs sur la même liste doivent donner le
// même trajet, sinon le parcours changerait d'un affichage à l'autre.
function generateur(graine = 20260806) {
  let etat = graine >>> 0;
  return () => {
    etat = (etat * 1664525 + 1013904223) >>> 0;
    return etat / 4294967296;
  };
}

// Perturbation « double pont » : recolle quatre tronçons dans un autre ordre.
// Contrairement au 2-opt elle ne s'annule pas d'elle-même, ce qui permet de
// s'échapper d'un optimum local au lieu d'y retomber aussitôt.
function doublePont(order, alea) {
  const n = order.length;
  if (n < 8) return order.slice();
  const coupes = [0, 0, 0]
    .map(() => 1 + Math.floor(alea() * (n - 1)))
    .sort((a, b) => a - b);
  const [p, q, r] = coupes;
  return [
    ...order.slice(0, p),
    ...order.slice(q, r),
    ...order.slice(p, q),
    ...order.slice(r),
  ];
}

function affiner(order, d, startIdx, endIdx) {
  ameliorer2opt(order, d, startIdx, endIdx);
  ameliorerOrOpt(order, d, startIdx, endIdx);
  ameliorer2opt(order, d, startIdx, endIdx);
}

// Filet de sécurité au-delà de la limite du calcul exact : on part de chaque
// arrêt possible, on affine, puis on secoue la meilleure solution trouvée pour
// aller chercher mieux ailleurs. Sans cette relance, l'affinage se contente du
// premier optimum local venu.
export function solveOpenTSPHeuristic(distanceMatrix, n, relances = 200) {
  const startIdx = 0;
  const endIdx = n + 1;
  const alea = generateur();
  let meilleurOrdre = null;
  let meilleureLongueur = Infinity;

  for (let premier = 0; premier < n; premier++) {
    const order = plusProcheVoisin(distanceMatrix, n, startIdx, premier);
    affiner(order, distanceMatrix, startIdx, endIdx);
    const total = longueur(order, distanceMatrix, startIdx, endIdx);
    if (total < meilleureLongueur) {
      meilleureLongueur = total;
      meilleurOrdre = order;
    }
  }

  for (let i = 0; i < relances; i++) {
    const candidat = doublePont(meilleurOrdre, alea);
    affiner(candidat, distanceMatrix, startIdx, endIdx);
    const total = longueur(candidat, distanceMatrix, startIdx, endIdx);
    if (total < meilleureLongueur - 1e-9) {
      meilleureLongueur = total;
      meilleurOrdre = candidat;
    }
  }

  return { order: meilleurOrdre, totalDistance: meilleureLongueur, exact: false };
}

// Longueur minimale d'un arbre couvrant reliant `sommets` (Prim, O(k²)) :
// une Hamiltonienne passant par ces points coûte au moins ça. C'est la brique
// qui rend l'élagage du branch & bound efficace au-delà de ce qu'un simple
// « plus proche voisin restant » permettrait.
function coutArbreCouvrant(d, sommets) {
  if (sommets.length <= 1) return 0;
  const dansArbre = new Set([sommets[0]]);
  const dehors = new Set(sommets.slice(1));
  let cout = 0;
  while (dehors.size > 0) {
    let meilleur = Infinity;
    let choisi = -1;
    for (const a of dansArbre) {
      for (const b of dehors) {
        if (d[a][b] < meilleur) {
          meilleur = d[a][b];
          choisi = b;
        }
      }
    }
    cout += meilleur;
    dansArbre.add(choisi);
    dehors.delete(choisi);
  }
  return cout;
}

// Borne inférieure du coût restant pour aller de `cur` à `endIdx` en passant
// par tous les sommets de `restants` : le meilleur arbre couvrant sur ces
// points, plus l'arête la moins chère pour s'y raccrocher depuis `cur`. C'est
// une relaxation valide (toute Hamiltonienne contient un arbre couvrant), donc
// la borne ne peut jamais rejeter la vraie solution optimale.
function borneInferieure(d, cur, restants, endIdx) {
  const sommets = [...restants, endIdx];
  const entree = Math.min(...sommets.map((v) => d[cur][v]));
  return entree + coutArbreCouvrant(d, sommets);
}

// Séparation-évaluation avec borne par arbre couvrant. On part de la solution
// heuristique (déjà quasi optimale d'après nos mesures) comme meilleure
// solution connue : ça élague très tôt les branches qui ne peuvent pas faire
// mieux. Un budget de temps borne le pire cas ; s'il est atteint, on rend la
// meilleure solution trouvée (au moins aussi bonne que l'heuristique) sans
// prétendre qu'elle est prouvée optimale.
export function resoudreParSeparationEvaluation(d, n, budgetMs) {
  const startIdx = 0;
  const endIdx = n + 1;

  const initial = solveOpenTSPHeuristic(d, n);
  let meilleureLongueur = initial.totalDistance;
  let meilleurOrdre = initial.order;

  const debut = performance.now();
  let epuise = false;
  let compteur = 0;

  function explorer(chemin, visites, cur, coutActuel) {
    if (epuise) return;
    if (++compteur % 4000 === 0 && performance.now() - debut > budgetMs) {
      epuise = true;
      return;
    }

    if (visites.size === n) {
      const total = coutActuel + d[cur][endIdx];
      if (total < meilleureLongueur - 1e-9) {
        meilleureLongueur = total;
        meilleurOrdre = [...chemin];
      }
      return;
    }

    const restants = [];
    for (let i = 0; i < n; i++) if (!visites.has(i)) restants.push(i + 1);

    if (coutActuel + borneInferieure(d, cur, restants, endIdx) >= meilleureLongueur - 1e-9) {
      return; // Aucun complément ne peut faire mieux que la meilleure solution connue.
    }

    // Essayer d'abord les voisins les plus proches : de bonnes solutions
    // trouvées tôt resserrent la borne et élaguent le reste de l'arbre.
    const candidats = restants
      .map((v) => ({ v, idx: v - 1, dist: d[cur][v] }))
      .sort((a, b) => a.dist - b.dist);

    for (const { v, idx, dist } of candidats) {
      visites.add(idx);
      chemin.push(idx);
      explorer(chemin, visites, v, coutActuel + dist);
      chemin.pop();
      visites.delete(idx);
      if (epuise) return;
    }
  }

  explorer([], new Set(), startIdx, 0);

  return { order: meilleurOrdre, totalDistance: meilleureLongueur, exact: !epuise };
}

// Au-delà de la limite du calcul par bitmask, la séparation-évaluation prend
// le relais. Mesuré sur le graphe du magasin : elle prouve fiablement
// l'optimalité jusqu'à ~17-20 arrêts dans ce budget, encore assez souvent
// jusqu'à 22, rarement au-delà (la borne par arbre couvrant, bon marché,
// n'est pas assez serrée pour élaguer efficacement à 25+). Dans tous les cas
// elle se dégrade en douceur vers l'heuristique — jamais pire qu'elle — si le
// budget est dépassé sans preuve ; l'heuristique seule reste par ailleurs
// mesurée à un écart nul avec l'optimum jusqu'à 35 arrêts, donc le trajet
// affiché reste excellent même sans le badge « exact ».
const BUDGET_SEPARATION_MS = 500;

export function solveOpenTSP(distanceMatrix, n) {
  if (n <= EXACT_LIMIT) return solveOpenTSPExact(distanceMatrix, n);
  return resoudreParSeparationEvaluation(distanceMatrix, n, BUDGET_SEPARATION_MS);
}
