# Route prioritaire, largeurs locales et bâtiments espacés

## Utilisation
Dans Circuits, cliquer Exemple : avenues et passages. Ce nouveau tracé conserve un pont, un tunnel et des virages étroits ; les grandes lignes droites passent de 140 à 320 avec une partie centrale large, puis se resserrent progressivement. Densité par défaut : 25 %, soit 21 bâtiments contre 95 dans la version dense du même tracé. Les bâtiments restent hors de la route.

Les nouveaux brouillons ont une largeur par défaut de 240 et une densité de 25 %. Les circuits existants ne sont pas écrasés. Largeur à l’arrivée configure une nouvelle portion ; Largeur au point choisi retouche un point et se réinitialise vers la largeur par défaut. Les modifications restent annulables. Le curseur Bâtiments règle la densité de 0 à 100 %.

## Contrats
Extensions facultatives de kart-track-v2 : point.width 120–320, cityDensity 0–1. Absence de ces champs : comportement historique conservé. Pas de nouveau type d’entité : TrackSegment, TrackRail, TrackSupport et CityBuilding restent Vehicle. Les largeurs sont interpolées le long de chaque portion, réutilisées par les empreintes de rendu, rails, supports, rayons et contraintes de chaussée. Aucun comportement ne déplace une voiture directement. Les marquages et la mini-carte suivent aussi les largeurs locales.

La validation Python conserve ces données dans les calculs/exports ; les workers utilisent le moteur JS partagé. Les clés de record, la comparaison, les projets et les transferts distinguent le profil de largeur et les colliders liés à la densité. Les anciens modèles ne sont pas modifiés et doivent être réentraînés pour une géométrie différente. Aucun entraînement utilisateur lancé pendant la validation.

## Fichiers
Modifiés : kart/tracks.js, kart/entities/TrackSegment.js, kart/track-surface.js, kart/track-geometry.js, kart/city-layout.js, kart/city-art.js, kart/city-tracks.js, kart/track-pieces.js, kart/track-editor.js, kart/track-connector.js, kart/track-trial.js, kart/track-review.js, kart/track-timing.js, kart/track-workspace.js, kart/construction-view.js, kart/training-camera.js, kart/evolution-comparison.js, kart/race-selection.js, kart/evolution-ui.js, kart/race-guide.js, kart/game.css, kart/academy/train.py, kart/academy/test_tracks.py, agent.md, architecture.md et les README français/anglais.
Créés : tests/kart-road-width.test.mjs, ce rapport.
vehicle.js inchangé.

## Vérification
Les nouveaux tests couvrent bornes et non-finis, conservation des anciens formats, largeur des échantillons et limites physiques, rendu de bordure, distance des capteurs et force bornée avec une intégration héritée unique, assemblage de pont, espacement du décor et RNG, clés de record et transfert, exemple complet. Le pilote de référence termine les 64 balises du nouveau tracé sans contact, avec les forces et collisions partagées.

Navigateur réel p5.js/Three.js, session isolée : bouton d’exemple, slider de largeur 140 → 200, Annuler → 140 ; densité .25 → .10 et baisse des bâtiments ; sauvegarde/rechargement conservant largeurs et densité ; transfert Académie avec 64 decks, démarrage manuel en 3D. Zéro POST d’entraînement, aucune erreur ni alerte console. Aucun stockage utilisateur réel modifié.

Commandes exécutées :
- node --test tests/*.test.mjs : 392 réussis, zéro échec.
- python -m unittest discover -s tests -p test_kart_build.py : 3 réussis.
- ./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py' : 30 réussis.
- python kart/build-frontend.py : build 55e710544679.
Total : 425 tests réussis.
SHA256 vehicle.js : A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B.
