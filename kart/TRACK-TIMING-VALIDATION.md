# Contre-la-montre personnel — 20 octobre 2026

**Circuits → Conduire en 3D** affiche un chronomètre, les temps de secteur, le record local et l'écart au record à la dernière balise franchie. L'écart utilise les temps cumulés du même passage de référence ; il ne combine pas les meilleurs secteurs de sessions différentes. Sa couleur accompagne le signe numérique.

Trois secteurs sont découpés selon la longueur 3D cumulée du tracé, aux balises disponibles. Une route ouverte de trois points possède deux secteurs. Le temps est nul pendant le compte à rebours, avance avec l'horloge active du monde, se fige en pause et se fixe à l'arrivée. Un parcours inachevé ne remplace aucun record. Le panneau de résultats montre les secteurs terminés et signale un stockage indisponible sans annoncer une sauvegarde réussie.

Les records sont propres à la géométrie exacte, à la largeur, à la fermeture, aux altitudes/types de portions, au profil de conduite et aux limites initiales de vitesse/force. Renommer seul un circuit conserve son record. Un changement de géométrie ou de profil utilise une autre référence. Jusqu'à 24 records sont conservés dans la nouvelle clé locale `kart-clash-track-times`, sans changer les circuits ou modèles existants. Une nouvelle fin relit le stockage pour ne pas écraser un meilleur temps sauvegardé entre-temps.

## Frontières

`TrackRunTiming` est un service facultatif de télémétrie. `TrackTrial.tick` le notifie après chaque validation de balise, au même tick physique. Le service ne calcule aucune perception, force ou commande et ne déplace aucune entité. Il n'est installé que dans les sessions manuelles de l'application. Les essais neuronaux, populations génétiques, workers, formats de modèles et règles de progression restent identiques. Les 20 classes physiques existantes conservent leur héritage Vehicle.

Le chronométrage suit les zones de validation des balises déjà présentes dans le jeu ; ce n'est pas une nouvelle ligne d'arrivée interpolée. Les timestamps ont la résolution de la simulation à 60 Hz, avec affichage en millisecondes. L'horloge conserve la politique existante des ralentissements : le temps actif peut avancer sans rattrapage physique illimité. Il s'agit d'un meilleur temps local, pas d'un classement en ligne vérifié. Les contacts restent permis et sont indiqués dans les résultats.

## Fichiers

- Créés : `kart/track-timing.js`, `kart/track-timing-view.js`, `tests/kart-track-timing.test.mjs`, ce rapport.
- Modifiés : `kart/track-trial.js` (notification facultative), `kart/app.js` (sessions manuelles, HUD, pause et résultats), `kart/game.css`, `agent.md`, `architecture.md`.
- Build : `python kart/build-frontend.py` → **511ea034cc31**.
- `vehicle.js` inchangé : SHA-256 `A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`.

## Tests

- `node --test tests/*.test.mjs` : **346 réussis**, dont huit nouveaux tests : secteurs/altitude, identité des records, compte à rebours/pause/ordre, temps final et écarts, stockage invalide/indisponible/concurrent, bornes/isolation neuronale, simulation réelle identique avec et sans télémétrie, formatage et résultats.
- `./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'` : **29 réussis**, fixtures temporaires bornées.
- `python -m unittest discover -s tests -p test_kart_build.py` : **3 réussis**.
- Après l'ajustement du placement responsive : `node --test tests/kart-track-timing.test.mjs tests/kart-camera.test.mjs tests/kart-ux-regressions.test.mjs` : **23 réussis**.

Total de la suite complète : **378 tests réussis**. Aucun entraînement utilisateur lancé, aucun modèle réécrit.

## Navigateur

Contexte isolé, vrais p5.js et Three.js : chargement de Centre-ville dans l'éditeur et lancement par Conduire en 3D ; accélération au clavier, progression et temps réels. Une fixture ouverte de trois points est ensuite parcourue par maintien de la touche d'accélération, avec la même locomotion du jeu : arrivée en **2,100 s**, deux secteurs de **1,050 s**, zéro contact. Le record apparaît dans les résultats puis au redémarrage et après rechargement. Une pause conserve exactement le temps courant. Une session avec un réseau synthétique non entraîné garde le panneau personnel masqué et n'ajoute aucun record ; aucun apprentissage n'est lancé.

Résultats lisibles à 375 × 812 sans débordement horizontal. Un chevauchement du HUD a été repéré puis corrigé : à 375 et 600 px, les boutons, le bandeau de progression et le chronomètre occupent des rangées distinctes. Les textes de progression longs sont tronqués visuellement sur ces largeurs, sans modifier leur contenu accessible. Aucun avertissement ou erreur console. Les autres onglets et le stockage utilisateur restent intacts.
