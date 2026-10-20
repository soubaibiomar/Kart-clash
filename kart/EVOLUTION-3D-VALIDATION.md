# Entraînement génétique 3D — validation du 19 octobre 2026

## Résultat

Dans `C:\SteeringBehaviours\5-3-PathFollowingComplex`, Académie IA ouvre `#evolution`. Le mode reprend le concept de `9-VoitureSuitCircuit genetic algo` et le transpose au circuit 3D partagé. Chaque candidat a son réseau indépendant, des rayons de bordure uniquement et deux sorties : direction/vitesse. Départ commun, essais indépendants, élimination sur contact ou stagnation, roulette proportionnelle à 2^fitness, mutation gaussienne et un élite exact. La fitness adaptée ajoute une progression partielle bornée et un bonus d’arrivée/temps aux checkpoints ordonnés. Il ne s’agit pas d’une copie littérale de toutes les constantes de l’exemple.

Le circuit, ses rampes, ponts et tunnels restent fixes pendant le calcul. Les collisions et capteurs respectent les étages. Les checkpoints évaluent la progression ; ils ne sont pas fournis au réseau. Aucun suivi de ligne ou pilote scripté de secours.

## Fichiers créés

- `kart/entities/EvolutionKart.js` : seule nouvelle entité physique, héritant de Kart puis Vehicle.
- `kart/evolution-brain.js` : format et inférence border-only, validation et rayons.
- `kart/evolution-population.js` : essais simultanés indépendants utilisant la locomotion partagée.
- `kart/academy/evolution-world.cjs` : processus Node persistant utilisant les mêmes sources physiques.
- `kart/academy/evolution_train.py` : population, inférence CUDA, sélection, mutations et exports atomiques.
- `kart/evolution-view.js` : population 3D, sélection, caméras, interpolation des relevés et essai local.
- `kart/evolution-ui.js` : configuration, lancement/arrêt, neurones, activations, historique et sauvegardes.
- `tests/kart-evolution.test.mjs` et `kart/academy/test_evolution.py` : contrats, locomotion, cas limites, API et CUDA réel.
- `kart/evolution-3d.png` : capture réelle d’une fixture CUDA temporaire, caméra de poursuite.
- Ce rapport.

## Fichiers modifiés

- `index.html`, `kart/app.js`, `kart/game.css` : chargement, navigation et écran responsive.
- `kart/node-world.cjs` : chargement des nouvelles classes dans la physique commune.
- `kart/renderer.js` : karts de population simplifiés et debug à l’altitude réelle.
- `kart/academy/server.py` : capacité evolution3D, démarrage selon l’algorithme, relevés/export par génération, restauration des diagnostics terminés.
- `kart/academy-ui.js` : ancien atelier conservé et protection des formats incompatibles.
- `kart/track-editor.js` : bouton vers l’entraînement génétique.
- `tests/kart-ux-regressions.test.mjs` : audit de 18 classes d’entités.
- `README.md`, `agent.md`, `architecture.md` : contrats et limites actualisés.
- `dist/kart-clash` : reconstruction des fichiers publics, build **61e09b32a3df**.

`vehicle.js` est inchangé : SHA256 `A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`.

## Vérifications exécutées

Depuis le dossier du projet :

```powershell
node --test tests/*.test.mjs
# 232 réussis, 0 échec, 0 ignoré

./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'
# 24 réussis, incluant les fixtures CUDA réelles

python -m unittest discover -s tests -p test_kart_build.py
# 3 réussis

node --test tests/kart-evolution.test.mjs
# 8 réussis après la dernière correction du raccourci D

python kart/build-frontend.py
# build 61e09b32a3df
```

Couverture : forces/vitesses bornées, un applyForce et une intégration héritée par tick, rayons normalisés/indépendants des balises, échéance inclusive de stagnation, contacts définitifs, reproductibilité, roulette avec fitness nulles, mutation sans corruption du parent, élite exact, parité CUDA/JS pour tanh et ReLU, export du candidat de la génération attendue, rejet des UUID invalides, arrêt pendant une génération conservant le champion précédent, retour du test local vers toute la population, démarrage CUDA restant associé à son propre calcul, raccourci D synchronisé sans intercepter les contrôles.

Dans le vrai navigateur p5/Three : fixture isolée de 16 réseaux sur NVIDIA GeForce RTX 4060 Laptop GPU, deux générations et 16 positions distinctes observées ; capteurs et activations reçus du calcul ; karts en poursuite et en vue générale ; sauvegarde et lecture d’un champion ; essai CPU local ; retour au flux de population ; zéro erreur/avertissement console au dernier chargement. Aperçu de 100 candidats : 932 appels de rendu observés, sans affirmer un débit garanti. Fenêtre de 600 px : aucune largeur débordante. L’écran final est ouvert dans le navigateur intégré, sans entraînement utilisateur démarré.

Les fixtures navigateur/API ont été confinées à des répertoires temporaires et à un contexte navigateur isolé. Elles ont été arrêtées/nettoyées. Le service local 8871 a été mis à jour uniquement après confirmation de l’état terminé ; les diagnostics du calcul historique `268b820f-65e3-4997-9549-3f51a2749704` sont conservés par `--resume-status`. Les anciens modèles et circuits utilisateur ne sont pas écrasés.

## Limites explicites

- CUDA : inférence des réseaux, sélection et mutation. CPU : capteurs, collisions, checkpoints et physique Vehicle partagée.
- La 3D de formation représente les relevés physiques du worker ; l’interpolation est uniquement visuelle.
- Les candidats partagent le départ et peuvent se superposer visuellement : ce sont des essais indépendants sans collision entre candidats.
- Le test d’un champion sauvegardé utilise une inférence CPU locale, identifiée à l’écran.
- Chaque lancement crée une population aléatoire. Charger un champion permet le test/export ; il n’y a pas de reprise d’apprentissage depuis ce fichier.
- La vitesse maximale reste fixe pendant ce mode. Le réseau choisit sa vitesse désirée ; le curseur des cycles accélère les essais sans augmenter ce plafond.
- Aucune garantie de convergence : une fixture de quelques secondes prouve le pipeline, pas la maîtrise d’un circuit.
- Le format kart-evolution-v1 et son stockage restent distincts des anciens modèles de combat et de l’atelier d’imitation conservé.
