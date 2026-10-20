# Matières, conduite et orientation — 20 octobre 2026

## Résultat

Le jeu et l'éditeur partagent une lumière d'environnement extérieure procédurale, utilisée par les matériaux physiques pour leurs reflets. Les carrosseries ont une couche de vernis, les jantes un matériau métallique et les pneus une forte rugosité. Des feux arrière s'allument au freinage ; les échappements et une faible inclinaison de caisse rendent l'accélération plus lisible. L'asphalte et les façades ont un relief déterministe ; les vitrages ont une rugosité plus faible. Le Stadium adopte des couleurs industrielles moins saturées et des détails de bardage regroupés en instances.

Les tabliers et bordures sont maintenant des prismes à coins communs calculés par KartTrack.offset : les boîtes indépendantes ne débordent plus dans les virages et les extrémités des bordures se raccordent. Les UV de l'asphalte suivent les coordonnées du monde. Les dimensions physiques, capteurs, rails et collisions ne changent pas.

Pour mieux comprendre la partie : mini-carte, vitesse réelle en px/s, état dérapage/turbo et indication vers la caisse disponible la plus proche lorsque l'inventaire est vide. Les adversaires sont affichés uniquement à portée et sans couvert, suivant la règle existante des plaques de noms. La mini-carte est une projection plane, y compris pour un pont ; la scène principale conserve les altitudes réelles. Sur petit écran, elle laisse place aux instruments compacts.

Les traces de pneus proviennent de déplacements réellement simulés pendant un dérapage. Elles utilisent un seul mesh et un tampon de 256 segments, expirent après 12 secondes simulées, ignorent respawns, grands écarts et changements d'étage, et n'en créent pas en mouvements réduits ou pendant une pause. Le mix moteur ajoute une couche grave et une couche de frottement liée au dérapage. Les effets éloignés sont atténués. Toutes les couches continues se taisent en pause et sont libérées à la fermeture.

Ce travail améliore les matières, les sensations visuelles/sonores et l'orientation. Les personnages restent stylisés ; il ne s'agit pas d'un rendu photoréaliste. Aucune nouvelle règle de dégâts, de score, de vitesse ou de pilotage neuronal. Les shaders et textures restent locaux, sans téléchargement d'assets externes.

## Fichiers

- Créés : `kart/daylight.js`, `kart/skid-trails.js`, `kart/race-guide.js`, `kart/drive-sound.js`, `tests/kart-realism-play.test.mjs`, ce rapport et `kart/realism-street.png`.
- Modifiés : `kart/renderer.js`, `kart/city-art.js`, `kart/arcade-art.js`, `kart/track-geometry.js`, `kart/track-builder-view.js`, `kart/audio.js`, `kart/app.js`, `kart/game.css`, `agent.md`, `architecture.md`.
- Aucun fichier d'entité physique modifié. Les 20 classes continuent d'hériter de Vehicle ; les nouveautés sont des services de rendu, audio ou DOM. Les matériaux possèdent leurs textures et les libèrent ; les probes d'environnement vivent jusqu'à la fermeture de leur renderer.
- `vehicle.js` inchangé : SHA-256 `A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`.

## Tests exécutés

- `node --test tests/*.test.mjs` : **295 réussis**, aucun échec. Neuf nouveaux tests : cartes de texture/lumière déterministes, propriété et libération des textures, matières du kart sans mutation physique, traces bornées/horloge/respawn/étages/mouvements réduits, état de la boussole, adversaires cachés, silence audio et raccords exacts des bordures.
- `./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'` : **26 réussis**, fixtures temporaires bornées.
- `python -m unittest discover -s tests -p test_kart_build.py` : **3 réussis**.
- `python kart/build-frontend.py` : **51d10ab280b8**.

Total : **324 tests réussis**. Aucun entraînement utilisateur lancé ni modèle/sauvegarde utilisateur modifié.

## Parcours navigateur

Contexte isolé, vrais p5.js/Three.js. Partie avec deux bots, accélération puis virage avec Maj : vitesse mesurée 288 px/s, instrument 288, 60 segments de traces produits, positions finies. Pause : temps et traces figés, audio désactivé. Équipement d'une arme : indication de caisse masquée. Quatre reconstructions du monde : nombre de ressources stable (319). À 375 × 812, instruments compacts dans l'écran et mini-carte masquée ; panneau d'arme et santé conservés.

Essai de circuit urbain, éclairage PBR actif ; capture `kart/realism-street.png` dans une scène de contrôle figée pour montrer les matières et les instruments. Construction depuis un brouillon : deux lignes puis aperçu de virage, environnement actif et passage urbain dégagé. Cinq reconstructions de l'éditeur : 35 matériaux et 106 ressources, stables. Aucun avertissement/erreur console après chargement du build final. Les compteurs observés ne constituent pas une mesure de FPS garantie sur tous les appareils.
