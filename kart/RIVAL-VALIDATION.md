# Kart Clash: Rival Academy — validation du 18 octobre 2026

Build livré : **5cd5ca567789**, vérifié après rechargement sans cache à
http://127.0.0.1:8870/dist/kart-clash/index.html#setup.

## Jouable

Une arène originale, combat individuel de trois minutes (sept bots par défaut), six objets, garage avec trois personnages et huit couleurs, sept défis, pause, résultats et replay. Ajouts : drift avec Maj, difficultés réelles, Capture du noyau, enregistrement local de conduite et workflow de rival neuronal. Les laboratoires historiques restent disponibles et les modèles existants sont préservés.

Le mode en équipe utilise deux bases, un noyau physique, trois livraisons pour gagner ou le meilleur score au terme des trois minutes. Une égalité reste une égalité. Élimination = chute du noyau. Pas de dégâts alliés. Collecteur/porteur, escorte, intercepteur et défenseur combinent navigation, arrive, pursue, evade, leader following, alignement, cohésion et séparation. La position du porteur est un objectif public signalé aux équipes ; le combat exige toujours une perception locale et une ligne de vue.

## Fichiers

Créés : `kart/entities/Core.js`, `TeamBase.js`, `kart/team-mode.js`, `kart/demonstrations.js`, `kart/academy/demonstrations.py`, `kart/academy/test_demonstrations.py`, `tests/kart-rival.test.mjs`, checklist et présent rapport.

Modifiés : `index.html`, `kart/app.js`, `game.css`, `renderer.js`, `audio.js`, `inspection.js`, `world.js`, `perception.js`, `behaviors.js`, `brain.js`, `storage.js`, `node-world.cjs`, `entities/Kart.js`, `entities/BotKart.js`, `weapons.js`, `academy-ui.js`, `academy/train.py`, `server.py`, `evaluate.cjs`, tests de schéma et documentation.

La construction sûre existante est réutilisée, testée et exécutée. Elle prépare les contenus en mémoire et remplace chaque fichier public atomiquement, préserve les fichiers non gérés, vérifie chemins/liens/jonctions et publie un identifiant. Le dossier entier n'est pas une transaction atomique. Aucun fichier privé de modèle, run, environnement ou backend Python dans le manifeste public.

## Commandes

Depuis `C:\SteeringBehaviours\5-3-PathFollowingComplex` :

```powershell
python kart/build-frontend.py
python -m http.server 8870 --bind 127.0.0.1
# Autre terminal, uniquement pour l'Académie :
& .\kart\academy\start.ps1
```

## Réglages et architecture

- Vitesse normale 4,8 px/tick, force 0,32, accélération longitudinale visée 0,28, freinage opposé 0,38 (force résultante toujours bornée), marche arrière limitée à la moitié de la vitesse normale.
- Drift : Maj + vitesse longitudinale ≥2 + braquage absolu >0,15. Direction ×1,35, conservation latérale 0,94 contre 0,25 normalement. La vitesse désirée est bornée, puis `desired - velocity`, `applyForce`, un unique `super.update`. Aucun gain de vitesse gratuit. Relâchement, pause et respawn restaurent l'état normal ; le turbo conserve ses propres limites temporaires.
- Difficulté : perception à 12/6/3 ticks, anticipation 3/8/12 ticks, tolérance de tir 0,12/0,20/0,28 rad, récupération après 3/2/1,5 s sans progrès. Expert peut déclencher le drift. Aucun ennemi détecté à travers un obstacle opaque.
- Noyau : attachement, chute et remise au centre sont des règles explicites d'objectif, séparées du steering. Les deux types physiques héritent de Vehicle. Le renderer lit leur état.
- Le debug conserve la distinction planification → commande → force appliquée ; il n'effectue ni perception, ni inférence, ni tirage aléatoire.

## Démonstrations et entraînement

Enregistrement volontaire via le HUD, indicateur visible, arrêt explicite ou limite de 1800 relevés, à 10 Hz (jusqu'à trois minutes actives). Pas de menus, pause ou commandes d'un joueur mort. Un jeu de données local remplaçable ; export/import et suppression dans l'Académie. Il contient capteurs normalisés, commandes réellement appliquées, ticks, événements terminaux, configuration et versions ; aucun nom, micro ou donnée personnelle indépendante.

Contrats : `kart-demonstration-v2`, `kart-combat-v2`, `local-v1`, `turn-throttle-fire-drift-v2`, simulation `rival-v3`. Quatre sorties : direction, accélération, tir, drift. Anciens cerveaux v1 rejetés pour l'exécution mais conservés dans le stockage, même lors de l'enregistrement d'un nouveau cerveau v2. Aucun fichier utilisateur migré ou écrasé.

Imitation CUDA à partir du joueur ou des bots ; 80 % chronologiques pour l'apprentissage, 20 % réservés, avec une seconde exclue entre les deux. Perte de validation réelle exportée. Les commandes prédites ne démontrent pas une compréhension de la personnalité du joueur. L'évolution et les mutations utilisent CUDA ; les rollouts et leur inférence utilisent la simulation JS sur CPU. Deux scénarios d'entraînement, troisième scénario réservé, références scriptées aux mêmes budgets/graines. L'évaluation indépendante d'un cerveau est également disponible, sans apprentissage ni sauvegarde automatique.

## Tests exécutés sur cette révision

```powershell
node --test tests/*.test.mjs
# 180 réussites, 0 échec, 0 ignoré (~21,8 s)
& .\gp\training\.venv\Scripts\python.exe -m unittest discover -s kart/academy -p 'test_*.py' -v
# 9 réussites, CUDA compris
python -m unittest discover -s tests -p test_kart_build.py -v
# 3 réussites
```

Après la dernière garde garantissant au moins un adversaire pour un rival sélectionné ou le mode équipe, `node --test tests/kart-rival.test.mjs tests/kart.test.mjs` a été réexécuté : **25 réussites** (déjà incluses dans les 180).

Les tests ajoutés couvrent drift/seuils/force/vitesse/update unique/restauration, noyau/héritage/ramassage/chute/livraison/victoire/pause/replay, rôles et dégâts alliés, données réelles/bornes/compatibilité/suppression, conservation des cerveaux v1, sortie drift et sélection d'un seul rival, difficulté et occlusion. L'égalité des simulations avec/sans debug est vérifiée ; avec/sans enregistrement aussi. Parité CUDA/JS tanh et ReLU, dataset navigateur/backend, séparation temporelle, imitation réelle d'un enregistrement et export vérifiés dans des dossiers temporaires avec **une époque, une génération, quatre candidats, 120 ticks**. Aucun entraînement utilisateur lancé. Des ResourceWarnings de nettoyage HTTP apparaissent dans les anciens tests, sans échec.

Journaux : `.git/rival-js-tests.log` et `.git/rival-python-tests.log` à la racine du dépôt.

## Navigateur réel et performances

p5.js et Three.js réels dans Chrome, pas des maquettes. Vérifications fraîches :

- Salon → match ; trois personnages/couleurs disponibles ; garage, aide, réglages et sept défis chargés. Défis avancés de 90 ticks chacun, objectifs et positions valides ; pas de prétention de réussite humaine des sept défis.
- Boucle extérieure pilotée par commandes injectées : quatre points atteints après 343/220/355/231 ticks, 28 ticks de contacts pendant ce parcours avec bots. Enregistrement de 191 relevés observé dans l'Académie puis supprimé comme fixture.
- Six caisses déterministes ramassées et six objets activés. Élimination puis réapparition protégée ; pause sans progression du temps ; D et répétition, case et bouton synchronisés.
- Capture du noyau simulée jusqu'au résultat dans le vrai navigateur : 2–3, puis replay avec scores 0–0, noyau libre et aucun projectile. Le test autonome Node a également terminé à 3–2. Ce sont des exécutions distinctes, pas une comparaison de déterminisme entre environnements.
- Évaluation explicite réelle d'un réseau non entraîné de fixture : trois scénarios CPU et références, verdict expérimental. Sauvegarde via l'interface, sélection au salon : un contrôleur neuronal actif, six scriptés, quatre sorties réellement calculées. Stockage des cerveaux et préférences restauré après la fixture.
- Académie : service GPU RTX 4060 Laptop reconnu, inactif ; preuve de connexion perdue pendant son redémarrage puis reconnexion. Console finale sans erreur après rechargement ; toutes les ressources publiques chargées. Aucun service sans rapport arrêté.
- Captures avant/après inspectées dans la conversation : salon, garage, partie, debug, résultats et Académie. Pas de galerie de fichiers image exportée. Inspection à 1440×900 et 1366×768, aucun débordement horizontal constaté au salon.
- Performances mesurées sur **ANGLE Intel UHD / Direct3D11**, pas sur la RTX pour le rendu : 120 intervalles requestAnimationFrame par qualité, 1366×768, sept bots. Fluide : médiane 7,0 ms / p95 7,1 ms, relevé 182 appels et 23 136 triangles, 9 entités mobiles/armes. Détaillée : médiane 6,9 ms / p95 7,1 ms, 185 appels et 25 616 triangles, 15 entités. 67/99 géométries et 14/17 textures selon le relevé. Ce sont des mesures courtes, dépendantes du cadrage et du rafraîchissement écran, **pas des durées GPU ni une garantie de performance générale**.

## Limites honnêtes

Smash Karts est resté sur son écran de chargement : aucune inspection de sa conduite en direct revendiquée. Assets procéduraux et sons originaux. Skills lus/appliqués : Make Interfaces Feel Better, Expert 3D Modeler, Code Verification. Documentation Three.js consultée via Context7 pour les compteurs de rendu.

Pas de multijoueur, tactile, sauts ou props destructibles ; ces derniers étaient facultatifs. Les cerveaux v2 apprennent le combat individuel : Capture du noyau emploie les rôles scriptés, sans repli caché d'un réseau vers un bot. La population Academy est toujours un relevé 2D statique identifié, pas une course 3D en direct. Aucun cerveau préentraîné compétent livré. Les validations courtes vérifient le fonctionnement ; elles ne prouvent pas une IA performante ni le plaisir ressenti par un joueur humain. Les sept défis existants bénéficient du drift, des contrôles et de l'inspection communs ; leurs objectifs n'ont pas été réinventés.

`vehicle.js` protégé inchangé : SHA-256
`A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`.
Les modifications préexistantes de vehicle.js dans d'autres exemples n'ont pas été touchées.
