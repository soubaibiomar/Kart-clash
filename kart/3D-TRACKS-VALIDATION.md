# Validation — circuits en hauteur et couche de détection des mines

18 octobre 2026. Build livré : `d3f0a7d9dc4b`.

## Fichiers

Créés : `kart/entities/TrackSegment.js`, `TrackRail.js`, `TrackSupport.js` ; `kart/track-surface.js`, `track-geometry.js`, `track-builder-view.js` ; `tests/kart-3d-tracks.test.mjs` ; ce rapport et les captures `kart/track-3d-editor.png`, `kart/mine-detection-layer.png`.

Modifiés : `index.html` ; `kart/tracks.js`, `track-arena.js`, `track-editor.js`, `track-trial.js`, `node-world.cjs`, `world.js`, `collision.js`, `perception.js`, `behaviors.js`, `brain.js`, `storage.js`, `inspection.js`, `arcade-art.js`, `renderer.js`, `app.js`, `game.css`, `academy-ui.js` ; `kart/entities/BotKart.js`, `Mine.js` ; `kart/weapons.js` ; `kart/academy/evaluate.cjs`, `train.py`, `server.py`, `test_tracks.py` ; `README.md`, `architecture.md`, `agent.md`. Distribution reconstruite avec le lanceur existant.

## Commandes exécutées

Depuis `C:/SteeringBehaviours/5-3-PathFollowingComplex` :

- `node --test tests/*.test.mjs` : **205/205 réussis**, aucun saut. Après les derniers ajustements de l’aperçu Academy et des métadonnées : `node --test tests/kart*.test.mjs` : **62/62 réussis**. Dernière lecture d’altitude de diagnostic : `node --test tests/kart-3d-tracks.test.mjs` : **11/11 réussis**.
- `gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'` : **13/13 réussis**, sans saut CUDA. Deux générations de format de circuit sont couvertes. Un calcul v2 temporaire borné à une étape d’imitation, une génération, quatre candidats et 120 ticks vérifie export du tracé, normalisation track-deck-v2 et simulation track-v2. Aucun modèle utilisateur écrasé ; fichiers temporaires supprimés.
- `python -m unittest discover -s tests -p test_kart_build.py` : **3/3 réussis**.
- `python kart/build-frontend.py` : build **d3f0a7d9dc4b**.

Les tests couvrent altitude 0–240, pente, fermeture, croisement à 120 unités inclusives, construction d’un pont avec montée/tablier/descente, segments/rails/piliers Vehicle, conservation du tablier à un croisement, absence de collision entre étages, filtrage des capteurs, contact latéral, balises en hauteur, une seule locomotion héritée et force bornée, inférence et sauvegarde sans duplication de cerveaux, base géométrique d’une rampe, armement exact/expiration/rayon inclusif d’une mine, propriétaire/cible morte/pause, étages distincts et explosion unique.

## Exécution réelle dans le navigateur

p5.js et Three.js réels, pas de maquette. Sélection par clic sur une poignée 3D dans le navigateur intégré ; altitude passée de 160 à 180 puis rétablie ; vue du dessus, perspective et rotation par glisser testées. Vue du circuit avec un pont passant au-dessus d’un tunnel et des piliers inspectée. Camera dans le tunnel : kart au niveau 0, toiture au-dessus ; kart sur le tablier : altitude 160. Les démonstrations de référence terminent les deux exemples (7 puis 4 balises) dans le moteur partagé, avec des contacts : ce n’est pas une preuve de conduite parfaite.

Mine déposée via KartWeapons.use : cercle rouge visible après armement. Un kart à rayon + 0,1 laisse la mine en place ; à rayon exact elle disparaît, la cible passe de 100 à 30, un seul impact est émis et une seconde résolution ne double pas les dégâts. Les captures sont des scènes de contrôle préparées, sans prétention de partie humaine complète.

Le service local a été redémarré après vérification de son identité et de son état idle. RTX 4060 Laptop CUDA et capacité tracks3D reconnues. Aucun entraînement utilisateur lancé. Console finale sans erreur ni avertissement. Les fixtures de démonstration n’ont pas ajouté de cerveau ou de circuit aux sauvegardes utilisateur.

## Contrats et limites

- Conduite sur surfaces contraintes : même p5.Vector horizontal, applyForce et unique update hérité. Altitude/pente imposées par le contact de chaussée ; pas de vol, chute libre, saut ou terrain excavé. Les tunnels sont des portions couvertes, avec 94 unités libres.
- V2 garde sa normalisation track-deck-v2 et son identifiant de simulation track-v2. V1 et les cerveaux combat gardent leurs contrats. Les captures de population Academy restent des relevés en plan, colorés par hauteur ; Observer lance une exécution 3D séparée du modèle. Apprentissage/mutations CUDA, évaluations et inférence physique CPU.
- L’éditeur vérifie les croisements des axes, mais n’est pas un vérificateur exhaustif de toute intersection de volumes dessinables. Les réalisations trop serrées ou superposées peuvent rester impraticables. Pas de garantie de convergence de l’apprentissage sur tout circuit.
- Rayon de mine = 46 au centre du kart, différence verticale ≤30, armement 0,8 s, dégâts habituels 70 sur la cible déclenchante ; pas de nouveaux dégâts radiaux. Le propriétaire peut la déclencher après armement. Le disque coloré et son contour montrent le vrai rayon ; l’animation ne change que l’opacité. Les essais de circuit conservent leur objectif de conduite, avec armes désactivées ; les mines sont utilisables dans les combats existants.

`vehicle.js` protégé est resté inchangé : SHA-256 `A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`.
