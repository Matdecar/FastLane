import { buildAdjacency, shortestPath } from './graph.js';
import { solveOpenTSP } from './tsp.js';

// Oriente l'ensemble du calcul : déduplique les rayons cibles, calcule la
// matrice de distances via Dijkstra, résout le TSP à chemin ouvert, puis
// reconstruit le chemin détaillé (nœud par nœud) pour le tracé visuel.
export function computeRoute({ storeData, produits, produitIdsSelectionnes }) {
  const rayonIds = [
    ...new Set(
      produits
        .filter((p) => produitIdsSelectionnes.includes(p.id))
        .map((p) => p.rayonId)
    ),
  ];

  const rayonById = new Map(storeData.rayons.map((r) => [r.id, r]));
  const targetNodeIds = rayonIds.map((id) => rayonById.get(id).nodeId);

  const adjacency = buildAdjacency(storeData.noeuds, storeData.aretes);
  const pointIds = ['entree', ...targetNodeIds, 'caisse'];
  const n = targetNodeIds.length;

  const distanceMatrix = [];
  const pathSegments = [];
  for (let i = 0; i < pointIds.length; i++) {
    distanceMatrix.push([]);
    pathSegments.push([]);
    for (let j = 0; j < pointIds.length; j++) {
      if (i === j) {
        distanceMatrix[i].push(0);
        pathSegments[i].push([pointIds[i]]);
        continue;
      }
      const { distance, path } = shortestPath(adjacency, pointIds[i], pointIds[j]);
      distanceMatrix[i].push(distance);
      pathSegments[i].push(path);
    }
  }

  if (n === 0) {
    return {
      rayonOrder: [],
      totalDistance: distanceMatrix[0][1],
      exact: true,
      detailedPath: pathSegments[0][1],
    };
  }

  const { order, totalDistance, exact } = solveOpenTSP(distanceMatrix, n);
  const ordreFinal = ramasserEnPassant(order, pointIds, pathSegments, distanceMatrix);

  const visitIndexOrder = [0, ...ordreFinal.map((i) => i + 1), pointIds.length - 1];
  const detailedPath = [];
  for (let k = 0; k < visitIndexOrder.length - 1; k++) {
    const from = visitIndexOrder[k];
    const to = visitIndexOrder[k + 1];
    const segment = pathSegments[from][to];
    detailedPath.push(...(k === 0 ? segment : segment.slice(1)));
  }

  return {
    rayonOrder: ordreFinal.map((i) => rayonIds[i]),
    totalDistance,
    exact,
    detailedPath,
  };
}

// Plusieurs ordres peuvent être aussi courts les uns que les autres. Entre
// eux, on préfère celui qui ramasse un rayon au moment où l'on passe devant
// plutôt que d'y revenir plus tard : même distance, mais le parcours se lit
// sans aller-retour inexplicable.
function ramasserEnPassant(order, pointIds, pathSegments, distanceMatrix) {
  const arrivee = pointIds.length - 1;
  const longueur = (ordre) => {
    let total = 0;
    let precedent = 0;
    for (const i of ordre) {
      total += distanceMatrix[precedent][i + 1];
      precedent = i + 1;
    }
    return total + distanceMatrix[precedent][arrivee];
  };

  let courant = [...order];
  let meilleure = longueur(courant);

  for (let progres = true; progres; ) {
    progres = false;
    const visites = [0, ...courant.map((i) => i + 1), arrivee];

    for (let p = 0; p < visites.length - 1 && !progres; p++) {
      // Nœuds simplement traversés sur ce tronçon, extrémités exclues.
      const traverses = pathSegments[visites[p]][visites[p + 1]].slice(1, -1);
      if (traverses.length === 0) continue;

      for (let k = p + 1; k < courant.length && !progres; k++) {
        if (!traverses.includes(pointIds[courant[k] + 1])) continue;

        const candidat = [...courant];
        const [deplace] = candidat.splice(k, 1);
        candidat.splice(p, 0, deplace);

        const total = longueur(candidat);
        if (total <= meilleure + 1e-9) {
          courant = candidat;
          meilleure = total;
          progres = true;
        }
      }
    }
  }

  return courant;
}
