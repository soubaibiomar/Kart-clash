# Correction des roues — 20 octobre 2026

L'ancien modèle combinait une rotation X de 90° sur chaque cylindre et une animation Euler Z : en roulant, l'axe du cylindre changeait de direction. Le capuchon ne tournait pas avec le pneu. Le centre était aussi à 9 pour un rayon de 10, ce qui enterrait légèrement les pneus.

`kart/kart-wheels.js` construit maintenant une géométrie dont l'axe Z est fixé avant la mise en cache. Une hiérarchie pivot de direction → groupe de roulement → pneu/jante/capuchon sépare le braquage et le roulement. La clé de cache distingue ces cylindres des cylindres verticaux du décor. Les centres sont à la hauteur exacte du rayon et écartés de la carrosserie. Le pneu reçoit des rainures et la jante un repère de rotation.

Le groupe entier tourne selon la distance réellement parcourue divisée par le rayon, dans le bon sens en marche arrière. Les roues arrière ne braquent pas. Les poses de population transmises par le worker utilisent leur déplacement affiché, sans intégration physique locale ; un grand saut est ignoré. À l'arrêt, aucune animation supplémentaire ; au respawn, la phase visuelle est réinitialisée. Le modèle simplifié d'entraînement réutilise la même construction avec moins de détails. Les traces de pneus ont été alignées sur le nouvel écartement.

## Fichiers

- Créés : `kart/kart-wheels.js`, `tests/kart-wheels.test.mjs`, ce rapport et `kart/tyres-fixed.png`.
- Modifiés : `kart/renderer.js`, `kart/skid-trails.js`, `agent.md`, `architecture.md`.
- Aucun fichier d'entité physique modifié : les roues décorent le Kart existant, qui reste un Vehicle. Forces, collisions et réseaux inchangés.
- Frontend reconstruit : `python kart/build-frontend.py`, build **6e41a3249466**.
- `vehicle.js` inchangé, SHA-256 `A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`.

## Validation

- `node --test tests/*.test.mjs` : **301 tests réussis**, dont six nouveaux tests sur contact au sol, axe constant sur un tour, braquage, roulement groupé, marche arrière, arrêt/respawn, poses transmises et cache géométrique.
- `./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'` : **26 réussis**, fixtures temporaires bornées.
- `python -m unittest discover -s tests -p test_kart_build.py` : **3 réussis**.

Total : **330 tests réussis**. Aucun entraînement utilisateur lancé.

Navigateur isolé, vrais p5.js et Three.js : variation de l'axe après un quart de tour **0**, bas du pneu au sol à l'erreur flottante près (−1,8 × 10⁻¹⁵), quatre roues sur les deux modèles. Conduite avec l'entrée clavier réelle, rotation visible, roues stables pendant la pause et braquage arrière nul. Aucun avertissement/erreur console. Capture de contrôle sous un angle rapproché : `kart/tyres-fixed.png`. Aucun onglet ni stockage utilisateur modifié.
