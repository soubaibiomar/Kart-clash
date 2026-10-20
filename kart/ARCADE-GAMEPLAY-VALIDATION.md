# Conduite et combat Arcade — 20 octobre 2026

Première phase d'amélioration : conduite et équilibrage des armes. Les autres pistes proposées (éditeur, entraînement comparatif, modes supplémentaires) ne font pas partie de cette livraison.

## Jouer

Dans Réglages → Conduite, Arcade est le choix initial des nouvelles parties manuelles. Le volant et l'adhérence évoluent progressivement. La flèche bas freine avant de passer en marche arrière, après une temporisation de 0,18 s ; la marche arrière est limitée à 40 % du plafond.

À partir de 2 px/tick, tourner avec Maj et une commande d'accélération non négative permet de déraper. Après 0,8 s de dérapage valide, la jauge indique « Turbo prêt ». Relâcher Maj accorde 0,75 s de turbo (vitesse ×1,6, force ×1,35). Une perte de vitesse ou une pause annule la charge ; rester immobile ou tapoter Maj ne donne aucun bonus. Le turbo ne raccourcit pas un turbo existant plus long. Ses limites reviennent exactement à la normale à expiration.

## Armes Arcade

| Objet | Règle |
|---|---|
| Roquette | 2 tirs, 55 dégâts, intervalle 0,5 s |
| Missile guidé | 40 dégâts, intervalle 0,65 s |
| Rafale | 10 balles de 12 dégâts, intervalle 0,10 s |
| Mine | 65 dégâts, armée après 1 s |
| Bouclier | 4,5 s |
| Turbo ramassé | 2,5 s |

Le HUD et l'aide lisent les mêmes définitions que le moteur. Une alerte signale une mine armée à 75 px inclus, visible et au même étage ; elle respecte expiration, alliés et propriétaire. La mine conserve son véritable rayon de déclenchement de 46 px. L'alerte missile conserve une portée de 350 px. Cadence et dégâts sont des réglages initiaux vérifiés, pas une preuve d'équilibrage compétitif multijoueur.

## Compatibilité et héritage

Les anciens modèles sans propriété `gameplay` gardent les règles Classique et leurs tenseurs. Les nouveaux exports indiquent explicitement leur profil. Une évaluation avec un profil contradictoire et une démonstration d'un autre profil sont refusées. Le navigateur, l'essai local et le worker Node partagent les règles. Les schémas d'observations et les quatre sorties existants sont inchangés. Le laboratoire génétique à deux sorties conserve ses règles.

KartGameplay est un service ; les 20 types d'entités physiques conservent leur héritage Vehicle. La locomotion utilise p5.Vector, une force bornée, un `applyForce` puis un `super.update` par tick. Aucun fichier `vehicle.js` modifié. SHA-256 local : `A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`.

## Fichiers de cette phase

- Créés : `kart/gameplay.js`, `tests/kart-gameplay-v2.test.mjs`, `kart/academy/test_gameplay.py`, ce rapport et `kart/arcade-driving-combat.png`.
- Conduite et règles : `kart/entities/Kart.js`, `kart/entities/Projectile.js`, `kart/entities/Mine.js`, `kart/world.js`, `kart/weapons.js`.
- Interface et chargement : `index.html`, `kart/app.js`, `kart/game.css`, `kart/race-guide.js`, `kart/weapon-display.js`, `kart/storage.js`, `kart/session.js`.
- Modèles et atelier : `kart/brain.js`, `kart/training-trial.js`, `kart/demonstrations.js`, `kart/academy-ui.js`, `kart/node-world.cjs`, `kart/academy/evaluate.cjs`, `kart/academy/train.py`, `kart/academy/server.py`, `kart/academy/demonstrations.py`.
- Documentation : `agent.md`, `architecture.md`. Frontend reconstruit sous `dist/kart-clash`.

## Validation

- `node --test tests/*.test.mjs` : **309 réussis**, dont huit nouveaux tests sur les limites de force/vitesse, freinage/marche arrière, drift, réinitialisation, armes, seuils de mine, héritage du profil et évaluation déterministe.
- `./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'` : **28 réussis**. Fixtures temporaires bornées ; aucun modèle utilisateur modifié.
- `python -m unittest discover -s tests -p test_kart_build.py` : **3 réussis**.
- `python kart/build-frontend.py` : build **331e7a8951d5**.

Vrais p5.js/Three.js, contexte navigateur isolé : commandes clavier, charge puis bonus au relâchement de Maj, deux munitions de roquette, alerte de mine, choix et persistance du profil, aide correspondant aux dégâts du profil, création d'un modèle Arcade et sérialisation des options de démarrage. Le démarrage utilisateur a été intercepté dans ce seul contexte de validation : aucun entraînement lancé. Les panneaux restent dans une largeur de 375 px sans débordement horizontal. Aucun avertissement ni erreur console. La capture montre un état de contrôle reproductible (drift réellement calculé et mine de fixture).

Le service Académie local a été démarré sur 8871, au repos, avec la capacité gameplayV2 et la RTX 4060 Laptop détectée. Cela ne signifie pas que la simulation physique est sur GPU : PyTorch utilise CUDA pour l'apprentissage, le worker JS conserve la physique et l'évaluation CPU. Aucun entraînement utilisateur exécuté.
