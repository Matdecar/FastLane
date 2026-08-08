// Construit une liste d'adjacence à partir des nœuds/arêtes du magasin,
// avec un poids calculé automatiquement (distance euclidienne).
export function buildAdjacency(noeuds, aretes) {
  const nodeById = new Map(noeuds.map((n) => [n.id, n]));
  const adjacency = new Map(noeuds.map((n) => [n.id, []]));

  for (const { from, to } of aretes) {
    const a = nodeById.get(from);
    const b = nodeById.get(to);
    const poids = Math.hypot(a.x - b.x, a.y - b.y);
    adjacency.get(from).push({ to, poids });
    adjacency.get(to).push({ to: from, poids });
  }

  return adjacency;
}

// Dijkstra "classique" en O(V^2) : largement suffisant pour un graphe
// de magasin (quelques dizaines de nœuds).
export function dijkstra(adjacency, startId) {
  const distances = new Map();
  const previous = new Map();
  const visited = new Set();

  for (const id of adjacency.keys()) distances.set(id, Infinity);
  distances.set(startId, 0);

  while (visited.size < adjacency.size) {
    let currentId = null;
    let currentDist = Infinity;
    for (const [id, dist] of distances) {
      if (!visited.has(id) && dist < currentDist) {
        currentId = id;
        currentDist = dist;
      }
    }
    if (currentId === null) break;
    visited.add(currentId);

    for (const { to, poids } of adjacency.get(currentId)) {
      const candidate = currentDist + poids;
      if (candidate < distances.get(to)) {
        distances.set(to, candidate);
        previous.set(to, currentId);
      }
    }
  }

  return { distances, previous };
}

export function reconstructPath(previous, startId, endId) {
  if (startId === endId) return [startId];
  const path = [endId];
  let current = endId;
  while (current !== startId) {
    current = previous.get(current);
    if (current === undefined) return null;
    path.push(current);
  }
  return path.reverse();
}

export function shortestPath(adjacency, startId, endId) {
  const { distances, previous } = dijkstra(adjacency, startId);
  return {
    distance: distances.get(endId),
    path: reconstructPath(previous, startId, endId),
  };
}
