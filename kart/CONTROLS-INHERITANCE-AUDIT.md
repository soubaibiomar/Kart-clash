# Audit des curseurs et de l'héritage — 20 octobre 2026

Périmètre : Kart Clash actif dans `5-3-PathFollowingComplex`, servi sous `dist/kart-clash`. Les anciens écrans F1 et les autres exemples du dépôt ne font pas partie de cet audit.

## Résultat des 20 curseurs

Chaque curseur a été manipulé dans un navigateur avec les vrais p5.js et Three.js : minimum, valeur intermédiaire et maximum, via événements input. Le navigateur arrondit les valeurs intermédiaires selon le pas du contrôle. Les valeurs, libellés et destinations ont été contrôlés. Un appui clavier réel sur la largeur a également été vérifié : 160 → 180, puis annulation → 160.

| Écran | Curseur | Bornes | Destination / effet vérifié |
| --- | --- | --- | --- |
| Construction | Largeur | 120–320 | Brouillon, libellé, géométrie reconstruite |
| Construction | Longueur | 80–900 | Paramètre de portion et longueur calculée |
| Construction | Rayon | 80–500 | Rayon du virage calculé |
| Construction | Angle | 15–180° | Angle de sortie du virage |
| Construction | Hauteur à l'arrivée | 0–240 | Altitude de la portion |
| Construction | Direction de départ | −180–180° | Orientation de la première portion |
| Construction | Sommet du pont | 60–240 | Altitude du plateau |
| Construction | Plateau du pont | 80–700 | Longueur du plateau |
| Construction | Longueur de chaque rampe | 120–700 | Longueur des montées/descentes |
| Construction | Hauteur du nouveau point | 0–240 | Altitude lue par le raycast de placement |
| Construction | Hauteur du point sélectionné | 0–240 | Point du brouillon et géométrie reconstruite |
| Jouer | Bots | 0–12 | 1, 7 et 13 voitures réelles pour 0, 6 et 12 bots |
| Réglages | Volume | 0–100 % | Préférence sauvegardée et valeur du service audio |
| Population génétique | Voitures | 4–100 | Taille réelle de la population d'aperçu et requête de lancement |
| Population génétique | Vitesse maximale | 1,2–8 | Limite effective avant le premier tick ; libellé 72–480 px/s |
| Population génétique | Probabilité de mutation | 0–1 | Valeur transmise au moteur de reproduction |
| Population génétique | Intensité des mutations | 0,01–1 | Valeur transmise au moteur de reproduction |
| Population génétique | Cycles de simulation | 1–20× | Paramètre de cadence ; ne multiplie pas la vitesse physique |
| Ancien atelier IA | Vitesse de départ | 25–100 % | Conversion en limite physique : pourcentage × 0,048 |
| Ancien atelier IA | Vitesse cible | 25–165 % | Conversion en limite physique : pourcentage × 0,048 |

Les paramètres de portion préparent le prochain ajout. Une portion hors terrain ou trop pentue est refusée avec un message ; son curseur n'est pas défectueux. La hauteur du point exige un point sélectionné. Les curseurs de progression sont désactivés lorsque cette progression est décochée ; une vitesse cible inférieure au départ est refusée. Les paramètres de calcul se verrouillent pendant un lancement/calcul et s'appliquent au prochain lancement.

### Correction trouvée

`EvolutionKart` changeait `normal.speed`, mais héritait temporairement de `maxSpeed = 4.8` jusqu'au premier appel de `limits()` dans la simulation. Le constructeur réutilise maintenant `this.limits(0)` immédiatement après avoir affecté la vitesse choisie. Aucun déplacement ni calcul de force supplémentaire ; le contrat physique du premier tick reste identique. Les tests vérifient les limites 1,2 / 4,6 / 8 avant le premier tick et après 30 ticks, les forces bornées et l'absence de déplacement lors du calcul du steering.

## Héritage : 20 classes sur 20

Le test inventorie tous les fichiers de `kart/entities`, exige une seule classe par fichier, vérifie les prototypes et leur présence unique dans l'entrée navigateur. Dans le vrai navigateur, 485 instances couvrant les 20 types ont été créées/inspectées : arène, équipes, ville avec ponts et tunnels, objets et projectiles. Toutes sont des instances de Vehicle et leurs position, vitesse et accélération sont des p5.Vector.

| Parent direct | Entités |
| --- | --- |
| Vehicle | Kart, Projectile, Mine, WeaponCrate, ArenaObstacle, ObjectiveMarker, Core, TeamBase, TrackSegment, TrackRail |
| Kart → Vehicle | PlayerKart, BotKart, EvolutionKart |
| Projectile → Vehicle | Rocket, Bullet, HomingMissile |
| ArenaObstacle → Vehicle | ArenaBoundary, TrackSupport, CityBuilding, StreetFixture |

Les services UI, caméra, audio, diagnostics et géométries/effets non interactifs restent des services ou du rendu. Ils ne représentent pas des entités physiques indépendantes à faire hériter de Vehicle.

## Validation et fichiers

- Modifié : `kart/entities/EvolutionKart.js` (initialisation de la limite), `architecture.md` (diagramme complet et audit).
- Créés : `tests/kart-controls-audit.test.mjs` et ce rapport.
- `node --test tests/*.test.mjs` : **286 réussis**, aucun échec, dont cinq nouveaux tests d'audit.
- `./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'` : **26 réussis** ; fixtures temporaires strictement bornées.
- `python -m unittest discover -s tests -p test_kart_build.py` : **3 réussis**.
- `python kart/build-frontend.py` : build **b3dfb990f5f1**, identité servie vérifiée dans le navigateur.

Les requêtes de lancement du navigateur ont été capturées avec un service simulé dans un contexte isolé, sans appel réel à `/api/start`. La suite Python existante vérifie séparément les règles du moteur, CUDA et les exports avec ses fixtures bornées. Aucun entraînement utilisateur lancé, aucune sauvegarde utilisateur modifiée. Aucun avertissement/erreur console après rechargement du build corrigé.

`vehicle.js` inchangé : SHA-256 `A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`.
