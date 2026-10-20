# Rues entre les bâtiments — validation

## Changement livré

La ville s’organise autour de la route dessinée par le joueur. Deux rangées de façades suivent la distance parcourue le long de la route, avant le remplissage des îlots arrière. Les portes et auvents donnent sur la rue. Les placements qui ne laissent pas le dégagement nécessaire sont refusés ; les tracés denses peuvent donc conserver des ouvertures entre bâtiments.

Fichiers modifiés : `kart/city-layout.js`, `kart/entities/CityBuilding.js`, `kart/city-art.js`, `architecture.md`. Fichiers créés : `tests/kart-street-frontage.test.mjs`, ce rapport, `kart/street-frontage.png`. Le frontend servi dans `dist/kart-clash` a été reconstruit : **6c867f31d63e**.

## Tests exécutés

Depuis `C:\SteeringBehaviours\5-3-PathFollowingComplex` :

| Commande | Résultat |
|---|---|
| `node --test tests/kart-street-frontage.test.mjs` | 5 réussis |
| `node --test tests/kart-city.test.mjs tests/kart-personal-editor.test.mjs` | 16 réussis |
| `node --test tests/*.test.mjs` | 260 réussis, aucun échec |
| `./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'` | 26 réussis, fixtures temporaires bornées |
| `python -m unittest discover -s tests -p test_kart_build.py` | 3 réussis |
| `python kart/build-frontend.py` | Build réussi |

Couverture : façades des deux côtés d’une route personnelle, distances à la chaussée, stabilité lorsque le joueur subdivise une ligne droite, parcours à virages/pont/tunnel, bâtiments sans recouvrement, identifiants uniques, limite de population, héritage Vehicle, instances de collision et copie des métadonnées, brouillon vide et déterminisme sans RNG de partie. Les trois circuits urbains restent parcourables par le contrôleur de référence avec les forces bornées et zéro contact.

## Navigateur réel

Profil isolé, p5.js et Three.js réels, build livré sur le port 8870. L’éditeur 3D du centre-ville affiche 106 bâtiments dont 48 façades placées depuis le tracé. Un essai personnel constitué d’une rue droite affiche 20 bâtiments de façade sur les deux côtés, parmi 146 bâtiments au total. Vérification visuelle en conduite : route au milieu des immeubles, trottoirs, lampadaires, portes et auvents orientés vers la rue. Capture `kart/street-frontage.png`. Aucun message console de type erreur ou avertissement pendant la validation. Aucun onglet utilisateur, sauvegarde ou modèle utilisateur utilisé pour les fixtures. Aucun apprentissage utilisateur lancé.

## Frontières

Les bâtiments restent des sous-classes de Vehicle, un fichier par entité. Aucun changement des forces, de la locomotion, des paramètres neuronaux ou du schéma des circuits. Le tracé du joueur reste inchangé ; la disposition du décor urbain est régénérée autour de lui. Ponts, tunnels et leurs projections gardent leur dégagement. `vehicle.js` inchangé : SHA-256 `A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`.
