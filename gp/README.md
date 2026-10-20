> Archive F1 : l’entrée historique est maintenant `../apex-lab.html`. Le jeu actif est Kart Clash ; voir `../README.md`. Les modèles et outils ci-dessous sont conservés.

# APEX Neural Racing

## Moteur CUDA séparé du serveur de pages

La page reste sur `http://127.0.0.1:8765/training.html`, mais sa balise `training-api` cible le moteur à jour sur **127.0.0.1:8767**. `server.py --port 8767` offre les mêmes opérations validées, poids et diagnostics neuronaux. Les origines de la plateforme sur 8765 et du service lui-même sont seules autorisées ; le serveur répond au préflight JSON sans lancer de calcul. Il reste lié exclusivement à l'interface loopback.

`training/start.ps1` conserve les services existants, démarre l'API GPU séparée si nécessaire, vérifie sa capacité `weightControls` puis ouvre la plateforme. Aucun serveur n'est arrêté automatiquement. Si un entraînement est actif sur l'ancien moteur, le lanceur attend une intervention explicite au lieu de démarrer un autre moteur. Le service vocal reste sur 8766.

**Activation sur cette machine :** le démarrage automatique a été refusé par la politique d'exécution. Le nouveau service n'est donc pas encore lancé. Exécuter une fois dans PowerShell :

```powershell
& 'C:\SteeringBehaviours\5-3-PathFollowingComplex\gp\training\start.ps1'
```

Puis actualiser la page d'entraînement. Le lanceur démarre seulement les services ; le bouton GPU reste l'action explicite qui lance le calcul. Il n'est plus nécessaire de fermer l'ancien serveur.

Fichiers modifiés : `training/server.py`, `training/start.ps1`, `training-ui.js`, `../training.html`, tests et documentation. Validation : **136 tests JavaScript, 22 tests Python et 3 tests du lanceur réussis**, plus test ciblé de l'adresse d'API configurée. Les tests HTTP utilisent une instance isolée, et les tests du lanceur simulent les processus ; aucun entraînement ni nouveau service persistant n'a été démarré par ces tests.

## Inspection des réseaux et des neurones

Dans le suivi d'entraînement, **Le réseau de…** suit le pilote observé. La structure est lue dans son modèle enregistré : **18 entrées, 36 neurones cachés, 2 sorties**, soit **56 neurones** (entrées incluses), **720 connexions** et **758 paramètres** (poids et 38 biais). Une liste repliable détaille les 22 modèles indépendants. Les comptes sont calculés depuis les dimensions et tenseurs validés, pas depuis une illustration fixe.

Choisir une couche puis déplacer le curseur de neurone pour lire son rôle et sa valeur ; le survol du schéma sélectionne également un neurone. Le contrôle fonctionne au clavier. Les connexions montrent seulement la structure, sans prétendre afficher les poids du candidat GPU en cours.

`sigmoid_activations` partage le même passage avant que `sigmoid_model`. Pendant l'évaluation génétique, la preview de chaque pilote publie les 18 entrées, 36 activations cachées et 2 sorties du candidat en tête au tick indiqué. Le panneau accepte seulement les tableaux complets, finis, normalisés et attribués au pilote sélectionné. Sans ce relevé, il affiche la structure neutre et une activité indisponible, y compris pendant l'imitation ou avec un ancien moteur. Le prochain calcul lancé avec le moteur mis à jour fournira ces activations ; aucun entraînement n'a été lancé pour cette livraison.

Créés : `networkInspector.js`, `../tests/network-inspector.test.mjs`. Modifiés : `training-ui.js`, `training/train.py`, `training/test_training.py`, `platform.css`, `../training.html` et documents locaux. `vehicle.js` inchangé.

Validation : **136 tests JavaScript et 21 tests Python réussis** avec les commandes déjà documentées. Vérifications supplémentaires : petit passage CUDA sans optimisation ni export, 56 activations affichées pour le bon pilote, inspection du neurone caché 36, sélection des réseaux, vues grand/petit écran et absence d'erreurs JavaScript. Les relevés de vérification ont été retirés ensuite.

## Entraînement en 3D

Le suivi privilégie maintenant **Vue 3D de l'entraînement**. Les positions GPU du pilote sélectionné deviennent des monoplaces instanciées : même géométrie que la course, candidat en tête cerclé, candidats sortis de piste assombris, trafic de référence jaune. Caméras : circuit complet et suivi du candidat en tête. Glisser fait tourner la vue ; molette ou +/− pour zoomer, flèches pour tourner, Home ou bouton pour réinitialiser. La case des capteurs lit les rayons déjà calculés et leur origine mémorisée, sans lancer de nouvelle perception.

Le rendu ne déplace aucun candidat. Sans relevé de conduite, notamment pendant l'imitation initiale, il affiche un état d'attente explicite. Les courbes restent disponibles dans une section repliable. En cas de WebGL indisponible ou interrompu, le diagnostic 2D reste disponible. Sur mobile, sélectionner **Suivre le calcul** pour ouvrir le suivi.

Créés : `training3d.js`, `../tests/training3d.test.mjs`. Modifiés : `training-ui.js`, `platform.css`, `../training.html` et les documents locaux. Les scripts de la page sont versionnés. `vehicle.js`, les paramètres internes des réseaux et le moteur d'entraînement ne sont pas modifiés par ce rendu.

Validation : `node --test 5-3-PathFollowingComplex/tests/*.test.mjs` — **132 tests réussis**. Tests de coordonnées, caméras, validation des relevés et libération des ressources ; navigateur WebGL sur grand/petit écran, suivi et capteurs. Un petit relevé de quatre candidats sur douze ticks a été calculé sur CUDA et consommé par le rendu, sans optimisation ni export de modèles utilisateur. Les scènes de vérification ont ensuite été retirées : aucun entraînement lancé.

## Chargement cohérent des curseurs

Les trois scripts de l'écran d'entraînement portent une version dérivée de leur contenu dans `training.html`. Une page mise à jour ne réutilise ainsi pas l'ancien contrôleur présent dans le cache. Si une dépendance manque malgré tout, l'initialisation affiche « Page à actualiser » et Ctrl + F5, au lieu de rester silencieusement sur « Vérification du GPU » avec des champs vides. Un onglet ancien a été actualisé dans le navigateur Codex : huit curseurs et 22 pilotes présents.

Fichiers modifiés : `../training.html`, `training-ui.js`, `../tests/training-ui.test.mjs` et ce document. Les tests couvrent la dépendance absente sans exception, le blocage des commandes et les instructions de récupération. Cette correction de chargement ne remplace pas le redémarrage du backend requis pour activer l'API des poids.

## Curseurs de poids pour l'entraînement

Dans **Entraînement → Régler les poids**, cinq curseurs de score (0–3) règlent progression, survie, pénalité de sortie, régularité des commandes et vitesse ; trois curseurs de force (0–5) règlent séparation, évitement du trafic et éloignement des bordures. Pas : 0,01. Zéro désactive le terme correspondant ; au moins un poids de score doit être positif. Choisir un profil ou rétablir ses poids remet les valeurs de référence. Les réglages sont figés au lancement et les contrôles désactivés pendant un calcul actif.

L'imitation initiale garde sa fonction de perte. Pendant la sélection génétique, les poids de score modifient la fitness ; les poids de force modifient réellement la locomotion vectorisée GPU, avec une somme bornée à 0,24. Trois véhicules de trafic de référence sont présentés identiquement à chaque candidat, sans interaction entre populations. Le réseau perçoit ce trafic dans ses rayons et indicateurs de proximité. La projection du candidat mesure seulement sa progression ; elle ne lui impose aucune trajectoire. Les véhicules de référence suivent un scénario déterministe, distinct du pilotage des candidats.

Les valeurs traversent le formulaire, l'API validée, l'argument JSON `--weights`, les évaluations CUDA, le statut, l'historique et les métadonnées des modèles. Le suivi affiche les poids du dernier calcul et le trafic de référence en jaune dans la preview. Ces curseurs ne remplacent pas les réglages indépendants du HUD de course et ne modifient pas directement les paramètres internes du réseau.

Le service déjà en mémoire doit être relancé pour charger `server.py` modifié. La page vérifie `weightControls: 1` et bloque un lancement avec un ancien service qui ignorerait les poids. Aucun entraînement n'est lancé automatiquement. Cette livraison a validé le nouveau serveur dans les tests isolés ; l'instance existante sur 8765 reste à relancer manuellement, son arrêt automatique ayant été refusé par la politique d'exécution.

Créés : `trainingWeights.js`, `training/trainingWeights.py`, `../tests/training-weights.test.mjs`. Modifiés : `training-ui.js`, `training/train.py`, `training/server.py`, `training/test_training.py`, `platform.css`, `../training.html`, `../tests/training-ui.test.mjs` et les documents d'architecture/consignes. `vehicle.js` inchangé.

Validation : **128 tests JavaScript et 20 tests Python réussis** avec les commandes documentées ci-dessous. Les tests GPU évaluent de petits candidats synthétiques, sans optimiser ni exporter les modèles utilisateur. Dans le navigateur, une soumission interceptée a transmis huit valeurs numériques exactes pour 22 pilotes ; aucun vrai lancement. Contrôles vérifiés sur grand/petit écran.

## Reconnexion du service CUDA

La page d'entraînement vérifie le type de réponse HTTP avant de lire le JSON. Un serveur statique répondant en HTML affiche désormais l'adresse locale correcte et le lanceur `gp/training/start.ps1`, au lieu de « Unexpected token < ». Les erreurs réseau, délais dépassés et JSON illisible possèdent également un message distinct.

Après un échec de connexion, le GPU et les circuits sont revérifiés automatiquement toutes les sept périodes de suivi (environ 5,25 secondes, hors temps de réponse). La récupération réactive le lancement seulement après confirmation de CUDA ; elle ne lance aucun entraînement. Le lanceur vérifie l'API du port 8765 et refuse d'ouvrir la plateforme sur un serveur statique incompatible, sans arrêter ce serveur.

Fichiers modifiés : `training-ui.js`, `training/start.ps1`, `../tests/training-ui.test.mjs`, cette documentation et les consignes locales. Créé : `../tests/training-launcher.tests.ps1`. `vehicle.js`, les modèles et le moteur d'apprentissage restent inchangés.

Validation : 125 tests JavaScript, 14 tests Python et 2 tests PowerShell réussis. Commandes depuis la racine :

```powershell
node --test 5-3-PathFollowingComplex/tests/*.test.mjs
& ./5-3-PathFollowingComplex/gp/training/.venv/Scripts/python.exe -m unittest discover -s 5-3-PathFollowingComplex/gp/training -p test_training.py -v
& ./5-3-PathFollowingComplex/tests/training-launcher.tests.ps1
```

Dans le navigateur, une réponse HTML injectée a désactivé le lancement, puis la vraie API a rétabli la RTX 4060 et les huit circuits sans rechargement. Les tests du lanceur simulent réseau et processus ; aucun entraînement utilisateur n'a été lancé.

## Disposition de l'écran de course

La révision UI/UX structure la page avec une barre d'outils au-dessus de la piste et une console sous la piste. Le rendu p5/Three.js utilise la place restante et garde le picking synchronisé avec ses nouvelles dimensions. Les fenêtres de direction et de radio s'ouvrent depuis la barre ; le classement et les notifications restent dans la zone de course. Le CSS précédent a été remplacé dans `race-hud.css`, sans ajouter une nouvelle couche de styles.

`race-hud.css`, chargé par `../index.html`, remplace la disposition des blocs de course par un classement étroit, une barre de vues, des panneaux secondaires à droite et une télémétrie horizontale. Le message de préparation se place près du bouton de départ. Les IDs, commandes et règles de simulation sont conservés. La disposition mobile masque les éléments derrière les panneaux ouverts. Documentation de la direction dans `DESIGN.md`.

Vérification : suite JavaScript complète (121 tests), navigateur p5/Three.js, changement de caméra, curseurs, ouverture exclusive direction/radio, dimensions des panneaux et absence de débordement horizontal sur la fenêtre étroite testée. `vehicle.js` inchangé.

## Finition graphique de la course

La caméra **Caméra 3D** propose une vue arrière plus basse et proche, avec ciel, brouillard de distance, vibreurs/barrières en relief, tribunes et portique illustratifs. Les monoplaces partagent des matériaux vernis, un capot et des rétroviseurs supplémentaires avec le garage. Les menus des trois pages utilisent une finition charbon opaque et des actions rouges contrastées.

Créés : `raceScenery3d.js`, `cinematic.css`, `../tests/scenery3d.test.mjs`. Modifiés : `race3d.js`, `f1Model3d.js`, `garage3d.js`, `../index.html`, `../garage.html`, `../training.html`, `DESIGN.md`, `../agent.md`, `../architecture.md` et ce fichier. Ce rendu procédural reste illustratif et ne contient aucun asset EA. La simulation, les modèles neuronaux, le moteur d'entraînement et `vehicle.js` sont inchangés par cette évolution.

Validation : `node --test 5-3-PathFollowingComplex/tests/*.test.mjs` — 121 tests réussis ; vérification du vrai p5/Three.js, vues arrière/dessus, pages Garage/Entraînement et contrôles sur petit écran. Aucun entraînement lancé pendant ces vérifications.

## Comportements et démonstrations

Dans Course, ouvrir **Direction de course → Comportements et démonstrations**. Les curseurs règlent la séparation, l'évitement et la correction des bords des voitures. Les corrections de sécurité peuvent être désactivées ; le réseau reste alors responsable du pilotage normal. Sauvegarder/charger conserve les poids dans le navigateur.

Choisir une démonstration ouvre la caméra Paddock : déplacement errant, flocking, suivi de leader ou poursuite/fuite. Les quatre véhicules de service sont indépendants du classement. La démonstration fonctionne aussi sur la grille et possède son bouton de pause. Pour les obstacles, activer le placement puis cliquer sur la chaussée ; maximum 20. D affiche les diagnostics déjà calculés.

Ajouts : `behaviorManager.js`, `steeringBehaviors.js`, `obstacleAvoidanceBehavior.js`, `trackObstacle.js`, `serviceVehicle.js`, `behavior-ui.js` et `../tests/behaviors.test.mjs`. Intégration dans `car.js`, `safetyCar.js`, `pitCrewMember.js`, `simulation.js`, `sensors.js`, `race3d.js`, `broadcast.js`, `app.js`, `platform.css`, les deux pages de course et le lanceur de tests. Documentation : `../agent.md`, `../architecture.md` et ce fichier. `vehicle.js` reste inchangé.

Vérification depuis la racine du dépôt : `node --test 5-3-PathFollowingComplex/tests/*.test.mjs`. Les tests couvrent composition et limites des forces, seuils de voisinage, prédiction, obstacles, héritage, priorités et horloge de démonstration reproductible. Le navigateur vérifie le vrai p5.js et le rendu 3D. L'évitement est local et réactif ; les modèles neuronaux expérimentaux peuvent encore sortir de piste. Aucun entraînement utilisateur n'est lancé par ces ajouts.

## Plateforme locale

Validation de cette intégration : **118 tests JavaScript réussis, 0 échec**. Dans le vrai navigateur p5/Three.js : démonstration en mouvement sur la grille avec temps et tick de course à zéro, pause effective, placement d'obstacle via le canvas, poids synchronisés sur 22 voitures, touche D et contrôles sur petit écran. Aucune erreur JavaScript observée. SHA-256 de `../vehicle.js` inchangé : `A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`.

Ouvrir **http://127.0.0.1:8765/training.html** quand le service local est lancé. Pour relancer la plateforme, exécuter `gp/training/start.ps1` depuis PowerShell. Le service tourne uniquement sur 127.0.0.1 ; le calcul utilise la RTX 4060 locale, sans connexion à GPT ni service d’entraînement distant.

- `index.html` : piste en grand, affichage de jeu discret, pilotage et course.
- `garage.html` : réglages du Grand Prix et consultation des 22 modèles.
- `training.html` : sélection des pilotes, paramètres, lancement, arrêt et reprise de l’entraînement CUDA.

**Rien ne démarre à l’ouverture de la page.** Cliquer sur « Lancer sur le GPU » est l’action qui démarre un processus d’entraînement local. Les modèles sont enregistrés individuellement et rechargés à la prochaine ouverture de la course. Les positions du panneau d’évaluation proviennent du calcul CUDA ; les courbes proviennent des mesures, sans animation de progression inventée.

## Un vrai réseau par pilote

Chaque pilote possède un MLP **18 → 36 → 2** à deux couches sigmoïdes, ses propres 758 paramètres, sa population et son fichier `gp/models/driver-XX.json`. Les modèles ont des empreintes différentes et ne partagent pas de poids modifiables. Les métadonnées indiquent le GPU, la version du moteur, la graine et le nombre de générations.

Les observations sont les douze rayons avant/latéraux/arrière, la vitesse, l’adhérence, le rapprochement du trafic, l’occupation latérale et une demande tactique. Les sorties choisissent l’angle et la vitesse désirée. `NeuralSteering` calcule ensuite la force bornée, sans appeler `follow()`, une cible sur la ligne du circuit ou l’ancien pilote géométrique. `Vehicle.update()` reste hérité et exécuté une seule fois par tick.

Le réseau pilote pendant les phases de conduite autonome. Formation, arrêts aux stands, drapeaux rouges et commandes clavier gardent leur priorité explicite. Une voiture qui reste hors piste ou sans progression finit en abandon ; aucun pilote géométrique caché ne remplace un réseau en échec.

## Apprentissage

Le principe de l’exemple 9 est réellement repris : réseaux individuels, évaluation de conduite, sélection proportionnelle à une fitness et mutations. La sélection conserve une élite et reste séparée pour chaque pilote. Les calculs neuronaux et les évaluations de locomotion/capteurs tournent en CUDA.

Une phase d’imitation facultative fournit un départ à partir d’observations collectées sur huit circuits. La sélection génétique affine ensuite les modèles par progression réelle, survie sur piste et régularité. Le moteur d’entraînement contient un environnement vectorisé équivalent à l’intégration force/vitesse/position du véhicule, séparé du rendu p5.

**État des modèles livrés : initialisation expérimentale, pas des pilotes maîtrisant les 24 circuits.** Le premier passage local a exporté 22 modèles avec 2 000 étapes d’imitation et 12 générations. Certains sortent encore de piste : l’écran d’entraînement permet de poursuivre. Leurs noms réels ne rendent pas leurs performances ou styles officiels.

Le prototype précédent de broadcast reste dans `broadcast-lab.html`, le laboratoire steering dans `steering-lab.html`, et l’exemple serpents dans `snake-lab.html`. Le dossier de l’exemple 9 reste inchangé.

## Tests

```powershell
node --test 5-3-PathFollowingComplex/tests/*.test.mjs
& .\5-3-PathFollowingComplex\gp\training\.venv\Scripts\python.exe -m unittest discover -s 5-3-PathFollowingComplex/gp/training -p test_training.py -v
```

Les tests historiques utilisent explicitement le pilote expert pour vérifier les règles de course indépendamment de la qualité d’un modèle en apprentissage. `neural.test.mjs` vérifie séparément les vrais modèles, l’indépendance, l’inférence, les forces et l’absence de repli vers le pilote géométrique. Les tests Python vérifient CUDA sur RTX 4060, les populations indépendantes, les relevés GPU et l’API avec lancement simulé, sans démarrer un entraînement utilisateur.

## Fichiers ajoutés ou modifiés

- `gp/neuralModel.js`, `neuralSteering.js`, `models/` : réseaux individuels et conduite.
- `gp/training/{collect.mjs,train.py,server.py,start.ps1,test_training.py}` : observations, entraînement CUDA et service de la plateforme.
- `index.html`, `garage.html`, `training.html`, `gp/{game.css,game-ui.js,garage.js,training-ui.js}` : les trois écrans.
- `gp/{car.js,simulation.js,config.js,app.js}` : raccordement des modèles, choix de politique et configuration du garage.
- `tests/gp-harness.mjs`, `tests/neural.test.mjs` : vérifications dédiées.

`vehicle.js` et `path.js` restent inchangés. La couverture FIA reste partielle : voir [RULES.md](RULES.md). Provenance des circuits et licences : [CIRCUIT-SOURCE.md](CIRCUIT-SOURCE.md). Les réseaux ne changent pas ces limites.

Documentation de CUDA/PyTorch : https://pytorch.org/get-started/locally/
## Sources and coverage

Read **[RULES.md](RULES.md)** for exactly which sporting rules are applied, simplified or still pending. This is not complete FIA compliance. In particular technical/financial regulations, full parc fermé, all penalty procedures, local marshal sectors, precise VSC deltas and full official red-flag restart procedures remain outside this version.

Identities: [F1 teams](https://www.formula1.com/en/teams) and [2026 driver numbers](https://www.formula1.com/en/latest/article/all-the-2026-f1-driver-numbers-confirmed-in-full.5rh7o9mPntG7NerzVk9onc). Rules reference and limitations are in `RULES.md`. Circuit version and MIT license are in `CIRCUIT-SOURCE.md` and `CIRCUIT-LICENSE.txt`. Barlow is sourced from google/fonts under the OFL license in `fonts/OFL.txt`.

## Radio FR / EN

Dans l’écran Course, ouvre **Radio · Team & engineer**. Choisis Français ou English, puis **Écouter / Listen** pour entendre les événements de course et les réponses d’ingénieur de l’équipe sélectionnée. Les voix sont synthétiques.

Choisis voiture ou équipe, écris une instruction libre ou clique **Micro**, puis **Proposer / Review**. Vérifie le pilote, l’action, les pneus et la durée affichés ; seul **Confirmer / Confirm** applique l’instruction. Exemples : « Box this lap on soft tyres », « Rentre aux stands pneus durs », « Économise les pneus », « Save energy », « Attack », « Défendre », « Rapport voiture », « Pilotage normal ». Les actions tactiques durent 5–120 secondes simulées.

L’interprétation utilise des intentions définies, pas une compréhension universelle : phrases ambiguës ou non reconnues deviennent des messages sans effet sur la conduite. Tu peux choisir une action dans la liste pour préciser une phrase libre, puis proposer à nouveau. Les noms dans le texte ne changent pas le destinataire : vérifie la sélection affichée. Le clavier reste prioritaire sur l’IA.

La dictée demande une autorisation micro du navigateur et dépend de son support Web Speech, parfois d’un service en ligne. La langue se sélectionne avant de dicter. Aucune écoute au chargement, aucun appel à GPT, aucun entraînement déclenché par la radio. Les tests du micro emploient des événements simulés ; la reconnaissance acoustique réelle dépend du navigateur et du micro de l’utilisateur.

Ajouts : `teamRadio.js`, `radio-ui.js`, `../tests/radio.test.mjs`. Raccordements : `../index.html`, `app.js`, `game.css`, `driverAgent.js`, `neuralSteering.js`, `../tests/gp-harness.mjs`. Aucun `vehicle.js` modifié.

Références : [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition), [SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis).

## Voitures 3D et interface

La barre **Circuit / Pilote / Caméra 3D** sélectionne une vue du dessus ou une caméra perspective derrière la voiture choisie. Cliquer une voiture ou son classement la sélectionne ; les commandes clavier et la radio restent disponibles. Dans le garage, choisis une livrée puis fais glisser le modèle pour le tourner. Flèches au clavier ; Home réinitialise la vue.

Les monoplaces sont de vrais meshes 3D procéduraux avec matériaux, éclairage, quatre pneus et numéros. Le circuit est une texture p5 sur un plan 3D, pas un environnement complet avec relief. Les modèles sont illustratifs. Si WebGL n’est pas disponible, la course conserve le rendu 2D et le garage affiche une indication. Servir via la plateforme locale : les modules ne sont pas prévus pour file://.

Créés : `f1Model3d.js`, `race3d.js`, `garage3d.js`, `platform-ui.js`, `platform.css`, `vendor/three.{module,core}.js`, `vendor/THREE-LICENSE.txt`, `../tests/visual3d.test.mjs`. Modifiés : les trois pages, `app.js`, `broadcast.js` et les documents locaux. `vehicle.js` reste inchangé.

Tests : `node --test 5-3-PathFollowingComplex/tests/*.test.mjs`. Les tests 3D couvrent volumes, pneus, échelle, indépendance des matériaux, libération des ressources et conversion des coordonnées ; le navigateur vérifie le rendu réel et les commandes.

Documentation : [Three.js, matériaux](https://threejs.org/docs/pages/MeshStandardMaterial.html), [caméra orthographique](https://threejs.org/docs/pages/OrthographicCamera.html).

## Radio : son traité et commandes plus rapides

Ouvre Radio d’équipe puis **Activer et tester**. L’anglais local produit de la parole Windows et la traite réellement dans Web Audio : filtres 360–3100 Hz, compression, saturation douce, léger souffle et squelch. Volume et intensité d’effet sont réglables. Les messages urgents passent avant le bavardage ; aucune piste sonore ni aucun micro ne démarre au chargement. Les voix restent synthétiques et le son est illustratif.

La synthèse locale est un petit service séparé sur 127.0.0.1:8766, lancé avec `gp/training/start.ps1`. Il ne lance ni n’arrête CUDA. Sur ce PC seules des voix Windows anglaises sont installées : le français utilise la voix navigateur, indiquée « sans filtre ». Si le service n’est pas disponible, le même repli garde la radio utilisable. La disponibilité réelle d’une voix française dépend du navigateur.

Maintenir **R** hors d’un champ commence la dictée, relâcher termine ; le bouton Parler fonctionne aussi. Stands, Attaquer et Économiser préparent des propositions. Aucun raccourci ni aucune transcription ne remplace **Confirmer l’ordre**. Les sous-titres et l’historique affichent le pilote ou l’ingénieur sans lire ces étiquettes à voix haute.

Sources repérées : [Mercedes — How F1 Teams Talk to Drivers on Track](https://www.youtube.com/watch?v=1Jg16NAgY5Y), [FORMULA 1 — The Best Team Radio Of 2021 So Far](https://www.youtube.com/watch?v=Y2KTgs3hc30), [présentation officielle Mercedes](https://www.mercedesamgf1.com/news/how-f1-teams-talk-to-drivers-on-track). Les pages vidéo n’ont pas pu être lues dans cet environnement ; aucune écoute de leur audio ni mesure acoustique n’est revendiquée. Aucun extrait n’a été téléchargé ou réutilisé.

Documentation technique : [Microsoft SpeechSynthesizer](https://learn.microsoft.com/en-us/dotnet/api/system.speech.synthesis.speechsynthesizer), [Web Audio](https://developer.mozilla.org/en-US/docs/Web/API/AudioNode).

Créés : `radioAudio.js`, `trainingState.js`, `radio/{voice.ps1,voice_server.py,test_voice.py,.gitignore}`, `../tests/radio-audio.test.mjs`. Modifiés : pages Course/Entraînement, `radio-ui.js`, `training-ui.js`, `garage.js`, `platform.css`, `broadcast.js`, lanceur, écriture de statut dans `training/train.py` et tests/documents associés. Aucun `vehicle.js` modifié.

Validation : **104 tests JavaScript**, **11 tests entraînement/API**, **3 tests voix locale** réussis. Commandes :

```powershell
node --test 5-3-PathFollowingComplex/tests/*.test.mjs
& .\5-3-PathFollowingComplex\gp\training\.venv\Scripts\python.exe -m unittest discover -s 5-3-PathFollowingComplex/gp/training -p test_training.py -v
& .\5-3-PathFollowingComplex\gp\training\.venv\Scripts\python.exe -m unittest discover -s 5-3-PathFollowingComplex/gp/radio -p test_voice.py -v
```

Le navigateur a rendu la vraie voix WAV dans un OfflineAudioContext : silence exact à volume 0, signal fini et pic inférieur à 1 à volume 55 %, ressources libérées après lecture. Cette vérification numérique ne remplace pas une audition humaine. Dictée testée avec transcriptions simulées, sans ouvrir le micro. Aucun entraînement utilisateur n’a été lancé par ces vérifications. Le blocage Windows du statut est testé par injection de verrous temporaires/persistants ; sa reprise dans un vrai entraînement sera exercée au prochain lancement explicite.

## Corrections du 16 octobre : entraînement et fiabilité

Les services locaux doivent être lancés avec `gp/training/start.ps1` après une fermeture de session Windows. Ce lanceur préserve un service déjà actif et ne démarre aucun entraînement.

Corrections : requêtes de suivi non superposées et délai réseau borné ; erreurs de démarrage/arrêt conservées à l’écran ; nouvelle tentative d’arrêt possible ; validation stricte des paramètres et réponse HTTP récupérable si le processus ne démarre pas. L’écriture atomique avec reprise Windows protège également le bundle des modèles. L’arrêt pendant l’imitation exporte désormais les poids aux époques réellement achevées ; la reprise repart de ces poids, sans restauration de l’état interne d’Adam.

L’objectif Équilibre/Tenue de piste/Rythme est transmis au moteur CUDA et change seulement les poids du score d’évaluation, pas le déplacement des candidats. Les huit circuits présents dans les observations actuelles sont sélectionnables. Les 24 tracés de course ne sont pas tous présents dans ce jeu d’apprentissage.

Le sélecteur de pilote affiche sa propre population, et non celle du premier pilote sous un autre nom. Le candidat en tête de progression est encadré ; ses sondes utilisent leur origine et orientation au dernier vrai scan GPU, sans recalcul de perception dans le rendu. Les scores comparés appartiennent au même circuit et au même départ. Les relevés historiques agrégés restent lisibles dans le fichier d’état mais ne sont pas attribués artificiellement à chaque pilote. Les données nouvelles apparaissent au prochain lancement explicite de la plateforme.

Fichiers modifiés : `training/{train.py,server.py,test_training.py}`, `training-ui.js`, `trainingState.js`, `platform.css`, `../training.html`, `../tests/radio-audio.test.mjs`. Créé : `../tests/training-ui.test.mjs`. `vehicle.js` conservé à l’identique.

Validation exécutée :

```powershell
node --test 5-3-PathFollowingComplex/tests/*.test.mjs
# 106 tests réussis
& .\5-3-PathFollowingComplex\gp\training\.venv\Scripts\python.exe -m unittest discover -s 5-3-PathFollowingComplex/gp/training -p test_training.py -v
# 14 tests réussis
```

Le navigateur a vérifié p5/3D, l’absence d’erreurs JavaScript, la sélection individuelle, la sérialisation des objectifs et l’affichage persistant d’une erreur d’arrêt. Les appels de lancement/arrêt de ces vérifications étaient interceptés ; aucun entraînement utilisateur n’a été lancé. Les tests GPU évaluent une petite population synthétique et les tests d’export simulent la sauvegarde.


## Pilote et modèles partagés entre écrans

Choisir une voiture en Course ou une livrée dans Garage met à jour le pilote commun. Les liens contextuels ouvrent sa course, son garage ou sa préparation d’entraînement. Les paramètres et les huit poids sont mémorisés pendant la préparation ; ils ne lancent aucun calcul. Le circuit sauvegardé du garage est proposé pour l’évaluation lorsqu’il existe parmi les circuits du service GPU.

Après un entraînement effectué depuis la plateforme, utiliser **Actualiser les modèles entraînés** dans Garage, puis ouvrir un nouveau week-end : Course relit les fichiers validés de chaque pilote. Une course déjà lancée conserve sa version des réseaux. Les poids de sécurité de l’export initialisent chaque voiture. Le réseau reste responsable de sa direction ; les corrections locales de freinage et de bordures ne garantissent pas qu’un modèle encore immature termine son tour.

Validation de cette évolution : depuis `5-3-PathFollowingComplex`, `node --test tests/*.test.mjs` : **143 tests réussis** ; parcours vérifié avec p5.js et rendu 3D dans le navigateur. Aucun entraînement lancé ; API CUDA indisponible pendant ce contrôle. `vehicle.js` inchangé. Voir `../architecture.md` pour la liste complète des fichiers.
