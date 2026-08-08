// Magasin reconstruit d'après le croquis (même orientation que le dessin) :
//
//   haut   = mur du fond (surgelés, viandes)
//   gauche = boulangerie en haut, ligne de caisses en dessous, entrée/sortie
//   droite = comptoirs boucherie et poissonnerie
//   centre = grille principale, allées HORIZONTALES en deux colonnes
//   bas    = zone non-alimentaire (allées verticales) + apéro
//
// Circulation : on ne traverse pas une allée, on la contourne. Les couloirs
// horizontaux (COULOIRS_Y) relient les colonnes ; seuls les couloirs
// verticaux gauche / central / droit permettent de monter et descendre.
//
// Une allée à double face est dessinée en deux bandes : chaque bande est
// desservie par le couloir qui la longe. Deux bandes portant le même nom
// (ex. « Crèmerie » des deux côtés d'un couloir) renvoient au même rayon.
//
// Hypothèses de lecture du croquis, à confirmer sur place :
// - « TAPETERIE » lu comme Papeterie, « VIANDES INDU » comme Viandes.
// - Les têtes de gondole « PROMO » sont dessinées mais ne sont pas des
//   rayons de la liste de courses (on n'y va pas pour un produit précis).
// - Le petit encart « Règle » et les cases hachurées ne sont pas identifiables.

// ---------------------------------------------------------------- géométrie

const X_CG = 26;   // couloir vertical gauche (devant les caisses)
const X_LA = 56;   // accès aux allées de la colonne gauche
const X_CM = 86;   // couloir vertical central
const X_RA = 115;  // accès aux allées de la colonne droite
const X_CD = 144;  // couloir vertical droit (devant les comptoirs)

const COULOIRS_Y = [20, 34, 48, 62, 76, 90, 104, 118, 132];
const COLONNES_X = [X_CG, X_LA, X_CM, X_RA, X_CD];
const COLONNES_TRAVERSANTES = [X_CG, X_CM, X_CD];

const BARRE_G = { x: 32, largeur: 48 };
const BARRE_D = { x: 92, largeur: 46 };

const COULEURS = {
  frais: '#4f82a6',
  surgele: '#5d6d8c',
  viande: '#a6404f',
  poisson: '#2f6b78',
  primeur: '#6b8e4e',
  boulangerie: '#c97c3d',
  epicerie: '#b98f1d',
  boisson: '#3e8a87',
  bazar: '#7a6a58',
  promo: '#e8a93b',
  caisse: '#8a8378',
  accueil: '#4c6b8a',
  pilier: '#6b6259',
};

const noeuds = [];
const aretes = [];

// Le bac à fruits et légumes occupe deux hauteurs d'allée côté droit : à ce
// niveau on ne traverse pas la colonne de droite (mais le couloir vertical
// longe les bacs par la droite, il reste donc continu).
const NIVEAU_BACS = 34;

for (const y of COULOIRS_Y) {
  const colonnes = y === NIVEAU_BACS ? [X_CG, X_LA, X_CM, X_CD] : COLONNES_X;
  for (const x of colonnes) {
    noeuds.push({
      id: `g-${x}-${y}`,
      x,
      y,
      type: x === X_LA || x === X_RA ? 'acces-rayon' : 'intersection',
    });
  }
  for (let i = 0; i < colonnes.length - 1; i++) {
    // Pas de traversée entre le couloir central et le couloir droit au niveau
    // des bacs : les meubles barrent le passage.
    if (y === NIVEAU_BACS && colonnes[i] === X_CM) continue;
    aretes.push({ from: `g-${colonnes[i]}-${y}`, to: `g-${colonnes[i + 1]}-${y}` });
  }
}
for (const x of COLONNES_TRAVERSANTES) {
  for (let i = 0; i < COULOIRS_Y.length - 1; i++) {
    aretes.push({ from: `g-${x}-${COULOIRS_Y[i]}`, to: `g-${x}-${COULOIRS_Y[i + 1]}` });
  }
}


// Insère un nœud au milieu d'un couloir existant. Sans retirer l'arête qu'il
// coupe, on garderait deux chemins superposés sur le même passage : le tracé
// semblerait emprunter deux fois la même allée.
function insererSurCouloir(idNoeud, voisinA, voisinB) {
  const i = aretes.findIndex(
    (a) => (a.from === voisinA && a.to === voisinB) || (a.from === voisinB && a.to === voisinA)
  );
  if (i !== -1) aretes.splice(i, 1);
  aretes.push({ from: voisinA, to: idNoeud });
  aretes.push({ from: idNoeud, to: voisinB });
}

// L'allée Épicerie est plus courte que les autres : il reste un passage entre
// son extrémité et le petit stand qui la prolonge.
noeuds.push({ id: 'passage-epicerie-haut', x: 70, y: COULOIRS_Y[3], type: 'intersection' });
noeuds.push({ id: 'passage-epicerie-bas', x: 70, y: COULOIRS_Y[4], type: 'intersection' });
aretes.push({ from: 'passage-epicerie-haut', to: 'passage-epicerie-bas' });
for (const [couloir, noeud] of [[COULOIRS_Y[3], 'passage-epicerie-haut'], [COULOIRS_Y[4], 'passage-epicerie-bas']]) {
  insererSurCouloir(noeud, `g-${X_LA}-${couloir}`, `g-${X_CM}-${couloir}`);
}

// Les bacs du fond sont des meubles distincts : on passe entre eux. Ces
// passages verticaux relient les couloirs qui les encadrent.
for (const [i, x] of [106, 123].entries()) {
  const haut = `bacs-${i}-haut`;
  const bas = `bacs-${i}-bas`;
  noeuds.push({ id: haut, x, y: COULOIRS_Y[0], type: 'intersection' });
  noeuds.push({ id: bas, x, y: COULOIRS_Y[2], type: 'intersection' });
  aretes.push({ from: haut, to: bas });
  const gauche = x < X_RA ? X_CM : X_RA;
  const droite = x < X_RA ? X_RA : X_CD;
  insererSurCouloir(haut, `g-${gauche}-${COULOIRS_Y[0]}`, `g-${droite}-${COULOIRS_Y[0]}`);
  insererSurCouloir(bas, `g-${gauche}-${COULOIRS_Y[2]}`, `g-${droite}-${COULOIRS_Y[2]}`);
}

// Pain et Gâteaux sont amincis et plaqués contre le mur : leur point d'accès
// ne peut plus être le couloir principal, trop loin du meuble. Chacun reçoit
// un point dans le passage qui les longe, relié en courte impasse au couloir.
noeuds.push({ id: 'boul-pain-acces', x: 18, y: 20, type: 'acces-rayon' });
noeuds.push({ id: 'boul-gateaux-acces', x: 18, y: 62, type: 'acces-rayon' });
aretes.push({ from: `g-${X_CG}-20`, to: 'boul-pain-acces' });
aretes.push({ from: `g-${X_CG}-62`, to: 'boul-gateaux-acces' });

// Entrée, caisses, et liaison vers la zone non-alimentaire.
noeuds.push({ id: 'caisse', x: X_CG, y: 97, type: 'caisse' });
insererSurCouloir('caisse', `g-${X_CG}-90`, `g-${X_CG}-104`);


// ------------------------------- entrée, accueil, liaison vers le bazar ----

// Toutes les liaisons passent par des coudes : la circulation en magasin suit
// les allées, jamais une diagonale à travers les meubles.
noeuds.push({ id: 'entree', x: 14, y: 136, type: 'entree' });
noeuds.push({ id: 'entree-coude', x: X_CG, y: 136, type: 'intersection' });
noeuds.push({ id: 'accueil-acces', x: X_CG, y: 143, type: 'acces-rayon' });
aretes.push({ from: 'entree', to: 'entree-coude' });
aretes.push({ from: 'entree-coude', to: `g-${X_CG}-132` });
aretes.push({ from: 'entree-coude', to: 'accueil-acces' });
// Le couloir gauche descend ensuite jusqu'au bazar en passant par l'accueil ;
// la descente générique ajouterait un doublon par-dessus cette chaîne.
const SANS_DESCENTE_DIRECTE = new Set([X_CG]);

// ------------------------------------------- zone non-alimentaire (bazar) --
//
// Deux rangées de gondoles séparées par des allées. Un rayon correspond à une
// ALLÉE, pas à une gondole : sur le croquis les libellés se font face de part
// et d'autre du passage (« Jouet | Livres »), chaque gondole portant deux
// rayons différents sur ses deux faces.
//
// Les meubles adossés au mur (Magazines, Tech, Alcool, Apéro) n'ont pas
// d'allée derrière eux.

const NF_Y_HAUT = 150;
const NF_Y_MILIEU = 192;
const NF_Y_BAS = 234;
const NF_LARGEUR_GONDOLE = 9;
const NF_ALLEE_MUR_GAUCHE = 22;
const NF_ALLEE_MUR_DROIT = 152;
// Bord intérieur du renfoncement du bâtiment, longé par le rayon Tech.
const NF_RENFONCEMENT_X = 30;
const NF_RENFONCEMENT_Y = 200;
// Le mur gauche du bazar est en retrait par rapport à celui des caisses.
const NF_MUR_X = 16;
const NF_MUR_Y = 151;

const NF_GONDOLES_HAUT = [26, 42, 58, 74, 90, 106, 122, 138];
// La rangée basse démarre plus à droite : le mur du magasin forme un
// renfoncement dans ce coin, longé en L par le rayon Tech.
const NF_GONDOLES_BAS = [44, 60, 76, 92, 108, 124, 140];
const NF_ALLEE_TECH = 40;

// Allée médiane entre deux gondoles voisines.
function allees(gondoles) {
  return gondoles.slice(0, -1).map((x, i) => (x + NF_LARGEUR_GONDOLE + gondoles[i + 1]) / 2);
}

const NF_ALLEES_HAUT = [NF_ALLEE_MUR_GAUCHE, ...allees(NF_GONDOLES_HAUT), NF_ALLEE_MUR_DROIT];
const NF_ALLEES_BAS = [NF_ALLEE_TECH, ...allees(NF_GONDOLES_BAS), NF_ALLEE_MUR_DROIT];

// Le couloir qui sépare les deux rangées est UNIQUE et dessert les allées du
// haut comme celles du bas. Le décrire une fois par rangée reviendrait à poser
// deux couloirs l'un sur l'autre, qu'on ne pourrait rejoindre qu'à leurs
// extrémités : passer d'une allée du haut à celle d'en face imposerait alors
// un détour par le bout du magasin.
const NF_COULOIR_MILIEU = [...new Set([...NF_ALLEES_HAUT, ...NF_ALLEES_BAS])].sort((a, b) => a - b);

for (const x of NF_COULOIR_MILIEU) {
  noeuds.push({ id: `nf-mid-${x}`, x, y: NF_Y_MILIEU, type: 'intersection' });
}
for (let i = 0; i < NF_COULOIR_MILIEU.length - 1; i++) {
  aretes.push({ from: `nf-mid-${NF_COULOIR_MILIEU[i]}`, to: `nf-mid-${NF_COULOIR_MILIEU[i + 1]}` });
}

// Chaque allée relie le couloir de son mur au couloir central, en passant par
// son point d'accès à mi-longueur.
function ajouterRangeeBazar(alleesX, yBord, yAcces, prefixe) {
  for (const x of alleesX) {
    noeuds.push({ id: `${prefixe}-${x}-bord`, x, y: yBord, type: 'intersection' });
    noeuds.push({ id: `${prefixe}-${x}`, x, y: yAcces, type: 'acces-rayon' });
    aretes.push({ from: `${prefixe}-${x}-bord`, to: `${prefixe}-${x}` });
    aretes.push({ from: `${prefixe}-${x}`, to: `nf-mid-${x}` });
  }
  for (let i = 0; i < alleesX.length - 1; i++) {
    aretes.push({ from: `${prefixe}-${alleesX[i]}-bord`, to: `${prefixe}-${alleesX[i + 1]}-bord` });
  }
}

ajouterRangeeBazar(NF_ALLEES_HAUT, NF_Y_HAUT, (NF_Y_HAUT + NF_Y_MILIEU) / 2, 'r1');
ajouterRangeeBazar(NF_ALLEES_BAS, NF_Y_BAS, (NF_Y_MILIEU + NF_Y_BAS) / 2, 'r2');

// Alcôve de l'apéro : une saillie du bâtiment à droite du bazar. Quatre
// gondoles en L (un long linéaire prolongé d'un retour contre le mur) bordent
// une allée centrale, plus un meuble adossé au fond.
const APERO_ALLEES_Y = [201, 213, 228];
const APERO_X_FOND = 198;   // couloir longeant le fond de l'alcôve
const APERO_X_ACCES = 182;
const APERO_Y_PRINCIPALE = 213;   // alignée sur les allées du bazar

for (const y of APERO_ALLEES_Y) {
  noeuds.push({ id: `apero-a${y}`, x: APERO_X_ACCES, y, type: 'acces-rayon' });
  noeuds.push({ id: `apero-f${y}`, x: APERO_X_FOND, y, type: 'intersection' });
  aretes.push({ from: `apero-a${y}`, to: `apero-f${y}` });
}
// Le couloir du fond relie entre elles les allées de l'alcôve : sans lui, on
// ne pourrait pas passer d'un linéaire à l'autre sans ressortir.
for (let i = 0; i < APERO_ALLEES_Y.length - 1; i++) {
  aretes.push({ from: `apero-f${APERO_ALLEES_Y[i]}`, to: `apero-f${APERO_ALLEES_Y[i + 1]}` });
}

noeuds.push({ id: 'apero-entree', x: 166, y: APERO_Y_PRINCIPALE, type: 'intersection' });
aretes.push({ from: `r2-${NF_ALLEE_MUR_DROIT}`, to: 'apero-entree' });
aretes.push({ from: 'apero-entree', to: `apero-a${APERO_Y_PRINCIPALE}` });

// La zone bazar et le magasin alimentaire communiquent par la grande allée
// transversale, pas seulement par l'entrée : sans ces liaisons, tout trajet
// entre les deux zones repasserait inutilement par l'entrée.
// Chaque descente vers le bazar se fait à la verticale du couloir concerné,
// puis rejoint l'allée voisine à l'horizontale.
function descendreVersBazar(xCouloir, idNoeud) {
  noeuds.push({ id: idNoeud, x: xCouloir, y: NF_Y_HAUT, type: 'intersection' });
  if (!SANS_DESCENTE_DIRECTE.has(xCouloir)) {
    aretes.push({ from: `g-${xCouloir}-132`, to: idNoeud });
  }
  const voisines = NF_ALLEES_HAUT
    .map((x) => ({ x, ecart: Math.abs(x - xCouloir) }))
    .sort((a, b) => a.ecart - b.ecart)
    .slice(0, 2)
    .sort((a, b) => a.x - b.x);
  insererSurCouloir(idNoeud, `r1-${voisines[0].x}-bord`, `r1-${voisines[1].x}-bord`);
}

descendreVersBazar(X_CG, 'liaison-gauche');
descendreVersBazar(X_CM, 'liaison-centre');
descendreVersBazar(X_CD, 'liaison-droite');
aretes.push({ from: 'accueil-acces', to: 'liaison-gauche' });

// ------------------------------------------------------------------ rayons

const rayons = [
  // Mur du fond
  { id: 'surgeles', nom: 'Surgelés', nodeId: `g-${X_LA}-20`, couleur: COULEURS.surgele },
  { id: 'viandes', nom: 'Viandes', nodeId: `g-${X_RA}-20`, couleur: COULEURS.viande },

  // Colonne gauche
  { id: 'cremerie', nom: 'Crèmerie', nodeId: `g-${X_LA}-34`, couleur: COULEURS.frais },
  { id: 'desserts', nom: 'Desserts', nodeId: `g-${X_LA}-48`, couleur: COULEURS.frais },
  { id: 'lait', nom: 'Lait', nodeId: `g-${X_LA}-62`, couleur: COULEURS.frais },
  { id: 'epicerie', nom: 'Épicerie', nodeId: `g-${X_LA}-76`, couleur: COULEURS.epicerie },
  { id: 'pates', nom: 'Pâtes', nodeId: `g-${X_LA}-76`, couleur: COULEURS.epicerie },
  { id: 'riz', nom: 'Riz', nodeId: `g-${X_LA}-76`, couleur: COULEURS.epicerie },
  { id: 'frites', nom: 'Frites', nodeId: `g-${X_CM}-20`, couleur: COULEURS.surgele },
  { id: 'conserves', nom: 'Conserves', nodeId: `g-${X_LA}-90`, couleur: COULEURS.epicerie },
  { id: 'gouter', nom: 'Goûter', nodeId: `g-${X_LA}-104`, couleur: COULEURS.epicerie },
  { id: 'petit-dejeuner', nom: 'Petit-déjeuner', nodeId: `g-${X_LA}-118`, couleur: COULEURS.epicerie },

  // Colonne droite
  { id: 'fruits-legumes', nom: 'Fruits & Légumes', nodeId: `g-${X_RA}-48`, couleur: COULEURS.primeur },
  { id: 'plats-cuisines', nom: 'Plats cuisinés', nodeId: `g-${X_RA}-62`, couleur: COULEURS.frais },
  { id: 'charcuterie', nom: 'Charcuterie', nodeId: `g-${X_RA}-62`, couleur: COULEURS.frais },
  { id: 'chips', nom: 'Chips', nodeId: `g-${X_RA}-76`, couleur: COULEURS.epicerie },
  { id: 'epicerie-salee', nom: 'Épicerie salée', nodeId: `g-${X_RA}-76`, couleur: COULEURS.epicerie },
  { id: 'bonbons', nom: 'Bonbons', nodeId: `g-${X_RA}-90`, couleur: COULEURS.epicerie },
  { id: 'chocolat-cafe', nom: 'Chocolat & Café', nodeId: `g-${X_RA}-90`, couleur: COULEURS.epicerie },
  { id: 'cuisine', nom: 'Cuisine', nodeId: `g-${X_RA}-104`, couleur: COULEURS.bazar },
  { id: 'animaux', nom: 'Animaux', nodeId: `g-${X_RA}-118`, couleur: COULEURS.bazar },

  // Comptoirs (mur droit)
  { id: 'boucherie', nom: 'Boucherie', nodeId: `g-${X_CD}-34`, couleur: COULEURS.viande },
  { id: 'poissonnerie', nom: 'Poissonnerie', nodeId: `g-${X_CD}-104`, couleur: COULEURS.poisson },

  // Coin boulangerie (mur gauche, en haut)
  { id: 'pain', nom: 'Pain', nodeId: 'boul-pain-acces', couleur: COULEURS.boulangerie },
  { id: 'patisserie', nom: 'Pâtisserie', nodeId: `g-${X_CG}-48`, couleur: COULEURS.boulangerie },
  { id: 'gateaux', nom: 'Gâteaux', nodeId: 'boul-gateaux-acces', couleur: COULEURS.boulangerie },

  { id: 'accueil', nom: 'Accueil', nodeId: 'accueil-acces', couleur: COULEURS.accueil },

  // Bazar, rangée haute : chaque rayon occupe une allée entre deux gondoles.
  { id: 'magazines', nom: 'Magazines', nodeId: `r1-${NF_ALLEES_HAUT[0]}`, couleur: COULEURS.bazar },
  { id: 'livres', nom: 'Livres', nodeId: `r1-${NF_ALLEES_HAUT[1]}`, couleur: COULEURS.bazar },
  { id: 'jouets', nom: 'Jouets', nodeId: `r1-${NF_ALLEES_HAUT[2]}`, couleur: COULEURS.bazar },
  { id: 'beaute', nom: 'Produits de beauté', nodeId: `r1-${NF_ALLEES_HAUT[3]}`, couleur: COULEURS.bazar },
  { id: 'entretien', nom: "Produits d'entretien", nodeId: `r1-${NF_ALLEES_HAUT[5]}`, couleur: COULEURS.bazar },
  { id: 'soda', nom: 'Soda', nodeId: `r1-${NF_ALLEES_HAUT[7]}`, couleur: COULEURS.boisson },
  { id: 'alcool-vins', nom: 'Alcool & Vins', nodeId: `r1-${NF_ALLEES_HAUT[8]}`, couleur: COULEURS.boisson },

  // Bazar, rangée basse
  { id: 'tech', nom: 'Tech', nodeId: `r2-${NF_ALLEES_BAS[0]}`, couleur: COULEURS.bazar },
  { id: 'papeterie', nom: 'Papeterie', nodeId: `r2-${NF_ALLEES_BAS[1]}`, couleur: COULEURS.bazar },
  { id: 'vetements', nom: 'Vêtements', nodeId: `r2-${NF_ALLEES_BAS[2]}`, couleur: COULEURS.bazar },
  { id: 'bricolage-auto', nom: 'Bricolage & Auto', nodeId: `r2-${NF_ALLEES_BAS[4]}`, couleur: COULEURS.bazar },
  { id: 'nourriture-chat', nom: 'Nourriture pour chat', nodeId: `r2-${NF_ALLEES_BAS[5]}`, couleur: COULEURS.bazar },
  { id: 'eau', nom: 'Eau', nodeId: `r2-${NF_ALLEES_BAS[6]}`, couleur: COULEURS.boisson },
  { id: 'jus', nom: 'Jus', nodeId: `r2-${NF_ALLEES_BAS[6]}`, couleur: COULEURS.boisson },
  { id: 'apero', nom: 'Apéro', nodeId: `apero-a${APERO_Y_PRINCIPALE}`, couleur: COULEURS.boisson },
];

// --------------------------------------------------------- meubles dessinés

const couleurParRayon = new Map(rayons.map((r) => [r.id, r.couleur]));
const nomParRayon = new Map(rayons.map((r) => [r.id, r.nom]));

// Allée à deux faces : deux bandes empilées, chacune desservie par le couloir
// qu'elle longe.
function alleeDouble(barre, indexCouloir, faceHaut, faceBas) {
  const y = COULOIRS_Y[indexCouloir] + 2;
  return [
    { ...barre, y, hauteur: 5, label: faceHaut.label, rayonId: faceHaut.rayonId },
    { ...barre, y: y + 5, hauteur: 5, label: faceBas.label, rayonId: faceBas.rayonId },
  ];
}

function alleeSimple(barre, indexCouloir, label, rayonId) {
  return [{ ...barre, y: COULOIRS_Y[indexCouloir] + 2, hauteur: 10, label, rayonId }];
}

// Gondole du bazar : un meuble vertical dont chaque moitié (gauche / droite)
// dessert l'allée qui la longe. `faces` donne, pour chaque gondole, le rayon
// de la face gauche puis celui de la face droite.
// Les quatre gondoles de l'alcôve, symétriques deux à deux : le linéaire part
// de l'allée centrale, le retour du L s'adosse au mur latéral.
function alcoveApero() {
  // Quatre linéaires perpendiculaires à l'ouverture, séparés par les allées
  // (APERO_ALLEES_Y), plus le meuble adossé au fond. Le couloir du fond passe
  // entre les linéaires et ce dernier.
  // Les deux extrémités sont adossées aux murs de l'alcôve : demi-épaisseur,
  // comme tout meuble à une seule face. Les deux du milieu sont double face.
  const barres = [
    { y: 193, hauteur: 3 },
    { y: 205, hauteur: 6 },
    { y: 218, hauteur: 6 },
    { y: 234, hauteur: 3 },
  ].map(({ y, hauteur }) => ({
    x: 170, y, largeur: 24, hauteur,
    rayonId: 'apero',
    label: 'Apéro',
  }));
  return [...barres, { x: 200, y: 194, largeur: 3, hauteur: 42, rayonId: 'apero', label: '' }];
}

function gondolesBazar(positionsX, yHaut, yBas, faces) {
  const demi = NF_LARGEUR_GONDOLE / 2;
  const face = (x, rayonId) => ({
    x,
    y: yHaut,
    largeur: demi,
    hauteur: yBas - yHaut,
    rayonId,
    label: nomParRayon.get(rayonId),
    orientation: 'v',
  });
  return positionsX.flatMap((x, i) => [face(x, faces[i][0]), face(x + demi, faces[i][1])]);
}

const meubles = [
  // Mur du fond
  // Meubles de mur : une seule face, donc la moitié de l'épaisseur d'une
  // gondole double face, et plaqués contre la paroi.
  { x: 32, y: 10, largeur: 48, hauteur: 5, label: 'Surgelés', rayonId: 'surgeles' },
  { x: 92, y: 10, largeur: 46, hauteur: 5, label: 'Viandes', rayonId: 'viandes' },

  // Colonne gauche, de haut en bas. La première allée est raccourcie : le
  // croquis place un meuble « Frites » séparé au bout de cette allée.
  ...alleeDouble({ x: 32, largeur: 36 }, 0, { label: 'Surgelés', rayonId: 'surgeles' }, { label: 'Œufs & Crèmerie', rayonId: 'cremerie' }),
  { x: 70, y: 22, largeur: 10, hauteur: 10, label: 'Frites', rayonId: 'frites' },
  ...alleeDouble(BARRE_G, 1, { label: 'Crèmerie', rayonId: 'cremerie' }, { label: 'Desserts', rayonId: 'desserts' }),
  // Cette allée est écourtée : un pilier du bâtiment occupe son extrémité.
  // Le pilier ne gêne que la face basse : Desserts file jusqu'au bout de
  // l'allée, Lait s'arrête contre le pilier.
  { ...BARRE_G, y: COULOIRS_Y[2] + 2, hauteur: 5, label: 'Desserts', rayonId: 'desserts' },
  { x: 32, largeur: 40, y: COULOIRS_Y[2] + 7, hauteur: 5, label: 'Lait', rayonId: 'lait' },
  { x: 72, y: 54, largeur: 8, hauteur: 8, label: '', couleur: COULEURS.pilier, pilier: true },
  // L'épicerie est plus courte que les autres allées sur le croquis.
  ...alleeSimple({ x: 32, largeur: 36 }, 3, 'Épicerie', 'epicerie'),
  // Petit meuble prolongeant l'allée, dessiné sans nom sur le croquis.
  { x: 74, y: 65, largeur: 8, hauteur: 8, label: '', couleur: COULEURS.pilier },
  // La face haute de cette allée porte deux libellés côte à côte.
  { x: 32, y: COULOIRS_Y[4] + 2, largeur: 24, hauteur: 5, label: 'Pâtes', rayonId: 'pates' },
  { x: 56, y: COULOIRS_Y[4] + 2, largeur: 24, hauteur: 5, label: 'Riz', rayonId: 'riz' },
  { ...BARRE_G, y: COULOIRS_Y[4] + 7, hauteur: 5, label: 'Conserves', rayonId: 'conserves' },
  ...alleeDouble(BARRE_G, 5, { label: 'Conserves', rayonId: 'conserves' }, { label: 'Goûter', rayonId: 'gouter' }),
  ...alleeDouble(BARRE_G, 6, { label: 'Goûter', rayonId: 'gouter' }, { label: 'Petit-déjeuner', rayonId: 'petit-dejeuner' }),
  ...alleeDouble(BARRE_G, 7, { label: 'Petit-déjeuner', rayonId: 'petit-dejeuner' }, { label: 'Promo', couleur: COULEURS.promo }),

  // Colonne droite : bacs à fruits et légumes, puis allées
  // Deux bacs de fruits et légumes ; le troisième meuble du croquis porte un
  // triangle : c'est un îlot de la boucherie (voir plus bas).
  { x: 92, y: 22, largeur: 11, hauteur: 24, label: 'Fruits & Légumes', rayonId: 'fruits-legumes', orientation: 'v' },
  { x: 109, y: 22, largeur: 11, hauteur: 24, label: 'Fruits & Légumes', rayonId: 'fruits-legumes', orientation: 'v' },
  ...alleeDouble(BARRE_D, 2, { label: 'Fruits & Légumes', rayonId: 'fruits-legumes' }, { label: 'Plats cuisinés', rayonId: 'plats-cuisines' }),
  ...alleeDouble(BARRE_D, 3, { label: 'Charcuterie', rayonId: 'charcuterie' }, { label: 'Chips', rayonId: 'chips' }),
  ...alleeDouble(BARRE_D, 4, { label: 'Épicerie salée', rayonId: 'epicerie-salee' }, { label: 'Bonbons', rayonId: 'bonbons' }),
  ...alleeDouble(BARRE_D, 5, { label: 'Chocolat & Café', rayonId: 'chocolat-cafe' }, { label: 'Cuisine', rayonId: 'cuisine' }),
  ...alleeDouble(BARRE_D, 6, { label: 'Cuisine', rayonId: 'cuisine' }, { label: 'Animaux', rayonId: 'animaux' }),
  ...alleeDouble(BARRE_D, 7, { label: 'Animaux', rayonId: 'animaux' }, { label: 'Promo', couleur: COULEURS.promo }),

  // Comptoirs du mur droit, avec leurs îlots. Sur le croquis les îlots de la
  // boucherie sont marqués d'un triangle, ceux de la poissonnerie de deux
  // traits ; ils appartiennent donc au même rayon que leur comptoir.
  { x: 152, y: 20, largeur: 14, hauteur: 30, label: 'Boucherie', rayonId: 'boucherie', orientation: 'v' },
  { x: 152, y: 56, largeur: 11, hauteur: 12, label: '', rayonId: 'boucherie' },
  { x: 152, y: 72, largeur: 11, hauteur: 12, label: '', rayonId: 'boucherie' },
  { x: 126, y: 22, largeur: 12, hauteur: 24, label: '', rayonId: 'boucherie', orientation: 'v' },
  { x: 168, y: 90, largeur: 13, hauteur: 33, label: 'Poissonnerie', rayonId: 'poissonnerie', orientation: 'v' },
  { x: 151, y: 96, largeur: 10, hauteur: 11, label: '', rayonId: 'poissonnerie' },
  { x: 151, y: 111, largeur: 10, hauteur: 11, label: '', rayonId: 'poissonnerie' },

  // Coin boulangerie (mur gauche). Le petit « Pain » ajouté plus tard reste
  // tel quel ; Pain (d'origine) et Gâteaux sont amincis et plaqués contre le
  // mur, la Pâtisserie devient un stand détaché devant eux, avec un passage
  // entre les deux.
  { x: 11, y: 11, largeur: 12, hauteur: 7, label: 'Pain', rayonId: 'pain' },
  { x: 11, y: 22, largeur: 5, hauteur: 19, label: 'Pain', rayonId: 'pain' },
  { x: 11, y: 41, largeur: 5, hauteur: 19, label: 'Gâteaux', rayonId: 'gateaux' },
  { x: 21, y: 22, largeur: 4, hauteur: 38, label: 'Pâtisserie', rayonId: 'patisserie' },

  // Têtes de gondole (décor, pas des rayons de la liste)
  ...[40, 56, 72, 100, 116, 132].map((cx) => ({
    x: cx - 6, y: 136, largeur: 12, hauteur: 9, label: 'Promo', couleur: COULEURS.promo,
  })),


  // Accueil, près de l'entrée
  { x: 4, y: 138, largeur: 16, hauteur: 10, label: 'Accueil', rayonId: 'accueil' },

  // ----- Bazar, rangée haute -----
  // Chaque gondole porte deux rayons différents, un par face : la face gauche
  // dessert l'allée de gauche, la face droite celle de droite.
  ...gondolesBazar(NF_GONDOLES_HAUT, NF_Y_HAUT + 6, NF_Y_MILIEU - 6, [
    ['livres', 'livres'],
    ['livres', 'jouets'],
    ['jouets', 'beaute'],
    ['beaute', 'beaute'],
    ['beaute', 'entretien'],
    ['entretien', 'entretien'],
    ['entretien', 'soda'],
    ['soda', 'alcool-vins'],
  ]),
  // Meubles adossés au mur : pas de passage derrière eux.
  { x: NF_MUR_X, y: NF_Y_HAUT + 6, largeur: 5, hauteur: 34, label: 'Magazines', rayonId: 'magazines', orientation: 'v' },
  { x: 161, y: NF_Y_HAUT + 6, largeur: 5, hauteur: 34, label: 'Alcool & Vins', rayonId: 'alcool-vins', orientation: 'v' },
  // Les deux petits îlots de vin, devant le linéaire d'alcool.
  { x: 151, y: 161, largeur: 7, hauteur: 8, label: '', rayonId: 'alcool-vins' },
  { x: 151, y: 177, largeur: 7, hauteur: 8, label: '', rayonId: 'alcool-vins' },

  // ----- Bazar, rangée basse -----
  ...gondolesBazar(NF_GONDOLES_BAS, NF_Y_MILIEU + 6, NF_Y_BAS - 6, [
    ['papeterie', 'papeterie'],
    ['papeterie', 'vetements'],
    ['vetements', 'vetements'],
    ['vetements', 'bricolage-auto'],
    ['bricolage-auto', 'nourriture-chat'],
    ['nourriture-chat', 'eau'],
    ['jus', 'apero'],
  ]),
  // Tech longe par l'intérieur les deux murs du renfoncement du bâtiment.
  { x: NF_MUR_X, y: NF_RENFONCEMENT_Y - 4, largeur: NF_RENFONCEMENT_X - NF_MUR_X, hauteur: 4, label: 'Tech', rayonId: 'tech' },
  { x: NF_RENFONCEMENT_X, y: NF_RENFONCEMENT_Y, largeur: 4, hauteur: 37, label: 'Tech', rayonId: 'tech' },

  // Alcôve de l'apéro : quatre gondoles en L autour de l'allée centrale,
  // le retour de chaque L venant s'adosser au mur de l'alcôve.
  ...alcoveApero(),
];

// Ligne de caisses : décor + repère de sortie, pas un rayon.
const caisses = Array.from({ length: 11 }, (_, i) => ({
  x: 6, y: 66 + i * 6, largeur: 16, hauteur: 4,
}));

export const storeData = {
  noeuds,
  aretes,
  rayons,
  meubles: meubles.map((m) => ({
    ...m,
    couleur: m.couleur ?? couleurParRayon.get(m.rayonId) ?? COULEURS.bazar,
  })),
  caisses,
  // Le bâtiment n'est pas rectangulaire : le mur droit se décale au niveau de
  // la poissonnerie, l'apéro occupe une alcôve en saillie, et le coin bas
  // gauche du bazar est en renfoncement (c'est lui que longe le rayon Tech).
  contour: {
    largeur: 203,
    hauteur: 245,
    points: [
      [10, 10], [168, 10],                            // mur du fond ramené devant les linéaires
      [168, 86], [182, 86], [182, 128], [168, 128],   // avancée du mur à la poissonnerie
      [168, 193], [203, 193], [203, 237],             // alcôve de l'apéro
      [NF_RENFONCEMENT_X, 237],                       // mur du bas
      [NF_RENFONCEMENT_X, NF_RENFONCEMENT_Y], [NF_MUR_X, NF_RENFONCEMENT_Y],  // renfoncement (Tech)
      [NF_MUR_X, NF_MUR_Y], [0, NF_MUR_Y],            // retrait du mur devant le bazar
      [0, 62], [10, 62],                              // décrochement devant la boulangerie
    ],
  },
  // Les coordonnées sont des unités de dessin ; ce facteur les convertit en
  // mètres pour l'affichage (le magasin fait ici ~60 m sur ~85 m).
  metresParUnite: 0.35,
};
