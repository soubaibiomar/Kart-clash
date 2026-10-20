# Validation — Stadium arcade

18 octobre 2026. Build public : `35435d8d66c9`.

## Changements

Créés : `kart/arcade-art.js`, `kart/arcade-view.js`, `tests/kart-arcade.test.mjs`, ce rapport et la capture `kart/arcade-game.png`.
Modifiés : `kart/renderer.js`, `kart/app.js`, `kart/game.css`, `kart/audio.js`, `tests/kart-render-audio.test.mjs`, README.md, architecture.md et agent.md. Distribution reconstruite par `python kart/build-frontend.py`.

Matériaux toon, Stadium extérieur, silhouette des karts et caisses renforcée, plaques de noms visibles à portée sans traverser le couvert. Caméra progressive à la vitesse ; recul réduit devant un obstacle et correction après amortissement. Viseur projeté sur la direction de lancement et borné au premier mur ; confirmation de dégâts et +1 après l’événement réel. Éclats bornés à 32 groupes ; sons stéréo limités et déconnectés. Aucun changement aux forces, vitesses, dégâts, règles de score, schémas des réseaux ou données d’entraînement.

## Tests

Depuis `C:/SteeringBehaviours/5-3-PathFollowingComplex` :

- `node --test tests/*.test.mjs` : **194/194 réussis**, aucun saut ni échec.
- `node --test tests/kart*.test.mjs` : **51/51 réussis**, dont caméra près du mur, ligne de vue, visée, plafonds d’effets, aucune mutation du monde, pooling et libération stéréo.
- `gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'` : **11/11 réussis**, aucun saut. Fixtures CUDA temporaires et bornées seulement.
- `python -m unittest discover -s tests -p test_kart_build.py` : **3/3 réussis**.
- `python kart/build-frontend.py` : build `35435d8d66c9`.

`vehicle.js` protégé inchangé : SHA-256 `A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`.

## Navigateur

p5.js et Three.js réels. Salon et partie inspectés ; huit karts, caisses, noms et visée visibles. Une élimination par l’API réelle des dégâts a produit score 1, cible morte, confirmation et texte « +1 · Bolt éliminé ». Capture du noyau, salon, Académie et circuit ont été chargés pendant les inspections. La nouvelle distribution est ouverte dans le navigateur intégré de l’utilisateur. Console finale sans erreur ni avertissement. Aucun débordement horizontal au salon en 1366 × 768 ; le salon a aussi été inspecté à la taille native du navigateur intégré.

Relevé court de rendu d’une scène figée avec sept bots : médiane requestAnimationFrame 7,0 ms, p95 8,4 ms sur 120 intervalles ; 356 appels, 67 448 triangles, 89 géométries, 23 textures au relevé. Cela ne mesure pas une charge GPU ni une partie complète en action, et ne garantit pas ces performances sur tout matériel.

## Référence et limites

Site officiel https://smashkarts.io/ consulté ; le canvas affiche une promotion devant le menu. Son gameplay n’a pas été joué ou comparé quantitativement. L’inspiration porte sur les volumes cartoon, la couleur et la lecture arcade. Assets procéduraux et sons propres au projet. Le jeu conserve ses cartes et ses règles ; il reste local contre des bots, sans multijoueur en ligne. Les trajectoires physiques et l’apprentissage restent ceux du moteur partagé. La capture est une scène de vérification avec positions préparées, pas une victoire humaine.
