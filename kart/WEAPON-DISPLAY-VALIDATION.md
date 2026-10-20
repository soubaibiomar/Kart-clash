# Affichage des armes — validation

## Livraison

- Nouveau `kart/weapon-display.js` : six illustrations SVG originales, vue DOM et lecture pure des données de combat.
- `kart/app.js` : raccord au HUD existant ; aucun changement des commandes ou des règles de combat.
- `kart/game.css` : panneau d’équipement avec type, nom, nombre de munitions, cartouches restantes, raccourci Espace, disponibilité et recharge. Jauges séparées des effets actifs, respect des mouvements réduits, mise en page adaptée aux petits écrans. La santé reste alignée en bas sans être étirée par le panneau.
- Nouveau `tests/kart-weapon-display.test.mjs`, documentation dans `architecture.md`, capture réelle `kart/weapon-hud.png`. Frontend reconstruit : `261441a1cd49`.

## Tests exécutés

Depuis `C:\SteeringBehaviours\5-3-PathFollowingComplex` :

| Commande | Résultat |
|---|---|
| `node --test tests/kart-weapon-display.test.mjs` | 7 réussis |
| `node --test tests/*.test.mjs` | 255 réussis, aucun échec |
| `./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'` | 26 réussis ; fixtures temporaires bornées, aucun modèle utilisateur modifié |
| `python -m unittest discover -s tests -p test_kart_build.py` | 3 réussis |
| `python kart/build-frontend.py` | Build réussi |

Les tests couvrent les six objets, la consommation, la limite exacte de recharge, les munitions épuisées/incohérentes, les capacités de projectiles/mines, le départ, la pause, l’élimination, la fin de manche, l’expiration exacte des effets et l’absence de mutation du monde par la présentation.

## Navigateur

Vrai p5.js et Three.js, frontend servi sur le port 8870, profil de validation isolé. Les six objets ont été équipés puis utilisés via KartWeapons ; la rafale affiche 9 cartouches après un tir sans recréer son illustration. Consommation des objets à usage unique vérifiée. Bouclier/turbo restent visibles après consommation et avec une autre arme équipée ; disparition au seuil exact. Départ et élimination ne sont jamais affichés comme prêts. Animation d’équipement désactivée avec mouvements réduits. À 375 × 812 et 1440 × 900, le panneau reste dans le viewport et séparé de la santé. Aucun message console de type erreur ou avertissement lors du contrôle final. Les sauvegardes et onglets utilisateur n’ont pas servi aux fixtures.

## Frontières

Aucune nouvelle entité physique, aucun changement de steering, locomotion, dommages ou cadence de tir. `vehicle.js` inchangé : SHA-256 `A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`. L’amélioration porte sur le HUD ; les meshes et silhouettes des armes dans le monde restent ceux du jeu existant. Le jeu conserve ses commandes clavier et n’ajoute pas de contrôle tactile.
