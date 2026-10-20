# Caméras de conduite — 20 octobre 2026

La touche **C** et le bouton **Vue** parcourent trois cadrages : Poursuite, Rapprochée et Haute. Dans Réglages → Ton point de vue, le choix par défaut et les curseurs Recul (75–150 %) et Réactivité (50–200 %) sont enregistrés. Les curseurs changent effectivement le cadrage et son lissage. Un obstacle peut réduire le recul choisi.

Le regard anticipe légèrement le virage et s'adapte à la marche arrière. Le champ de vision conserve l'élargissement lié à la vitesse et au turbo. Mouvements réduits retire ces variations, l'anticipation et l'interpolation. La pause arrête le lissage ; respawn et changement de vue réinitialisent le cadrage.

## Dégagement

Le contrôle est désormais tridimensionnel : les volumes des obstacles et rails tiennent compte de leur hauteur. Une construction située au-dessus de la ligne de vue ne rapproche pas inutilement la caméra. Les tabliers et coques de tunnel utilisent les mêmes meshes que le rendu, y compris leur dessous et leur pente. Le test après lissage empêche une position intermédiaire de traverser un obstacle. La caméra baisse sa hauteur souhaitée dans un tunnel.

Les poteaux de balise qui masquent le kart se cachent temporairement, tandis que leur anneau au sol demeure. Les autres balises restent visibles. Les modes de survol de l'Académie et le cadrage du menu sont conservés.

Ce sont des adaptations de rendu : aucune règle de conduite, force, observation, modèle ou entité physique n'est modifiée. La caméra n'est pas une entité du monde et n'étend pas Vehicle. Les 20 types d'entités physiques existants conservent cet héritage. `vehicle.js` inchangé, SHA-256 : `A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`.

## Fichiers

- Créés : `kart/race-camera.js`, `tests/kart-camera.test.mjs`, ce rapport.
- Modifiés : `kart/renderer.js` (service de caméra, coques et poteaux), `kart/track-geometry.js` (repérage des meshes existants), `kart/storage.js` (préférences validées), `kart/app.js` (réglages, C, bouton et aide), `kart/game.css` (réglages et panneaux étroits), `agent.md`, `architecture.md`.
- Frontend reconstruit par `python kart/build-frontend.py` : **b2832d435243**.

## Validation

- `node --test tests/*.test.mjs` : **324 réussis**, dont huit nouveaux tests : profils/curseurs/stockage, virage/recul, volumes orientés et étages, vraie coque de tunnel, dessous de pont, pause/réinitialisation/absence de mouvement physique, touche C, masquage des seuls poteaux gênants.
- `./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'` : **29 réussis**, fixtures temporaires bornées.
- `python -m unittest discover -s tests -p test_kart_build.py` : **3 réussis**.

Total : **356 tests réussis**. Aucun entraînement utilisateur lancé, aucun modèle réécrit.

Navigateur isolé, vrais p5.js/Three.js : sauvegarde des valeurs 150 %/50 % et vue Haute, restauration après rechargement, cycle C sans répétition au maintien et bouton synchronisé. Contrôle réel dans Pont et tunnel avec dix meshes de dégagement : caméra à 65 unités de hauteur dans le tunnel, transition en sortie, poteau masquant le kart retiré du rendu. Le panneau de réglages et le bouton HUD restent dans 375 px sans débordement horizontal. Aucun avertissement/erreur console.

Limites : le recul est un souhait, pas une distance garantie dans les espaces étroits. Le système protège les volumes et coques du monde actuel ; il n'ajoute ni caméra libre ni vue cockpit. Les vues sélectionnées concernent la conduite ; le survol de population conserve sa commande propre.
