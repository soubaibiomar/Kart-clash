# Projets sauvegardés : circuit, objectif et réseau

## Utilisation
Dans Académie IA, renseigner le nom et l’objectif dans « Garder ce pilote pour plus tard », puis Enregistrer le projet. Sans champion, le projet contient le circuit seul. Avec un champion, son circuit exact et ses poids sont sauvegardés ensemble. Les circuits déjà enregistrés dans l’éditeur apparaissent également dans Mes projets.

Mes projets permet de conduire manuellement le circuit, de voir le pilote enregistré dans l’essai 3D CPU existant, et d’exporter/importer un fichier JSON portable (2 Mo maximum). Le bouton Voir mon pilote ouvre cet essai ; il ne transforme pas un réseau de bordures en bot de combat. Les sauvegardes locales survivent au rechargement mais restent liées au navigateur et à l’origine. Exporter pour les conserver hors du navigateur.

Le projet conserve l’objectif comme description utilisateur ; ce texte ne modifie pas la fitness. Il conserve le réseau utilisable, pas la population/optimiseur pour reprendre une tâche GPU interrompue. Aucun lancement d’apprentissage pendant sauvegarde/navigation/relecture.

## Fichiers
Créés : kart/saved-projects.js, kart/project-library.js, tests/kart-saved-projects.test.mjs et ce rapport.
Modifiés : kart/app.js, kart/evolution-ui.js, kart/game.css, agent.md, architecture.md, README.md.

## Vérification
- node --test tests/*.test.mjs : 376 tests réussis dans la suite finale.
- node --test tests/kart-saved-projects.test.mjs tests/kart-track-workspace.test.mjs tests/kart-comparison.test.mjs : 22 tests réussis, dont la nouvelle régression de protection du modèle local.
- python -m unittest discover -s tests -p test_kart_build.py : 3 réussis.
- Navigateur réel p5.js/Three.js, contexte isolé : sauvegarde via le bouton, rechargement, lecture du réseau en 3D et lancement manuel du circuit exact validés ; zéro POST d’apprentissage, zéro erreur console.
- Cas limites : noms dupliqués refusés sans écrasement, quota indisponible, 24 projets, poids et circuits invalides, incohérence circuit/modèle, JSON endommagé ou trop grand. Un ancien champion reçu du service ne remplace pas le modèle local actuellement observé.
- vehicle.js inchangé (SHA256 A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B).

Version construite : fcfbefa7cd77. Vérification mobile 375 × 812 : aucun débordement horizontal, panneau à 154 px sous la navigation à 147 px.
