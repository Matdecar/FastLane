// Catalogue relevé sur la liste manuscrite « Liste complète ».
// Les noms sont ceux écrits sur la liste, pour que l'import d'un fichier
// reprenant ces mêmes mots les reconnaisse sans reformulation.

export const produits = [
  // ----- Fruits & Légumes -----
  { id: 'pomme-de-terre', nom: 'Pomme de terre', rayonId: 'fruits-legumes' },
  { id: 'tomates', nom: 'Tomates', rayonId: 'fruits-legumes' },
  { id: 'banane', nom: 'Banane', rayonId: 'fruits-legumes' },

  // ----- Charcuterie -----
  { id: 'jambon-tranches', nom: 'Jambon (tranches)', rayonId: 'charcuterie' },
  { id: 'jambon-allumettes', nom: 'Jambon (allumettes)', rayonId: 'charcuterie' },
  { id: 'saucisson', nom: 'Saucisson', rayonId: 'charcuterie' },
  { id: 'blanc-de-poulet', nom: 'Blanc de poulet', rayonId: 'charcuterie' },
  { id: 'emince-de-poulet', nom: 'Émincé de poulet', rayonId: 'charcuterie' },
  { id: 'saucisses', nom: 'Saucisses', rayonId: 'charcuterie' },
  { id: 'saucisse-geante', nom: 'Saucisse géante', rayonId: 'charcuterie' },

  // ----- Poissonnerie -----
  { id: 'saumon', nom: 'Saumon', rayonId: 'poissonnerie' },

  // ----- Surgelés -----
  { id: 'pizza', nom: 'Pizza', rayonId: 'surgeles' },
  { id: 'glace', nom: 'Glace', rayonId: 'surgeles' },
  { id: 'poisson-panes', nom: 'Poisson panés', rayonId: 'surgeles' },
  { id: 'steak-hache', nom: 'Steak haché', rayonId: 'surgeles' },

  // ----- Crèmerie -----
  { id: 'beurre', nom: 'Beurre', rayonId: 'cremerie' },
  { id: 'oeufs', nom: 'Œufs', rayonId: 'cremerie' },
  { id: 'ficello', nom: 'Ficello', rayonId: 'cremerie' },
  { id: 'caprice-des-dieux', nom: 'Caprice des dieux', rayonId: 'cremerie' },
  { id: 'babybel', nom: 'Babybel', rayonId: 'cremerie' },
  { id: 'kiri', nom: 'Kiri', rayonId: 'cremerie' },
  { id: 'vache-qui-rit', nom: 'Vache qui rit', rayonId: 'cremerie' },
  { id: 'mozzarella', nom: 'Mozzarella', rayonId: 'cremerie' },
  { id: 'fromage-a-raclette', nom: 'Fromage à raclette', rayonId: 'cremerie' },
  { id: 'gruyere', nom: 'Gruyère', rayonId: 'cremerie' },
  { id: 'creme-fraiche', nom: 'Crème fraîche', rayonId: 'cremerie' },

  // ----- Lait -----
  { id: 'lait', nom: 'Lait', rayonId: 'lait' },
  { id: 'candy-up', nom: 'Candy Up', rayonId: 'lait' },

  // ----- Pain -----
  { id: 'pain-de-mie', nom: 'Pain de mie', rayonId: 'pain' },
  { id: 'pain-de-mie-complet', nom: 'Pain de mie complet', rayonId: 'pain' },

  // ----- Gâteaux -----
  { id: 'napolitain', nom: 'Napolitain', rayonId: 'gateaux' },

  // ----- Bonbons -----
  { id: 'twix', nom: 'Twix', rayonId: 'bonbons' },
  { id: 'batnat', nom: 'Batnat', rayonId: 'bonbons' },

  // ----- Goûter -----
  { id: 'crepe-wahoo', nom: 'Crêpe Wahoo', rayonId: 'gouter' },
  { id: 'delichoc', nom: 'Delichoc', rayonId: 'gouter' },

  // ----- Petit-déjeuner -----
  { id: 'nutella', nom: 'Nutella', rayonId: 'petit-dejeuner' },
  { id: 'confiture', nom: 'Confiture', rayonId: 'petit-dejeuner' },
  { id: 'banania', nom: 'Banania', rayonId: 'petit-dejeuner' },
  { id: 'ricore', nom: 'Ricoré', rayonId: 'petit-dejeuner' },

  // ----- Pâtes -----
  { id: 'pates', nom: 'Pâtes', rayonId: 'pates' },
  { id: 'bolognaise', nom: 'Bolognaise', rayonId: 'pates' },

  // ----- Riz -----
  { id: 'riz-10-min', nom: 'Riz (10 min)', rayonId: 'riz' },
  { id: 'riz-20-min', nom: 'Riz (20 min)', rayonId: 'riz' },
  { id: 'riz-basmati', nom: 'Riz basmati', rayonId: 'riz' },
  { id: 'semoule', nom: 'Semoule', rayonId: 'riz' },
  { id: 'puree', nom: 'Purée', rayonId: 'riz' },

  // ----- Conserves -----
  { id: 'haricots-verts', nom: 'Haricots verts', rayonId: 'conserves' },
  { id: 'petit-pois-carottes', nom: 'Petit pois carottes', rayonId: 'conserves' },
  { id: 'cassoulet', nom: 'Cassoulet', rayonId: 'conserves' },
  { id: 'lentilles', nom: 'Lentilles', rayonId: 'conserves' },
  { id: 'ravioli', nom: 'Ravioli', rayonId: 'conserves' },
  { id: 'thon', nom: 'Thon', rayonId: 'conserves' },
  { id: 'mais', nom: 'Maïs', rayonId: 'conserves' },
  { id: 'flageolets', nom: 'Flageolets', rayonId: 'conserves' },

  // ----- Épicerie -----
  { id: 'sucre', nom: 'Sucre', rayonId: 'epicerie' },
  { id: 'farine', nom: 'Farine', rayonId: 'epicerie' },
  { id: 'sel', nom: 'Sel', rayonId: 'epicerie' },
  { id: 'gros-sel', nom: 'Gros sel', rayonId: 'epicerie' },
  { id: 'huile-olive', nom: "Huile d'olive", rayonId: 'epicerie' },
  { id: 'huile-isio-4', nom: 'Huile Isio 4', rayonId: 'epicerie' },
  { id: 'vinaigre', nom: 'Vinaigre', rayonId: 'epicerie' },
  { id: 'bechamel', nom: 'Béchamel', rayonId: 'epicerie' },
  { id: 'ketchup', nom: 'Ketchup', rayonId: 'epicerie' },
  { id: 'mayomix', nom: 'MayoMix', rayonId: 'epicerie' },
  { id: 'mayonnaise', nom: 'Mayonnaise', rayonId: 'epicerie' },
  { id: 'cornichon', nom: 'Cornichon', rayonId: 'epicerie' },

  // ----- Chips -----
  { id: 'chips', nom: 'Chips', rayonId: 'chips' },

  // ----- Eau et jus -----
  { id: 'eau', nom: 'Eau', rayonId: 'eau' },
  { id: 'jus-orange', nom: "Jus d'orange", rayonId: 'jus' },

  // ----- Produits de beauté -----
  { id: 'brosse-a-dents', nom: 'Brosse à dents', rayonId: 'beaute' },
  { id: 'dentifrice', nom: 'Dentifrice', rayonId: 'beaute' },
  { id: 'gel-douche', nom: 'Gel douche', rayonId: 'beaute' },
  { id: 'shampoing', nom: 'Shampoing', rayonId: 'beaute' },
  { id: 'deodorant', nom: 'Déodorant', rayonId: 'beaute' },
  { id: 'savon', nom: 'Savon', rayonId: 'beaute' },
  { id: 'coton-tige', nom: 'Coton-tige', rayonId: 'beaute' },
  { id: 'mouchoir', nom: 'Mouchoir', rayonId: 'beaute' },
  { id: 'kleenex', nom: 'Kleenex', rayonId: 'beaute' },
  { id: 'cire', nom: 'Cire', rayonId: 'beaute' },

  // ----- Produits d'entretien -----
  { id: 'eponges-jaunes', nom: 'Éponges jaunes', rayonId: 'entretien' },
  { id: 'eponges-vertes', nom: 'Éponges vertes', rayonId: 'entretien' },
  { id: 'lessive', nom: 'Lessive', rayonId: 'entretien' },
];
