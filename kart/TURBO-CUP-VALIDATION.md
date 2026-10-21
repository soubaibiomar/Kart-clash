# Turbo Cup — Grand Prix arcade, 20 octobre 2026

## Comportement livré

Jouer ouvre Carnaval Turbo en Grand Prix arcade, trois tours et cinq adversaires scriptés. Terrain personnel et autres modes restent sélectionnables. Le profil de conduite est Arcade v2, avec dérapage/turbo existant. Le nouveau circuit garde ponts et tunnels, élargit les passages à au moins 220 et abaisse les bâtiments à 8 %.

- Objets surprises parmi les six objets existants, tirés selon la position au moment du ramassage. Les poursuivants ont plus d’options de boost et de guidage. Pas de vitesse artificielle imposée selon la position.
- Tirage visible de 0,8 seconde ; il n’autorise ni deuxième collecte ni utilisation prématurée. RNG déterministe distinct de l’animation.
- Zones turbo circulaires (rayon visible et physique 40), déclenchées par passage sur le même étage. Sortie obligatoire avant réactivation. Bonus d’une seconde, sans empilement de durées.
- Départ turbo de 1,2 seconde pour une nouvelle pression dans la fenêtre finale, maintenue jusqu’au départ.
- Impacts : tête-à-queue de 0,85 s, immunité de 1,8 s entre impacts, bouclier prioritaire. Kart toujours vivant, progression conservée. Toutes les commandes restent intégrées par les forces héritées.
- Bordures colorées, caisses violettes, drapeaux et portique Turbo Cup ; grande position de course et compteur de tours. Décor et illustrations originaux.

## Fichiers

Créés : `kart/arcade-race.js`, `kart/entities/BoostPad.js`, `kart/kart-circuit-art.js`, `tests/kart-arcade-race.test.mjs`, ce rapport.

Modifiés : `index.html`, `kart/node-world.cjs`, `kart/world.js`, `kart/track-race.js`, `kart/session.js`, `kart/weapons.js`, `kart/city-tracks.js`, `kart/race-selection.js`, `kart/race-guide.js`, `kart/inspection.js`, `kart/app.js`, `kart/renderer.js`, `kart/city-art.js`, `kart/arcade-art.js`, `kart/weapon-display.js`, `kart/game.css`, `tests/kart-controls-audit.test.mjs`, `tests/kart-ux-regressions.test.mjs`, `agent.md`, `architecture.md`, frontend généré `dist/kart-clash`.

L’inventaire vérifie désormais 22 classes physiques, chacune dans son fichier et héritant de Vehicle. `vehicle.js` n’a pas été modifié : SHA256 A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B.

## Vérifications exécutées

Depuis `C:/SteeringBehaviours/5-3-PathFollowingComplex` :

```powershell
node --test tests/*.test.mjs
# 410 réussis, 0 échec
python -m unittest discover -s tests -p test_kart_build.py
# 3 réussis
./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'
# 31 réussis
python kart/build-frontend.py
# 167af9d9d8bf
```

444 tests réussis au total. Huit tests nouveaux couvrent tirage/rangs, fenêtre de départ, expiration exacte, spin/bouclier, traversée des zones turbo, étage, sortie/réentrée, pause, limites des forces, intégration unique, géométrie et absence de mutation des données.

Navigateur réel isolé `turbo-cup-qa`, p5.js/Three.js :

- Lancement depuis le formulaire : six karts, trois tours, huit zones turbo, seize caisses ; contrôles et compteur visibles ; aucun débordement horizontal à la taille testée.
- Nouvelle pression clavier avant départ : bonus et passage sur une zone turbo observés ; déplacement réel de plus de 1400 unités.
- Essai solo clavier : roulette puis mine équipée, une munition, plus de 730 unités parcourues.
- Impact injecté comme fixture de validation : kart vivant, santé 100, message de tête-à-queue affiché. Les effets et contrôles passent par les mêmes règles du jeu.
- Restart conserve circuit, mode, adversaires et tours. Pause suspend le temps et les tirages. Ressources des zones turbo présentes dans le renderer.
- Aucune erreur/alerte console et aucun POST d’apprentissage. Aucun modèle utilisateur ni stockage du navigateur utilisateur modifié.

## Périmètre

Les karts restent attachés aux routes et rampes existantes : pas de simulation de vol ou de saut libre ajoutée. Aucun entraînement n’est lancé pour les adversaires scriptés et aucun réseau enregistré n’est transformé en pilote de secours. La durée de course reste bornée par le système Grand Tour. Le mode n’est pas une reproduction complète d’un jeu commercial.
