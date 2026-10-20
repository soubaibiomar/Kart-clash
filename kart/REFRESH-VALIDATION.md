# Validation — refonte cartoon du 17 octobre 2026

## Livraison

Build final **3918e75fd887**, servi et inspecté à `http://127.0.0.1:8870/dist/kart-clash/index.html#setup`. `build.json` expose les empreintes publiques ; aucun modèle privé, environnement Python ou run dans la liste. Aucun déploiement externe.

## Changements

- Salon visuel à lancement direct, pseudo, trois personnages originaux, couleur persistante, options de bots repliées. Flèches, Espace, Échap, C et D.
- Carrosserie arrondie, grand personnage expressif, volant, roues et aileron ; couvert coloré, tour centrale et caisses marquées. HUD compact, fil borné de trois éliminations, origine du coup et alerte missile.
- Accélération et freinage revus, direction dépendante de la vitesse, marche arrière bornée. Caméra recadrée après observation d’un kart coupé au bord de l’écran. Effets réduits vérifiés.
- Inspection par clic/sélecteur, couches indépendantes, force de planification distincte de la commande et de la locomotion. Rayons à leur origine échantillonnée ; un seul calcul d’évitement. Projection sur segment avec corridor réellement utilisé et cible en avant. Collecte limitée à 700 px.
- Academy : étapes Configurer → Entraîner → Évaluer → Enregistrer → Jouer ; comparaison à un bot scripté avec graines et durées identiques sur les trois scénarios, résultats conservés dans le modèle. Données importées traitées comme non fiables.
- Build répétable : chemins validés, liens/jonctions refusés, liste publique, remplacement atomique de chaque fichier et conservation des autres fichiers. L’ensemble du dossier n’est pas remplacé atomiquement ; recharger après la fin de construction.

Fichiers principaux modifiés : `kart/app.js`, `renderer.js`, `game.css`, `perception.js`, `behaviors.js`, `brain.js`, `world.js`, `weapons.js`, `audio.js`, `storage.js`, `entities/Kart.js`, `entities/BotKart.js`, `entities/Projectile.js`, `academy-ui.js`, `academy/train.py`, `academy/evaluate.cjs`, `academy/test_academy.py`, `build-frontend.py`, `index.html`, README et architecture. Créés : `kart/inspection.js`, `tests/kart-refresh.test.mjs`, `tests/test_kart_build.py`, ce rapport. Documentation produit/design actualisée.

## Tests réellement exécutés

Depuis `C:\SteeringBehaviours\5-3-PathFollowingComplex` :

- `node --test tests/*.test.mjs` : **172 réussites, 0 échec, 0 ignoré**. Journal local `.git/kart-delivery-tests.log` à la racine. Après la dernière correction visuelle de réduction des effets, `node --test tests/kart-render-audio.test.mjs` : **2 réussites** (déjà incluses dans les 172, pas deux tests supplémentaires).
- `& ./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p test_academy.py -v` : **6 réussites**. Parité CUDA/JS et fixture bornée, y compris assertions sur la baseline et les trois scénarios. Aucun entraînement utilisateur ni ancien modèle écrasé. Le test de requêtes HTTP refusées émet des ResourceWarnings de nettoyage sans échec.
- `python -m unittest discover -s tests -p test_kart_build.py -v` : **3 réussites**, reconstruction identique, changements pris en compte, conservation des fichiers non gérés, chemins traversants et collisions de destination refusés.
- `git diff --check -- index.html README.md` : aucune erreur.

## Navigateur réel

Vrai p5.js et Three.js, paquet généré, pas une maquette :

- Salon, lancement, garage, trois modèles/couleurs, réglages, aide et Academy. GPU reconnu : RTX 4060 Laptop ; service idle, aucun entraînement automatique. État de service absent également observé et correctement indiqué.
- Parcours de la boucle extérieure par commandes clavier injectées et ticks réels : les quatre objectifs atteints en 296/216/299/226 ticks, zéro contact avec les murs. Freinage puis marche arrière mesurés : distance 29,4 px après vingt ticks, vitesse négative puis limite −2,4. Ces contrôles automatisés ne sont pas présentés comme un avis humain sur le plaisir de conduite.
- Caméra et collisions près du couvert inspectées visuellement ; une première version trop rapprochée a été corrigée. Rendu réduit : échelle d’effet 1, hauteur 10, position de simulation inchangée.
- Fixture explicite de ramassage/activation des six objets : six succès, élimination créditée, mort et réapparition protégée vérifiées.
- Manche complète intégrée en ticks accélérés : fin à zéro, classement avec 5/4/4/2/2/1/1 éliminations pour les bots. Replay cliqué : compte à rebours, scores nuls et zéro projectile.
- D une fois, repeat ignoré, aucune direction D, bouton et case synchronisés ; D pendant pause ; clic sur le joueur sélectionne l’entité 0. Fixture réseau non entraîné 28→8→4→3 : contrôleur neuronal et activations effectivement calculées, sans secours scripté.
- Les sept défis ont été ouverts et avancés ; objectifs et positions valides. La réussite/échec de chaque défi est couverte par tests déterministes ; pas de revendication d’une réussite manuelle de chacun.
- Captures inspectées avant pour salon, préparation, garage et Academy ; après pour salon/préparation, garage, combat, debug, résultats et Academy. Tailles de bureau 1920×935, 1366×768 et 1440×900. Pas de débordement horizontal constaté. L’enregistrement des captures dans le chemin local demandé à l’outil a été refusé ; elles ont été visualisées dans la conversation. Pas de série avant complète enregistrée pour combat/debug/résultats.
- Console finale sans erreurs/alertes et ressources publiques sans réponse HTTP d’erreur. Au début, un ancien serveur indisponible et des réponses en cache ont été constatés : serveur relancé et contrôle effectué après rechargement complet.

## Limites et intégrité

Smash Karts ouvert au navigateur mais resté sur son écran de chargement ; aucune comparaison de sa conduite réelle n’est revendiquée, aucun asset extrait. Skills utilisés : Expert 3D Modeler et Code Verification ; documentation Three.js consultée avec Context7. Le skill design-taste-frontend a été consulté mais ses prescriptions de sites marketing n’ont pas été appliquées au jeu.

Une seule arène, physique arcade au sol, aucune conduite tactile ou multijoueur réseau. La preview Academy reste un relevé 2D statique clairement identifié. Calcul d’apprentissage CUDA, évaluation physique JavaScript CPU. Pas de cerveau combat préentraîné performant livré ; finir un budget n’est pas satisfaire le critère de réussite. Les réglages révisés nécessitent de réévaluer les anciens cerveaux compatibles.

Le Vehicle fourni reste strictement inchangé : SHA-256 `A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`. Aucun autre exemple ni laboratoire ni fichier de modèle modifié par cette refonte.
