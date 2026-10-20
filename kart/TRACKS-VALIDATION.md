# Validation — circuits personnalisés

18 octobre 2026, build `95326462cfeb`.

## Fichiers
Créés : kart/tracks.js, kart/track-editor.js, kart/track-arena.js, kart/track-trial.js, tests/kart-tracks.test.mjs, kart/academy/test_tracks.py.
Modifiés : index.html ; kart/app.js, game.css, renderer.js, world.js, brain.js, demonstrations.js, inspection.js, node-world.cjs, academy-ui.js ; kart/academy/evaluate.cjs, train.py, server.py ; README.md, architecture.md, agent.md. Distribution reconstruite depuis les sources.

## Commandes et résultats
- `node --test tests/*.test.mjs` : 186/186 réussis.
- Après les derniers ajustements de l’évaluation : `node --test tests/kart*.test.mjs` : 43/43 réussis.
- Après le dernier ajustement du sélecteur : `node --test tests/kart-tracks.test.mjs` : 6/6 réussis ; vérification syntaxique app/editor/Academy sans erreur.
- `gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'` : 11/11 réussis, sans saut. Comprend un entraînement CUDA isolé : une étape d’imitation, une génération, population 4, 120 ticks, fichiers temporaires supprimés ; export du circuit et métriques réelles vérifiés.
- `python -m unittest discover -s tests -p test_kart_build.py` : 3/3 réussis.
- `python kart/build-frontend.py` : distribution générée.

## Navigateur réel
Page éditeur chargée avec p5.js et Three.js réels ; ajout d’une portion, annulation, sauvegarde et sélection Académie vérifiés. Vue 3D inspectée, 36 obstacles internes plus quatre limites, joueur Vehicle ; 60 ticks de déplacement effectif. Réseau circuit non entraîné créé puis observé : contrôleur neuronal et activations présents, positions finies. RTX 4060 Laptop GPU et capacité tracks confirmées. Service idle redémarré pour charger cette capacité ; aucun entraînement utilisateur lancé. Stockage de circuits de la fixture restauré. Ces vérifications ne constituent pas un test humain exhaustif de chaque dessin libre ni une preuve de compétence du réseau.

## Limites
Terrain plat, croisements au même niveau, zone bornée, bordures en grille de 40 px. La validation n’assure pas que tout tracé est praticable. Validation neuronale sur le même tracé avec un angle initial différent ; pas de généralisation inter-circuits revendiquée. L’aperçu de population est un relevé et l’observation 3D est une exécution séparée du modèle.

`vehicle.js` inchangé : SHA-256 A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B.
