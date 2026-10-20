# Correction du combat et amélioration graphique

## Corrections

- Premier balayage des projectiles depuis le tireur jusqu’au projectile : le décalage initial du canon ne permet plus de tirer à travers un mur proche.
- Missiles guidés : sélection ennemie et perception du couvert au bon étage ; pursue conserve sa force bornée. Les alliés ne bloquent plus les projectiles et ne déclenchent pas les mines.
- Mines : placement refusé derrière un obstacle sans consommation ; détection avec ligne de vue, armement et filtrage d’altitude conservés. Le propriétaire reste vulnérable à sa propre mine armée.
- Validation d’usage commune au moteur et au HUD : pause, vie, phase, munitions, capacités et cadence. Le HUD explique un placement bloqué et utilise la durée réelle du tir précédent pour la recharge. Les dégâts invalides sont refusés.

## Graphismes

Six accessoires d’arme équipée sur les karts ; modèles distincts pour roquette, missile, balle et mine ; réacteur lumineux, empennages, corps et anneaux de mine. Le cercle reste le rayon réel de 46 unités et sa couleur lit l’état d’armement. Impacts, étincelles et fumée sont déclenchés par les événements réels ; maximum 32 effets, temps simulé et mouvements réduits respectés. Matériaux propres aux mines/effets libérés à leur retrait ; géométries partagées. Éclairage Standard avec rugosité/métallicité effectives, ombres de contact plus douces et grain d’asphalte à l’échelle du terrain. L’aide utilise les mêmes illustrations que le HUD. Aucun asset externe ajouté.

Les roquettes restent des projectiles à impact direct ; le cercle d’expansion de l’explosion est visuel et n’ajoute pas de dégâts de zone.

## Fichiers

Créés : `kart/weapon-art.js`, `kart/combat-effects.js`, `tests/kart-combat-fixes.test.mjs`, `tests/kart-weapon-art.test.mjs`, ce rapport et `kart/combat-graphics.png`.

Modifiés : `kart/weapons.js`, `kart/entities/Projectile.js`, `kart/entities/HomingMissile.js`, `kart/entities/Mine.js`, `kart/renderer.js`, `kart/arcade-art.js`, `kart/weapon-display.js`, `kart/app.js`, `kart/game.css`, `tests/kart-arcade.test.mjs`, `agent.md`, `architecture.md`. Frontend reconstruit sous `dist/kart-clash` : **a7e1c061a928**.

## Tests exécutés

Depuis `C:\SteeringBehaviours\5-3-PathFollowingComplex` :

| Commande | Résultat |
|---|---|
| `node --test tests/kart-combat-fixes.test.mjs tests/kart-weapon-display.test.mjs tests/kart-3d-tracks.test.mjs` | 26 réussis |
| `node --test tests/kart-weapon-art.test.mjs tests/kart-arcade.test.mjs tests/kart-render-audio.test.mjs` | 16 réussis |
| `node --test tests/*.test.mjs` | 274 réussis, aucun échec, dernière exécution après les corrections finales |
| `./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'` | 26 réussis, parité/évaluation des sources communes et fixtures CUDA temporaires bornées |
| `python -m unittest discover -s tests -p test_kart_build.py` | 3 réussis |
| `python kart/build-frontend.py` | Build réussi |

Les tests couvrent notamment murs devant le canon, sélection des adversaires, alliés traversés sans dégâts, forces bornées sans mutation des positions, mines derrière le couvert, armement inclusif, filtres d’étage, propriétaire, pause, dégâts invalides, munitions épuisées/incohérentes, états HUD, propriétés des matériaux et libération des ressources après des centaines de créations/retraits.

## Vérification du navigateur

Profil isolé, frontend livré, vrais p5.js et Three.js. Activation des six objets et présence des six accessoires vérifiées ; trois types de projectiles effectivement rendus. Entrée Espace via les événements du canvas : tir réel et compteur passant à 9/10, avec projectile visible. Échap affiche la pause, reprend et suspend effectivement l’horloge. Refus d’une mine près du mur confirmé dans le HUD sans perdre de munition. Balayage du canon bloqué par le mur confirmé dans le vrai navigateur. Mine armée avec cercle de rayon 46 et changement de couleur, dégâts et élimination réels, effets et fumée présents. Le HUD tient à 375 × 812 sans chevaucher la santé ; rendu desktop vérifié à 1440 × 900. Aucun avertissement/erreur console durant le contrôle final. Capture isolée `kart/combat-graphics.png`.

Pas de sauvegarde ou de modèle utilisateur modifié ; aucune session utilisateur d’apprentissage lancée. Les tests utilisent leurs fixtures temporaires bornées. Les onglets utilisateur de construction sont conservés.

## Héritage et limites

Aucune nouvelle classe d’entité physique : Projectile, HomingMissile, Bullet, Rocket et Mine restent des descendants de Vehicle, comme Kart. Les modules artistiques ne pilotent rien. Aucune modification du fichier fourni `vehicle.js` : SHA-256 `A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`. Les observations et sorties neuronales conservent leurs schémas ; les corrections utilisent la même physique JS dans le navigateur et le worker.
