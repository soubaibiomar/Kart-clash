# Sélection de circuit et course contre les pilotes sauvegardés

## Comportement livré
Jouer contient Terrain : Stadium, circuits sauvegardés, circuits exacts embarqués dans les projets/champions et exemples urbains. Les géométries sont dédupliquées indépendamment des noms. Le circuit affiche ses réseaux génétiques compatibles ; choisir jusqu’à six pilotes puis JOUER. Sans pilote, le circuit reste un essai manuel solo. Le Stadium conserve son sélecteur de cerveau de combat et ses modes existants.

Le joueur et les pilotes roulent dans un seul KartWorld. Un contrôleur TrackRaceWorld hérite de KartWorld ; les voitures IA réutilisent EvolutionKart -> Kart -> Vehicle et une instance indépendante d’EvolutionBrain par pilote. Les seules entrées du réseau sont ses rayons de bordures. Les sorties utilisent l’actionForce héritée de l’entité, applyForce et une seule intégration Vehicle. Aucun nouveau type d’entité, aucune trajectoire codée, aucun entraînement pendant la course.

Grille à deux colonnes espacées de 60 unités, rangées de 64 unités, vérification du premier segment et des colliders avant remplacement du monde. Une grille impossible est refusée explicitement. Les contacts entre voitures sont actifs. Armes désactivées sur circuit. Pause fige le monde, les arrivés ne reçoivent plus de steering, classement selon progression puis temps d’arrivée. La session se termine à l’arrivée du joueur ou après trois minutes. Les rivaux inachevés restent indiqués non terminés. Rejouer/Recommencer conservent circuit et modèles. Aucun record solo ni fantôme personnel n’est produit dans une course partagée.

Un réseau appris seul peut mal gérer le trafic ; aucune promesse de tour réussi. Les contrôleurs de combat et de bordures ne sont pas convertis entre formats. Les poids sauvegardés ne sont pas modifiés.

## Fichiers
Créés : kart/race-selection.js, kart/track-race.js, tests/kart-race-selection.test.mjs, ce rapport.
Modifiés : kart/app.js, kart/session.js, kart/world.js (ignorer le steering d’un véhicule déjà arrivé), kart/game.css, README.md, README.fr.md, README.en.md, agent.md, architecture.md.
vehicle.js inchangé : SHA256 A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B.

## Vérifications exécutées
- node --test tests/*.test.mjs : 384 réussis, zéro échec.
- python -m unittest discover -s tests -p test_kart_build.py : 3 réussis.
- ./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py' : 29 réussis.
- python kart/build-frontend.py : build 48621f31c9a3.

Les huit nouveaux tests couvrent compatibilité géométrique, tableaux/poids invalides, six rivaux maximum, grilles séparées et bloquées, locomotion héritée unique et forces bornées, poids et réseaux indépendants, pause, arrivées, classement, collisions physiques et conservation des modes solo/combat. Un circuit uniquement embarqué dans un modèle reste sélectionnable.

Navigateur réel p5.js/Three.js, contexte isolé : route de test avec deux modèles distincts, cases cochées et clic JOUER ; trois voitures dans le même monde. Commande clavier réelle jusqu’à l’arrivée, classement final affichant un rival arrivé, le joueur et un rival inachevé. Clic Rejouer : mêmes deux réseaux restaurés. Un réseau d’un autre circuit reste exclu. Zéro POST d’apprentissage et aucune erreur/alerte console. Mobile 375 × 812 : aucun débordement horizontal ; navigation à 146 px, panneau à 154 px et bouton JOUER accessible par défilement. Aucun stockage utilisateur réel ni modèle entraîné modifié pendant ces vérifications.
