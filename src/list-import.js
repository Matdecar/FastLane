function normalize(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // NFD ne d\u00e9fait pas les ligatures : sans cela \u00ab oeufs \u00bb, tel qu'on
    // l'\u00e9crit au clavier, ne rejoindrait jamais \u00ab \u0152ufs \u00bb du catalogue.
    .replace(/\u0153/gi, 'oe')
    .replace(/\u00e6/gi, 'ae')
    .toLowerCase()
    .trim();
}

export function parseShoppingListFile(text) {
  return text.split(/\r?\n/);
}

// Correspondance simple : égalité stricte après normalisation, puis repli
// sur une inclusion dans un sens ou l'autre. Une distance de Levenshtein
// serait une amélioration possible mais n'est pas nécessaire en V1.
export function matchShoppingList(lines, produits) {
  const matched = [];
  const unmatched = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const normalizedLine = normalize(line);
    const product =
      produits.find((p) => normalize(p.nom) === normalizedLine) ||
      produits.find((p) => {
        const normalizedName = normalize(p.nom);
        return normalizedLine.includes(normalizedName) || normalizedName.includes(normalizedLine);
      });

    if (product) {
      matched.push({ line, produitId: product.id });
    } else {
      unmatched.push(line);
    }
  }

  return { matched, unmatched };
}
