# Assemblage libre de circuits — 18 octobre 2026

L’outil demandé privilégie l’assemblage de portions plutôt que le dessin à main levée. L’éditeur reste en 3D ; les outils de points et de dessin restent disponibles dans « Points et réglages du circuit ».

## Utilisation

1. Ouvrir **Circuits**, puis **Nouveau circuit** pour commencer sans modifier un circuit sauvegardé.
2. Choisir une ligne droite, un virage gauche/droite, une rampe, un pont complet ou un tunnel.
3. Régler les dimensions. Longueur 80–900, rayon 80–500, virage 15–180°, altitude 0–240. Le pont règle séparément sa hauteur, son plateau et la longueur de chacune des deux rampes.
4. Le trait bleu montre la portion proposée sans modifier le circuit. **Ajouter cette portion** l’attache au dernier point. La première portion dispose d’un réglage d’orientation ; un clic sur le terrain vide permet aussi de poser le départ.
5. **Annuler / Rétablir** permet de revenir sur les assemblages. **Fermer le circuit** raccorde la fin au départ et retire le point final doublon si nécessaire.
6. Les points peuvent être sélectionnés et déplacés en 3D, ou ajustés par leurs coordonnées X/Z et leur hauteur. Le menu avancé conserve nom, largeur, types de portion, sauvegarde et import/export.
7. **Conduire en 3D** et **Entraîner sur ce circuit** utilisent le tracé validé sauvegardé. Le second bouton prépare l’Académie, sans démarrer le calcul automatiquement.

Les virages sont construits avec des intersections de tangentes : leur entrée et leur sortie reprennent exactement les directions prévues, y compris après sauvegarde et rechargement. Un circuit assemblé avec quatre virages à 90° se referme sans dérive d’orientation.

Les limites physiques existantes restent explicites : terrain 1800 × 1400, points entre X=80–1720 et Z=80–1320, maximum 240 points, pente maximale 50 %, séparation verticale de 120 aux croisements. Un ajout qui sort du terrain ou dépasse la pente est refusé avec une explication. Les erreurs globales du tracé restent visibles et empêchent de lancer une session. Aucun saut libre, embranchement de parcours ou excavation n’est ajouté.

## Architecture et héritage

`TrackPieces` est un module de géométrie de construction pur : il clone ses entrées, valide les réglages et calcule une portion. Il ne déplace aucune voiture et n’écrit pas dans le stockage.

`TrackEditor` gère réglages, historique, fermeture et validation. `TrackBuilderView` dessine l’aperçu comme diagnostic ; cet aperçu n’est pas une entité physique. Les routes jouables restent les `TrackSegment`, `TrackRail` et `TrackSupport` existants, héritant de `Vehicle`. Le pilotage et la locomotion sont inchangés.

`vehicle.js` reste intact : SHA-256 `A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`.

## Vérifications

```powershell
node --test tests/*.test.mjs
# 224 réussis, 0 échec, 0 ignoré.
node --test tests/kart-track-pieces.test.mjs tests/kart-ux-regressions.test.mjs
# 14 réussis après ajustement de la hauteur proposée au chargement d’un circuit.
& ./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'
# 18 réussis ; fixtures CUDA temporaires bornées.
python -m unittest discover -s tests -p test_kart_build.py
# 3 réussis.
python kart/build-frontend.py
# Build 550962787896.
```

Les nouveaux tests couvrent dimensions, pentes inclusives, angles et tangentes des virages, géométrie des ponts, refus des valeurs non finies, limites du terrain et des points, absence de mutation pendant l’aperçu, annulation/rétablissement, fermeture valide/invalide, sérialisation et tour complet du pilote de référence sur un circuit assemblé avec la physique partagée.

Dans un contexte navigateur isolé, les commandes réelles ont été exercées avec p5.js et Three.js : nouveau circuit, réglage des portions, aperçu sans mutation, ajout, annulation/rétablissement, pont 0→140→140→0, tunnel, refus d’une portion hors terrain, quatre lignes et quatre virages, fermeture, sauvegarde et réception du même tracé de 32 points dans l’Académie. Aucun entraînement utilisateur n’est démarré ni interrompu par cette validation. L’onglet d’entraînement existant est conservé ; le nouvel éditeur est ouvert séparément. Aucune erreur console dans le parcours testé.

## Fichiers

Créés : `kart/track-pieces.js`, `tests/kart-track-pieces.test.mjs`, ce rapport et `kart/track-assembly.png`.

Modifiés : `kart/track-editor.js`, `kart/track-builder-view.js`, `kart/game.css`, `agent.md`, `architecture.md`, `README.md`. Le frontend géré dans `dist/kart-clash` est régénéré.
