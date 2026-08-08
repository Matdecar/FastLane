// Rendu de la carte du magasin en SVG.
//
// Deux couches distinctes :
//  - les meubles (`storeData.meubles`), purement graphiques, qui reproduisent
//    la disposition dessinée sur le croquis ;
//  - le tracé du parcours, recalculé à chaque calcul de chemin.
// Un meuble porte un `rayonId` quand il correspond à un rayon de la liste de
// courses, ce qui permet de le mettre en évidence quand le parcours y passe.

const SVG_NS = 'http://www.w3.org/2000/svg';
const ENTREE_COULEUR = '#2f6b4f';
const CAISSE_COULEUR = '#d64545';

// Le dimensionnement du texte est posé en attributs de présentation SVG :
// ils ont la spécificité la plus faible, donc la feuille de style continue de
// primer pour le thème, mais la carte reste lisible même si le CSS n'est pas
// (encore) appliqué.
const TAILLE_LABEL = 2.7;
const TAILLE_LABEL_MIN = 1.7;
const ESPACEMENT_FLECHES = 15;
// Une flèche mesure environ 3 unités : en deçà de cet écart, deux flèches se
// touchent et le sens devient illisible.
const ECART_MIN_FLECHES = 4.5;

const ATTRS_TEXTE = {
  'text-anchor': 'middle',
  'dominant-baseline': 'middle',
  'font-weight': 700,
  fill: '#ffffff',
};

function el(tag, attrs = {}, textContent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== null && value !== undefined) node.setAttribute(key, value);
  }
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

// Choisit le sens d'écriture et la taille du libellé d'un meuble.
//
// Le quart de tour de la scène échange les dimensions : ce qui est la hauteur
// du meuble en coordonnées d'origine devient sa largeur à l'écran. On écrit
// horizontalement dès que le texte y tient — c'est plus lisible — et on ne
// bascule dans le sens de la longueur qu'en dernier recours, en réduisant la
// taille si même là il déborde.
function poseDuLabel(meuble) {
  const largeurEcran = meuble.hauteur;
  const hauteurEcran = meuble.largeur;
  const largeurTexte = (taille) => meuble.label.length * taille * 0.62;

  if (largeurTexte(TAILLE_LABEL) <= largeurEcran - 1.5) {
    return { horizontal: true, taille: TAILLE_LABEL };
  }
  if (largeurTexte(TAILLE_LABEL) <= hauteurEcran - 1.5) {
    return { horizontal: false, taille: TAILLE_LABEL };
  }

  const horizontal = largeurEcran >= hauteurEcran;
  const place = Math.max(largeurEcran, hauteurEcran) - 1.5;
  const taille = Math.max(TAILLE_LABEL_MIN, place / (meuble.label.length * 0.62));
  return { horizontal, taille };
}

function renderMeuble(layer, meuble) {
  const groupe = el('g', {
    class: 'meuble',
    'data-rayon': meuble.rayonId ?? '',
    style: `--teinte:${meuble.couleur}`,
  });

  groupe.appendChild(el('rect', {
    x: meuble.x,
    y: meuble.y,
    width: meuble.largeur,
    height: meuble.hauteur,
    rx: 1.2,
    class: 'meuble-fond',
    fill: meuble.couleur,
  }));

  if (!meuble.label) {
    layer.appendChild(groupe);
    return;
  }

  const cx = meuble.x + meuble.largeur / 2;
  const cy = meuble.y + meuble.hauteur / 2;

  const { horizontal, taille } = poseDuLabel(meuble);

  groupe.appendChild(el('text', {
    x: cx,
    y: cy,
    class: 'meuble-label',
    transform: horizontal ? `rotate(90, ${cx}, ${cy})` : null,
    ...ATTRS_TEXTE,
    'font-size': taille,
  }, meuble.label));

  layer.appendChild(groupe);
}

function renderCaisses(layer, caisses) {
  for (const caisse of caisses) {
    layer.appendChild(el('rect', {
      x: caisse.x,
      y: caisse.y,
      width: caisse.largeur,
      height: caisse.hauteur,
      rx: 1,
      class: 'caisse-meuble',
      fill: '#ffffff', stroke: '#5b5346', 'stroke-width': 0.4,
    }));
  }
}

// Le libellé est posé à côté de la pastille (et non dedans) : à cette échelle
// « Entrée » ou « Caisse » ne tiendrait pas dans un disque lisible.
function renderRepere(layer, noeud, label, couleur, decalage) {
  const groupe = el('g', {
    transform: `translate(${noeud.x}, ${noeud.y})`,
    class: 'repere',
  });
  groupe.appendChild(el('circle', { r: 3.5, fill: couleur }));
  // Redressé pour rester horizontal malgré le quart de tour de la scène.
  groupe.appendChild(el('text', {
    x: decalage.x ?? 0,
    y: decalage.y ?? 0,
    class: 'repere-label',
    transform: `rotate(90, ${decalage.x ?? 0}, ${decalage.y ?? 0})`,
    ...ATTRS_TEXTE,
    'font-size': 4.2,
    'font-weight': 800,
    fill: couleur,
  }, label));
  layer.appendChild(groupe);
}

export function renderStoreMap(svgElement, storeData) {
  svgElement.innerHTML = '';
  const { largeur, hauteur, points } = storeData.contour;

  // Le magasin est décrit dans l'orientation du croquis (plus haut que large).
  // On le présente en paysage par un quart de tour appliqué au rendu, ce qui
  // évite de dupliquer les coordonnées : (x, y) devient (y, largeur - x).
  svgElement.setAttribute('viewBox', `${-3} ${-3} ${hauteur + 6} ${largeur + 6}`);
  svgElement.setAttribute('role', 'img');
  svgElement.setAttribute('aria-label', 'Carte du magasin');

  const scene = el('g', {
    class: 'scene',
    transform: `translate(0, ${largeur}) rotate(-90)`,
  });
  svgElement.appendChild(scene);

  scene.appendChild(el('polygon', {
    points: points.map(([px, py]) => `${px},${py}`).join(' '),
    class: 'sol-magasin',
    fill: '#f4f0e7', stroke: '#d8cfbe', 'stroke-width': 0.8, 'stroke-linejoin': 'round',
  }));

  // Les couloirs de circulation, dessinés en fond pour donner la trame.
  const noeudById = new Map(storeData.noeuds.map((n) => [n.id, n]));
  const couloirs = el('g', { class: 'couche-couloirs' });
  for (const arete of storeData.aretes) {
    const a = noeudById.get(arete.from);
    const b = noeudById.get(arete.to);
    couloirs.appendChild(el('line', {
      x1: a.x, y1: a.y, x2: b.x, y2: b.y,
      class: 'couloir',
      stroke: '#ffffff', 'stroke-width': 3.5, 'stroke-linecap': 'round',
    }));
  }
  scene.appendChild(couloirs);

  const meublesLayer = el('g', { class: 'couche-meubles' });
  for (const meuble of storeData.meubles) renderMeuble(meublesLayer, meuble);
  renderCaisses(meublesLayer, storeData.caisses);
  scene.appendChild(meublesLayer);

  const reperes = el('g', { class: 'couche-reperes' });
  // Décalages exprimés avant le quart de tour : (dx, dy) se lit (dy, -dx) à
  // l'écran. Les deux libellés sont ainsi posés sous leur pastille.
  renderRepere(reperes, noeudById.get('entree'), 'Entrée', ENTREE_COULEUR, { x: -9 });
  renderRepere(reperes, noeudById.get('caisse'), 'Caisses', CAISSE_COULEUR, { x: -9 });
  scene.appendChild(reperes);
}

// Découpe le trajet en passages. Une allée empruntée deux fois n'est tracée
// qu'une seule fois — doubler le trait l'épaissirait sans rien apprendre —
// mais chaque passage garde son sens pour placer ses propres flèches.
export function passagesDuTrajet(sommets) {
  const comptes = new Map();
  const passages = [];

  for (let i = 0; i < sommets.length - 1; i++) {
    const a = sommets[i];
    const b = sommets[i + 1];
    if (a.x === b.x && a.y === b.y) continue;

    const cle = [a.id, b.id].sort().join('|');
    const rang = comptes.get(cle) ?? 0;
    comptes.set(cle, rang + 1);

    passages.push({
      x1: a.x, y1: a.y, x2: b.x, y2: b.y,
      cle, rang,
      premier: rang === 0,
      longueur: Math.hypot(b.x - a.x, b.y - a.y),
      angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
    });
  }

  return passages.map((p) => ({ ...p, total: comptes.get(p.cle) }));
}

// Positions possibles d'une flèche le long d'un passage, marges comprises.
function positionsPossibles(passage, nombre = 16) {
  const dx = (passage.x2 - passage.x1) / passage.longueur;
  const dy = (passage.y2 - passage.y1) / passage.longueur;
  const marge = Math.min(2, passage.longueur / 4);

  return Array.from({ length: nombre }, (_, i) => {
    const d = marge + ((passage.longueur - 2 * marge) * i) / (nombre - 1);
    return { x: passage.x1 + dx * d, y: passage.y1 + dy * d, angle: passage.angle };
  });
}

// Place les flèches une par une en choisissant, pour chacune, l'endroit le
// plus dégagé du passage. Deux écueils sont à éviter : les passages voisins
// qui se rejoignent dans un angle y posent chacun une flèche, et un aller et
// son retour partagent désormais le même trait. Chercher la place libre plutôt
// que d'imposer une position permet de garder les deux sens visibles.
export function flechesEspacees(passages, ecartMin = ECART_MIN_FLECHES) {
  const retenues = [];
  const degagement = (c) =>
    retenues.reduce((mini, a) => Math.min(mini, Math.hypot(a.x - c.x, a.y - c.y)), Infinity);

  for (const passage of passages) {
    const voulues = Math.max(1, Math.round(passage.longueur / ESPACEMENT_FLECHES));
    for (let k = 0; k < voulues; k++) {
      const meilleure = positionsPossibles(passage).reduce((a, b) =>
        degagement(b) > degagement(a) ? b : a
      );
      if (degagement(meilleure) < ecartMin) break;
      retenues.push(meilleure);
    }
  }

  return retenues;
}

export function renderRoute(svgElement, storeData, routeResult) {
  const scene = svgElement.querySelector('.scene');
  svgElement.querySelector('.couche-trace')?.remove();
  for (const meuble of svgElement.querySelectorAll('.meuble')) {
    meuble.classList.remove('meuble-visite');
  }

  const visites = new Set(routeResult.rayonOrder);
  for (const meuble of svgElement.querySelectorAll('.meuble')) {
    if (visites.has(meuble.dataset.rayon)) meuble.classList.add('meuble-visite');
  }

  const layer = el('g', { class: 'couche-trace' });
  const noeudById = new Map(storeData.noeuds.map((n) => [n.id, n]));

  const sommets = routeResult.detailedPath.map((id) => noeudById.get(id));
  const passages = passagesDuTrajet(sommets);
  const tracesUniques = passages.filter((p) => p.premier);

  // Le halo passe d'abord sur tout le tracé, puis le trait : les croisements
  // restent nets au lieu de se hacher mutuellement.
  for (const style of ['trace-halo', 'trace']) {
    const halo = style === 'trace-halo';
    for (const passage of tracesUniques) {
      layer.appendChild(el('line', {
        x1: passage.x1, y1: passage.y1, x2: passage.x2, y2: passage.y2,
        class: style,
        fill: 'none',
        stroke: halo ? '#ffffff' : '#d64545',
        'stroke-width': halo ? 3.4 : 1.5,
        'stroke-linecap': 'round',
      }));
    }
  }

  for (const fleche of flechesEspacees(passages)) {
    layer.appendChild(el('path', {
      d: 'M -1.1 -1.35 L 1.7 0 L -1.1 1.35 Z',
      class: 'fleche-sens',
      transform: `translate(${fleche.x}, ${fleche.y}) rotate(${fleche.angle})`,
      fill: '#d64545', stroke: '#ffffff', 'stroke-width': 0.45, 'stroke-linejoin': 'round',
    }));
  }

  // Deux rayons peuvent partager un point d'accès (même allée) : on décale
  // les pastilles suivantes pour qu'elles restent lisibles.
  const rayonById = new Map(storeData.rayons.map((r) => [r.id, r]));
  const occupations = new Map();
  routeResult.rayonOrder.forEach((rayonId, index) => {
    const noeud = noeudById.get(rayonById.get(rayonId).nodeId);
    const deja = occupations.get(noeud.id) ?? 0;
    occupations.set(noeud.id, deja + 1);

    const marqueur = el('g', {
      transform: `translate(${noeud.x + deja * 9}, ${noeud.y})`,
      class: 'marqueur-etape',
      'data-etape': index,
    });
    marqueur.appendChild(el('circle', { r: 4, fill: '#d64545' }));
    marqueur.appendChild(el('text', {
      transform: 'rotate(90)',
      ...ATTRS_TEXTE,
      'dominant-baseline': 'central',
      'font-size': 3.6,
      'font-weight': 800,
    }, String(index + 1)));
    layer.appendChild(marqueur);
  });

  scene.appendChild(layer);
}

// Reflète sur la carte l'avancement des courses : les arrêts déjà faits
// s'estompent, celui qu'on regarde dans la liste ressort. C'est ce qui permet
// de savoir où l'on en est sans relire tout le parcours.
export function refleterProgression(svgElement, { faits = new Set(), actif = null } = {}) {
  for (const marqueur of svgElement.querySelectorAll('.marqueur-etape')) {
    const index = Number(marqueur.dataset.etape);
    marqueur.classList.toggle('etape-faite', faits.has(index));
    marqueur.classList.toggle('etape-active', index === actif);
  }
}
