import { storeData } from './store-data.js';
import { produits as catalogueProduits } from './products-data.js';
import { matchShoppingList, parseShoppingListFile } from './list-import.js';
import { computeRoute } from './pathfinding.js';
import { renderStoreMap, renderRoute, refleterProgression } from './map-render.js';

// Vitesse de marche en magasin, panier à la main : sert à convertir la
// distance du parcours en une durée parlante.
const METRES_PAR_MINUTE = 50;
// Temps passé à chercher et prendre un produit sur l'étagère à chaque arrêt,
// en plus de la marche : sans lui, la durée ne comptait que le trajet.
const SECONDES_PAR_ARRET = 30;
const CLE_SELECTION = 'fastlane:selection';

const rayonById = new Map(storeData.rayons.map((r) => [r.id, r]));

export function initUI() {
  const el = (id) => document.getElementById(id);
  const vues = {
    tiroir: el('tiroir-rayons'),
    checklist: el('checklist'),
    upload: el('upload-liste'),
    nomFichier: el('nom-fichier'),
    nonReconnus: el('non-reconnus'),
    recherche: el('recherche'),
    toutEffacer: el('tout-effacer'),
    compteur: el('compteur-selection'),
    calculer: el('calculer'),
    carte: el('carte'),
    parcours: el('parcours'),
    erreur: el('erreur'),
  };

  // La carte est dessinée dès l'ouverture : on peut repérer le magasin avant
  // même d'avoir coché quoi que ce soit.
  renderStoreMap(vues.carte, storeData);
  renderChecklist(vues.checklist, catalogueProduits);
  restaurerSelection(vues.checklist);
  rafraichirCompteurs(vues);

  vues.checklist.addEventListener('change', () => {
    rafraichirCompteurs(vues);
    enregistrerSelection(vues.checklist);
    vues.erreur.textContent = '';
  });

  // Chercher doit fonctionner même tiroir fermé : on l'ouvre le temps de la
  // recherche pour montrer le produit trouvé, puis on rend son état d'origine.
  let etatAvantRecherche = null;
  vues.recherche.addEventListener('input', () => {
    const terme = vues.recherche.value.trim();
    if (terme) {
      if (etatAvantRecherche === null) etatAvantRecherche = vues.tiroir.open;
      vues.tiroir.open = true;
    } else if (etatAvantRecherche !== null) {
      vues.tiroir.open = etatAvantRecherche;
      etatAvantRecherche = null;
    }
    filtrer(vues.checklist, terme);
  });

  // Si on ouvre ou ferme le tiroir à la main pendant une recherche, c'est ce
  // choix qui prime : effacer la recherche ne doit pas le défaire.
  vues.tiroir.querySelector('.tiroir-tete').addEventListener('click', () => {
    etatAvantRecherche = null;
  });

  vues.toutEffacer.addEventListener('click', () => {
    for (const input of vues.checklist.querySelectorAll('input:checked')) input.checked = false;
    rafraichirCompteurs(vues);
    enregistrerSelection(vues.checklist);
    reinitialiserParcours(vues);
  });

  vues.upload.addEventListener('change', async () => {
    const fichier = vues.upload.files[0];
    if (!fichier) return;

    const { matched, unmatched } = matchShoppingList(
      parseShoppingListFile(await fichier.text()),
      catalogueProduits
    );

    for (const { produitId } of matched) {
      const checkbox = vues.checklist.querySelector(`input[value="${produitId}"]`);
      if (checkbox) {
        checkbox.checked = true;
        checkbox.closest('.rayon').open = true;
      }
    }
    rafraichirCompteurs(vues);
    enregistrerSelection(vues.checklist);

    vues.nomFichier.textContent = `${fichier.name} — ${matched.length} produit(s) coché(s)`;
    vues.nonReconnus.textContent = unmatched.length
      ? `Non reconnus, à cocher à la main : ${unmatched.join(', ')}`
      : '';
  });

  vues.calculer.addEventListener('click', () => {
    const selection = selectionCourante(vues.checklist);
    if (selection.length === 0) {
      vues.erreur.textContent = 'Coche au moins un produit pour tracer un chemin.';
      return;
    }
    vues.erreur.textContent = '';

    const route = computeRoute({
      storeData,
      produits: catalogueProduits,
      produitIdsSelectionnes: selection,
    });

    renderStoreMap(vues.carte, storeData);
    renderRoute(vues.carte, storeData, route);
    renderParcours(vues, route, selection);

    // Une fois le chemin tracé, la liste a fait son travail : on la replie
    // pour que la carte occupe l'écran.
    vues.tiroir.open = false;
    vues.carte.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

// ------------------------------------------------------------- liste à cocher

function renderChecklist(container, produits) {
  container.innerHTML = '';

  for (const rayon of storeData.rayons) {
    // Un rayon sans produit (l'accueil) est un repère sur la carte, pas un
    // endroit où l'on prend quelque chose : il n'a rien à faire dans la liste.
    const duRayon = produits.filter((p) => p.rayonId === rayon.id);
    if (duRayon.length === 0) continue;

    const carte = document.createElement('details');
    carte.className = 'rayon';
    carte.style.setProperty('--teinte', rayon.couleur);

    const tete = document.createElement('summary');
    tete.innerHTML = `
      <span class="pastille"></span>
      <span class="rayon-nom"></span>
      <span class="rayon-compte">0</span>
      <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10 L12 15 L17 10" /></svg>
    `;
    tete.querySelector('.rayon-nom').textContent = rayon.nom;
    carte.appendChild(tete);

    const liste = document.createElement('div');
    liste.className = 'produits';
    for (const produit of duRayon) {
      const ligne = document.createElement('label');
      ligne.className = 'produit';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = produit.id;
      const nom = document.createElement('span');
      nom.textContent = produit.nom;
      ligne.append(checkbox, nom);
      liste.appendChild(ligne);
    }

    carte.appendChild(liste);
    container.appendChild(carte);
  }
}

const selectionCourante = (checklist) =>
  [...checklist.querySelectorAll('input:checked')].map((i) => i.value);

function rafraichirCompteurs(vues) {
  for (const carte of vues.checklist.querySelectorAll('.rayon')) {
    const n = carte.querySelectorAll('input:checked').length;
    carte.querySelector('.rayon-compte').textContent = String(n);
    carte.classList.toggle('rayon-actif', n > 0);
  }

  const total = vues.checklist.querySelectorAll('input:checked').length;
  vues.compteur.textContent = total === 0 ? 'aucun produit' : `${total} produit${total > 1 ? 's' : ''}`;
  vues.calculer.disabled = total === 0;
  vues.calculer.textContent = total === 0 ? 'Tracer mon chemin' : `Tracer mon chemin (${total})`;
}

// La liste est préparée à la maison et relue en magasin : elle doit survivre
// à une fermeture d'onglet.
function enregistrerSelection(checklist) {
  try {
    localStorage.setItem(CLE_SELECTION, JSON.stringify(selectionCourante(checklist)));
  } catch {
    // Navigation privée ou stockage plein : l'app reste utilisable sans.
  }
}

function restaurerSelection(checklist) {
  let ids = [];
  try {
    ids = JSON.parse(localStorage.getItem(CLE_SELECTION) ?? '[]');
  } catch {
    return;
  }
  for (const id of ids) {
    const checkbox = checklist.querySelector(`input[value="${id}"]`);
    if (checkbox) checkbox.checked = true;
  }
}

// Filtre sur le nom des produits ; un rayon dont plus rien ne correspond est
// masqué, et ceux qui gardent un résultat s'ouvrent pour montrer la trouvaille.
function filtrer(container, terme) {
  const recherche = terme.trim().toLowerCase();

  for (const carte of container.querySelectorAll('.rayon')) {
    let visibles = 0;
    for (const ligne of carte.querySelectorAll('.produit')) {
      const correspond = !recherche || ligne.textContent.toLowerCase().includes(recherche);
      ligne.hidden = !correspond;
      if (correspond) visibles++;
    }
    carte.hidden = visibles === 0;
    if (recherche) carte.open = visibles > 0;
  }
}

// ------------------------------------------------------------------ parcours

function reinitialiserParcours(vues) {
  vues.parcours.innerHTML = '';
  renderStoreMap(vues.carte, storeData);
}

function renderParcours(vues, route, selection) {
  const metres = Math.round(route.totalDistance * storeData.metresParUnite);
  const secondesMarche = (metres / METRES_PAR_MINUTE) * 60;
  const secondesArrets = route.rayonOrder.length * SECONDES_PAR_ARRET;
  const minutes = Math.max(1, Math.round((secondesMarche + secondesArrets) / 60));
  const garantie = route.exact
    ? { texte: 'Trajet le plus court', classe: 'garantie-exacte' }
    : { texte: 'Trajet approché', classe: 'garantie-approchee' };

  const choisis = new Set(selection);
  const produitsDuRayon = (rayonId) =>
    catalogueProduits.filter((p) => p.rayonId === rayonId && choisis.has(p.id));

  vues.parcours.innerHTML = `
    <div class="parcours-tete">
      <h2>Ton parcours</h2>
      <span class="garantie ${garantie.classe}">${garantie.texte}</span>
    </div>
    <div class="stats">
      <div class="stat"><span class="stat-valeur">${selection.length}</span><span class="stat-nom">produits</span></div>
      <div class="stat"><span class="stat-valeur">${route.rayonOrder.length}</span><span class="stat-nom">arrêts</span></div>
      <div class="stat"><span class="stat-valeur">${metres}<small> m</small></span><span class="stat-nom">de marche</span></div>
      <div class="stat"><span class="stat-valeur">${minutes}<small> min</small></span><span class="stat-nom">environ</span></div>
    </div>
    <div class="progression">
      <div class="progression-barre"><span></span></div>
      <p class="progression-texte"></p>
    </div>
    <ol class="itineraire"></ol>
  `;

  const liste = vues.parcours.querySelector('.itineraire');
  liste.appendChild(borne('Entrée', 'Départ'));

  route.rayonOrder.forEach((rayonId, index) => {
    const rayon = rayonById.get(rayonId);
    const item = document.createElement('li');
    item.className = 'etape';
    item.style.setProperty('--teinte', rayon.couleur);
    item.dataset.etape = String(index);

    const label = document.createElement('label');
    label.className = 'etape-label';
    label.innerHTML = `
      <input type="checkbox" class="etape-fait" />
      <span class="puce">${index + 1}</span>
      <span class="etape-corps">
        <span class="etape-nom"></span>
        <span class="etape-produits"></span>
      </span>
    `;
    label.querySelector('.etape-nom').textContent = rayon.nom;
    label.querySelector('.etape-produits').textContent = produitsDuRayon(rayonId)
      .map((p) => p.nom)
      .join(' · ');

    item.appendChild(label);
    liste.appendChild(item);
  });

  liste.appendChild(borne('Caisses', 'Arrivée'));

  const majProgression = () => {
    const faits = new Set(
      [...liste.querySelectorAll('.etape')]
        .filter((li) => li.querySelector('.etape-fait').checked)
        .map((li) => Number(li.dataset.etape))
    );
    for (const li of liste.querySelectorAll('.etape')) {
      li.classList.toggle('etape-faite', faits.has(Number(li.dataset.etape)));
    }

    const total = route.rayonOrder.length;
    const barre = vues.parcours.querySelector('.progression-barre span');
    barre.style.width = `${total ? (faits.size / total) * 100 : 0}%`;
    vues.parcours.querySelector('.progression-texte').textContent =
      faits.size === total ? 'Tout est dans le panier.' : `${faits.size} arrêt(s) sur ${total}`;

    refleterProgression(vues.carte, { faits });
    return faits;
  };

  liste.addEventListener('change', majProgression);

  // Survoler ou parcourir la liste au clavier met l'arrêt en avant sur la carte.
  const viser = (index) => {
    const faits = new Set(
      [...liste.querySelectorAll('.etape.etape-faite')].map((li) => Number(li.dataset.etape))
    );
    refleterProgression(vues.carte, { faits, actif: index });
  };
  liste.addEventListener('pointerover', (e) => {
    const etape = e.target.closest('.etape');
    if (etape) viser(Number(etape.dataset.etape));
  });
  liste.addEventListener('pointerleave', () => viser(null));
  liste.addEventListener('focusin', (e) => {
    const etape = e.target.closest('.etape');
    if (etape) viser(Number(etape.dataset.etape));
  });

  majProgression();
}

function borne(nom, role) {
  const item = document.createElement('li');
  item.className = 'borne';
  item.innerHTML = '<span class="puce"></span><span class="etape-corps"></span>';
  item.querySelector('.etape-corps').innerHTML =
    `<span class="etape-nom"></span><span class="etape-produits"></span>`;
  item.querySelector('.etape-nom').textContent = nom;
  item.querySelector('.etape-produits').textContent = role;
  return item;
}
