# Conception personnelle de route — 19 octobre 2026

## Changements

L’utilisateur dessine et assemble son propre tracé : brouillon vide et ouvert par défaut sans circuit sélectionné, bouton Créer un circuit vide avec annulation, exemples repliés et facultatifs. Palette visible Ligne droite, Virage gauche/droit, Pont, Tunnel, Rampe ; dimensions, hauteur, longueur, rayon et pente contrôlés par les services de géométrie existants. Nom, largeur et sauvegarde sont visibles en haut. Le menu Comment construire expose aussi placement de points, dessin libre et déplacement de poignées.

Une boucle fermée se rouvre avant ajout de nouvelles portions. Les anciens brouillons sont récupérables par l’historique ; les sauvegardes utilisateur ne sont pas supprimées. Le pont complet conserve montée/plateau/descente. Le tunnel couvert et sa vue intérieure restent disponibles. Pas de nouvelle entité physique ni nouveau moteur : TrackSegment, TrackRail et TrackSupport héritent toujours de Vehicle.

Fichiers modifiés : kart/track-editor.js, kart/track-builder-view.js (grille ajustée aux dimensions du terrain), kart/game.css, README.md, agent.md, architecture.md. Fichiers créés : tests/kart-personal-editor.test.mjs, kart/personal-track.png et ce rapport. Livraison reconstruite sous dist/kart-clash : build **5385a0da2881**.

## Vérification

```powershell
node --test tests/*.test.mjs
# 248 réussis

./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'
# 26 réussis, incluant les fixtures CUDA temporaires

python -m unittest discover -s tests -p test_kart_build.py
# 3 réussis

python kart/build-frontend.py
# 5385a0da2881
```

277 tests réussis au total. Les cinq nouveaux tests couvrent le départ vide, la préservation d’un circuit sélectionné, l’annulation d’un nouveau brouillon, les choix de palette, le refus d’ajout sur une boucle fermée et un tracé personnel avec pont, tunnel et virage réellement parcouru par la physique partagée.

Dans le vrai navigateur p5/Three, contexte isolé : terrain initial vide, exemples fermés, pont réglable ajouté puis tunnel et virage ; validation réussie, annuler/rétablir fonctionnels, sauvegarde et transmission à l’Académie du même tracé. Aucun entraînement utilisateur lancé, aucun modèle ou tracé utilisateur écrasé, aucune erreur/alerte console observée. L’éditeur personnel est ouvert dans un nouvel onglet pour conserver les éventuels brouillons de l’ancien onglet.

vehicle.js reste inchangé : SHA256 A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B. Les limites existantes restent appliquées : 240 points, altitude 0–240, pente maximale 50 %, dégagement aux croisements 120. La conduite reste une simulation de kart sans sauts ou chute libre ; le tunnel est un passage couvert.
