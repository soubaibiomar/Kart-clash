# Construction de rues entre les bâtiments — 20 octobre 2026

## Correction

Le placement des bâtiments suivait uniquement la route déjà ajoutée. L'aperçu bleu pouvait donc traverser des immeubles ; le cadrage initial sur tout le terrain rendait aussi la route difficile à voir.

L'éditeur réserve désormais le corridor de la route et de sa prochaine portion avant de générer le décor. Une chaussée bleue de pleine largeur montre le passage proposé, y compris les virages, ponts et tunnels. Les bâtiments proviennent toujours de CityLayout et bordent les rues. Ajouter une portion conserve le même plan urbain que son aperçu ; choisir ensuite une nouvelle portion recalcule son passage. La route et les sauvegardes ne sont pas déplacées par le décor.

Le premier ajout cadre la route. « Cadrer ma route » recentre la construction ; « Dans la rue » regarde dans sa direction, près du point sélectionné. Cette caméra se rapproche devant un bâtiment pour éviter une vue masquée par une façade. Les reconstructions libèrent les anciens matériaux de grille et géométries, en conservant les matériaux mutualisés.

## Fichiers

- Créés : `kart/construction-view.js`, `tests/kart-construction-streets.test.mjs`, ce rapport et `kart/construction-street.png`.
- Modifiés : `kart/track-builder-view.js`, `kart/track-editor.js`, `agent.md`, `architecture.md`.
- Frontend reconstruit par `python kart/build-frontend.py` : build `26b285280d81` dans `dist/kart-clash`.

Ce sont des services d'édition et de caméra. Les bâtiments physiques continuent d'être CityBuilding → ArenaObstacle → Vehicle ; les ponts, tunnels, garde-corps et supports conservent leurs entités existantes. Aucune force ni locomotion n'a été modifiée. `vehicle.js` inchangé, SHA-256 `A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`.

## Tests exécutés

- `node --test tests/*.test.mjs` : **281 réussis**, aucun échec. Sept nouveaux tests couvrent le dégagement du futur virage, les projections pont/tunnel, la parité aperçu/ajout, les brouillons fermés ou sans points, la largeur/altitude de l'aperçu, la caméra et la libération des ressources.
- `./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'` : **26 réussis**, fixtures temporaires bornées.
- `python -m unittest discover -s tests -p test_kart_build.py` : **3 réussis**.

## Validation navigateur

Contexte isolé, vrais p5.js et Three.js, version servie vérifiée. Deux portions droites puis aperçu d'un virage : l'ancien plan plaçait trois bâtiments dans le passage proposé ; le nouveau plan en place zéro. Vérifiés : ajout de virage, annulation exacte, rétablissement, masquer/afficher la ville, cadrage, pont à 140 unités, tunnel, vue intérieure et caméra de rue. Passage à la conduite : route personnelle conservée, 146 bâtiments héritant de Vehicle, corridor libre. Aucun avertissement ni erreur dans la console. Capture : `kart/construction-street.png`.

Aucun entraînement utilisateur lancé. Les onglets et les sauvegardes utilisateur n'ont pas été modifiés ; les essais ont leur propre stockage isolé. La ville s'adapte au tracé : le placement manuel des bâtiments ne fait pas partie de cette correction.
