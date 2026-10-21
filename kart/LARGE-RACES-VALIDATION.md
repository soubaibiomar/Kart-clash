# Grands circuits et courses avec armes — validation du 20 octobre 2026

## Livré

- Trois circuits Grand Tour XL : centre-ville, docks, métropole ; longueur horizontale ×2,5, terrain 4500 × 3500. La métropole conserve pont et tunnel. Tous gardent les passages 140 et avenues 320, avec décor clairsemé.
- Construction sur terrain Standard, Grand ou Immense (jusqu’à 5400 × 4200), sans déplacer les points existants. Réduction refusée si elle coupe une route. Import/export, sauvegarde et transmission vers l’Académie préservent ces dimensions.
- Choix dans Jouer → Terrain : contre-la-montre solo, course classique et course combat. Curseur 0–6 adversaires scriptés, jusqu’à cinq tours sur boucle. Réseaux enregistrés compatibles disponibles en classique ; pas de prétendue politique de tir apprise sur les réseaux à deux sorties.
- Classement par progression, caisses sur la chaussée, six objets existants, tirs Espace. Retour après élimination près de la dernière balise, progression conservée. Aucune deuxième physique.

## Fichiers créés

- `tests/kart-large-races.test.mjs` : dix tests des terrains, modes, tours, armes, étages, réapparitions, forces bornées et locomotion unique.
- `kart/LARGE-RACES-VALIDATION.md` : ce rapport.

## Fichiers modifiés

- Données / construction : `kart/tracks.js`, `city-tracks.js`, `track-pieces.js`, `track-editor.js`, `track-builder-view.js`, `construction-view.js`.
- Monde / règles : `kart/track-arena.js`, `arena.js`, `behaviors.js`, `track-race.js`, `track-trial.js`, `world.js`, `weapons.js`, `session.js`.
- Navigation / rendu : `kart/race-selection.js`, `app.js`, `renderer.js`, `city-art.js`, `race-guide.js`, `academy-ui.js`, `evolution-ui.js`.
- Identités / diagnostic : `kart/track-timing.js`, `track-workspace.js`, `track-ghost.js`, `evolution-comparison.js`.
- Service / documentation : `kart/academy/train.py`, `test_tracks.py`, `agent.md`, `architecture.md`.
- Frontend généré : `dist/kart-clash`, build `c4cc454defbe`.

## Tests exécutés

Depuis `C:/SteeringBehaviours/5-3-PathFollowingComplex` :

```powershell
node --test tests/*.test.mjs
# 402 réussis, 0 échec
python -m unittest discover -s tests -p test_kart_build.py
# 3 réussis
./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'
# 31 réussis
python kart/build-frontend.py
# build c4cc454defbe
```

Total : 436 tests réussis. Le hash SHA256 de `vehicle.js` reste A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B. Les entités physiques réutilisent toutes la hiérarchie Vehicle ; aucune classe physique indépendante ajoutée.

## Navigateur réel

Contexte Chrome isolé `xl-race-qa`, vrai p5.js et Three.js, frontend sur 8870 :

- Métropole XL sélectionnée, mode armé, trois adversaires et deux tours : quatre karts, seize caisses dont une à 140 d’altitude et une sur rampe. Santé, équipement, classement et mini-carte visibles.
- Au clavier, déplacement du joueur mesuré (>2000 unités), sept tirs réels, munitions consommées. Les bots avancent aux balises ; arrêt/reprise fige le temps.
- Éditeur : chargement XL, agrandissement à 5400 × 4200, sauvegarde de 64 points et passage vers l’Académie. Dimensions intactes, cinq canvas, pas de débordement horizontal à la taille testée.
- Aucune erreur ou alerte console. Aucun POST d’entraînement : préparer le circuit ne lance pas de calcul.

## Limites et service existant

La route reste bornée à 240 points, altitudes 0–240 et pente maximale 50 %. Les bots scriptés réagissent localement ; ils ne représentent pas des réseaux entraînés. Un départ trop court ou obstrué est refusé avec explication. La session se termine à l’arrivée du joueur ou au temps limite, avec classement des arrivées et des progressions partielles. Le bilan transmis à l’apprentissage sur une course de plusieurs tours contient le circuit, sans prétendre être une mesure de tour unique.

Le service 8871 répondait `idle`. Sa tentative de redémarrage pour charger la nouvelle validation a été rejetée par la politique d’exécution ; aucun processus n’a été arrêté. La validation Python et ses tests utilisent le nouveau code, mais le service déjà en mémoire doit être relancé manuellement avant de démarrer un entraînement sur terrain XL. Aucun calcul utilisateur n’a été lancé, aucun modèle sauvegardé modifié.
