# Consignes locales — F1 et laboratoires

## Composition des comportements

- `gp/behaviorManager.js` compose des forces bornées, sans déplacement ni appel à `applyForce`. Une entité applique le résultat puis délègue une seule mise à jour à `Vehicle`.
- `GrandPrixCar`, `SafetyCar`, `PitCrewMember`, `TrackObstacle` et `ServiceVehicle` héritent de `Vehicle` et possèdent leur gestionnaire. Les meshes, le décor, les interfaces et les modules de comportement ne sont pas des entités physiques.
- Conserver les priorités grille, drapeaux, stands et clavier. Le mode neuronal ajoute seulement les corrections de sécurité explicites et réglables ; le pilote expert conserve sa séparation existante, sans double application.
- Les démonstrations de paddock utilisent `serviceRng`, indépendant du hasard de course, et un pas fixe. Pause, arrêt de démonstration et changement de scénario ne doivent pas recréer leur population ni faire avancer le chronomètre de course sur la grille.
- Le debug lit les forces et origines de capteurs mises en cache. Les curseurs, la sauvegarde locale et les obstacles ne doivent pas lancer un entraînement.
- Vérifier `tests/behaviors.test.mjs` et la suite complète après toute évolution. Garder `vehicle.js` intact.

Les consignes `C:/SteeringBehaviours/AGENTS.md` et `ARCHITECTURE.md` restent prioritaires. Ne modifier aucun `vehicle.js` sans accord explicite. `path.js` est également conservé dans cette évolution.

- `apex-lab.html` conserve le simulateur F1 historique ; `index.html` lance Kart Clash ; `steering-lab.html` conserve le laboratoire de steering ; `snake-lab.html` conserve l’exemple serpent importé du dépôt amont.
- Les ajouts de week-end se trouvent dans `gp/`. Chaque entité visible mobile possède son fichier et étend `Vehicle`. Les circuits, capteurs, règles et commandes sont des services de géométrie, de perception ou d’interface.
- Les commandes clavier produisent une vitesse désirée puis une force bornée. La locomotion n’est jamais recopiée ; la mise à jour héritée est exécutée une fois par tick.
- Ne pas recalculer les capteurs pour afficher le debug. Ne pas utiliser de hasard de rendu pour la simulation. Conserver les versions et licences des données géographiques et des polices.
- Les identités 2026 ont une provenance officielle ; les profils de conduite restent des interprétations, jamais des évaluations présentées comme des télémétries réelles.
- Garder `gp/RULES.md` exact : ne pas prétendre reproduire tous les règlements FIA quand un mécanisme reste partiel.
- Avant livraison : `node --test 5-3-PathFollowingComplex/tests/*.test.mjs`, puis vérifier le vrai p5.js, les commandes clavier, les transitions de séance et les contrôles adaptatifs dans le navigateur.

## Radio d’équipe

- `gp/teamRadio.js` interprète les intentions FR/EN et porte une proposition figée : destinataires, simulation, action, pneus et durée. Aucune transcription n’est une confirmation. Les commandes libres non reconnues restent des messages ; ne jamais leur attribuer un effet inventé.
- `gp/radio-ui.js` gère le micro et les voix synthétiques du navigateur, sans API GPT. Écoute et audio exigent un geste utilisateur ; arrêt, changement de langue/séance et page cachée interrompent la parole. Afficher la dépendance éventuelle à un service de reconnaissance en ligne et conserver la saisie écrite.
- Les instructions tactiques expirent en temps simulé ; les drapeaux, stands, voitures indisponibles et la perception restent prioritaires. Ne jamais remplacer le modèle neuronal par une trajectoire pour appliquer une instruction radio.
- Tests : `node --test 5-3-PathFollowingComplex/tests/radio.test.mjs`, puis suite complète et navigateur p5.

## Rendu 3D et interface APEX

- `training3d.js` visualise les relevés CUDA du pilote observé, sans changer les positions ni recalculer les sondes. Pendant l'imitation ou en l'absence de données, afficher l'attente ; ne jamais ajouter une animation de conduite inventée. Les monoplaces sont instanciées pour borner les appels de dessin à 128 candidats.
- Conserver vue globale, suivi, navigation clavier, repli 2D et libération des ressources. Tester `tests/training3d.test.mjs` et les interactions WebGL. Les vérifications GPU évaluent seulement une petite population synthétique, sans optimiser ni exporter les modèles utilisateur.

- `raceScenery3d.js` reste du décor de rendu. Ne pas utiliser les meshes de barrières comme nouvelles règles de locomotion ou modifier le circuit pour suivre la caméra. Les instances limitent les appels de dessin ; les tribunes et largeurs sont illustratives.
- `cinematic.css` porte la finition charbon des trois pages. Préserver contrastes, focus et contrôles mobiles. Tester `tests/scenery3d.test.mjs` pour les coordonnées, budgets d'instances, ressources et caméra, puis le vrai navigateur.

- Les skills Impeccable et Expert 3D Modeler guident le rendu. Conserver les trois destinations et la priorité à la piste. `gp/platform.css` centralise leurs ajustements ; ne pas ajouter de données d’entraînement fictives.
- `gp/f1Model3d.js` construit un asset de rendu en mètres, +X avant, +Z haut. Ce groupe Three.js est la représentation d’un `GrandPrixCar extends Vehicle`, jamais une nouvelle entité autonome.
- `gp/race3d.js` lit la simulation et les capteurs existants, sans recalculer la perception ni changer position, vitesse ou forces. La vue du dessus et la caméra arrière sélectionnable doivent conserver le picking et le clavier.
- Libérer géométries, matériaux, textures et contextes aux changements de scène/page. Three.js r180 est embarqué avec sa licence MIT. Si WebGL échoue, conserver le rendu p5 et signaler la vue 2D.
- Vérifier `tests/visual3d.test.mjs`, la suite complète, les deux caméras, le garage par glisser/clavier et les trois pages sur grand et petit écran.

## Audio radio et suivi de calcul

- Le moteur CUDA dédié se trouve sur 127.0.0.1:8767 ; la page sur 8765 le choisit par la balise `training-api`. Garder les origines CORS restreintes aux adresses loopback prévues et les préflights sans effet. Le lanceur préserve les serveurs existants et ne démarre jamais un entraînement.

- L'inspecteur neuronal lit les dimensions réelles du modèle enregistré et les activations CUDA du pilote observé. Ne jamais simuler une activité par des pulsations, reconstruire arbitrairement les entrées manquantes ou attribuer les activations d'un pilote à un autre. Les liens affichés sont structurels, pas les poids d'un candidat non exporté.
- Conserver le même passage avant et les gradients lors de l'export des activations. Tester leurs valeurs contre le moteur CUDA, ainsi que les comptes, tableaux invalides et indices de neurones dans `tests/network-inspector.test.mjs` et `training/test_training.py`.

- Les huit poids de préparation passent par `TrainingWeights` et `trainingWeights.resolve_weights`. Score 0–3, forces 0–5, valeurs finies, pas de booléens numériques ; au moins un poids de score positif. Ne jamais transmettre un réglage que le backend ignorerait : vérifier sa capacité `weightControls`.
- La sélection génétique applique réellement les forces GPU bornées et la fitness pondérée. L'imitation garde sa perte. Chaque candidat perçoit le même trafic de référence, sans interaction entre populations. Conserver les poids dans le statut, l'historique et les exports ; ne pas lancer un vrai entraînement pour les vérifications.

- Vérifier le Content-Type des réponses du service CUDA avant lecture JSON. Une réponse HTML doit indiquer le lanceur et l'adresse correcte ; ne pas afficher une exception du parseur comme diagnostic utilisateur. Retenter GPU et circuits après perte de connexion, sans lancer le calcul. Le lanceur contrôle l'API avant de préserver un serveur existant et n'arrête jamais un autre serveur silencieusement.
- Tester la récupération HTML/JSON invalide/réseau/délai avec `tests/training-ui.test.mjs` et le lanceur avec `tests/training-launcher.tests.ps1` (transport et processus simulés).

- `gp/radioAudio.js` applique réellement Web Audio au PCM de parole : bande choisie de 360–3100 Hz, compression, saturation douce, volume, souffle et squelch limités à chaque transmission. Ces réglages sont des choix sonores illustratifs, pas des mesures du matériel F1. Aucun bruit permanent.
- `gp/radio/voice_server.py` sert la synthèse Windows locale sur 127.0.0.1:8766, indépendamment de CUDA. Texte JSON via stdin du script fixe `voice.ps1`, jamais interpolé dans une commande ; origines locales, taille bornée, timeout, cache borné. Ne pas exposer un service public.
- Sur ce PC, les voix Windows disponibles sont anglaises. Le français conserve un repli navigateur clairement indiqué, sans prétendre que sa voix traverse les filtres Web Audio. Ne pas cloner les voix des pilotes, ni importer des extraits YouTube.
- Les transmissions urgentes interrompent le bavardage courant ; les messages en attente expirent. Annuler les réponses tardives après arrêt/changement de séance/prise du micro. Maintenir R n’agit pas dans les champs de saisie. La confirmation d’ordre reste un clic explicite.
- Le suivi d’entraînement affiche les valeurs réelles de l’étape, avec recherche des pilotes et vues de préparation/suivi sur petit écran. `atomic_json` réessaie un remplacement brièvement bloqué par Windows, puis remonte un blocage persistant. Aucun entraînement utilisateur pendant les tests.


## Continuité entre écrans

- Réutiliser `PlatformState` pour la sélection et les brouillons validés ; ne pas stocker de physique vivante ou de tenseurs dans localStorage.
- Charger les nouveaux exports via `ModelRepository` avant un nouveau week-end et atomiquement. Ne pas remplacer les tenseurs des voitures déjà en course.
- Conserver la distinction entre la sécurité neuronale fondée sur les distances physiques et la gestion de voies du pilote expert. Tester les épingles, le trafic ayant un tour de retard, les rayons réels et une bordure exactement devant.
- Les poids d’un export initialisent la sécurité de son pilote ; ne pas appliquer les réglages incomplets d’un ancien fichier.
- Exécuter `node --test tests/*.test.mjs` (143 tests au dernier contrôle) et vérifier Course → Garage → Entraînement dans le vrai navigateur. Les sorties de piste d’un modèle immature doivent être rapportées, jamais masquées par un pilote géométrique implicite. Ne lancer aucun apprentissage utilisateur pendant les vérifications.


## Kart Clash — consignes de l’entrée active

- L’entrée active est Kart Clash. Ne réintroduire aucune identité F1, radio ou télémétrie de course dans ce jeu. Conserver les pages et modèles historiques séparément.
- Toute entité physique de `kart/entities/` hérite du Vehicle fourni. Un fichier par type. Aucun véhicule de remplacement ou copie de sa locomotion. UI, audio, décor et diagnostics sont des services/rendu.
- Réutiliser p5.Vector, BehaviorManager et SteeringBehaviors. Action, steering, intégration héritée, contacts séparés. Seuls spawn/respawn et contacts corrigent explicitement les positions.
- Le worker d’évaluation recharge les mêmes sources que le navigateur. Toute évolution des capteurs/actions/armes exige des tests de parité et une version de schéma si incompatible.
- Jamais de tâche utilisateur au chargement d’une page ou dans un test. Les tests GPU n’utilisent que des fixtures jetables strictement bornées, séparées des dossiers runs et modèles de l’utilisateur.
- Ne pas prétendre qu’un cerveau F1 est entraîné au combat, qu’un bot scripté est neuronal ou en ligne, ou qu’un graphe est une mesure sans donnée réelle.
- Vérifier la suite JavaScript, les tests Academy, puis vrai p5.js/Three.js dans le navigateur. Documenter précisément toute limite (notamment l’évaluation CPU, les horizons courts et la preview diagnostique 2D).
