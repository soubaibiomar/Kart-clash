# Analyse de l’exemple 9 et transfert vers la F1

Le dossier `9-VoitureSuitCircuit genetic algo` est une démonstration d’apprentissage évolutif, distincte du simulateur F1 dans `5-3-PathFollowingComplex`. Aucun de ses fichiers n’est modifié.

| Fichier | Fonction et observations |
|---|---|
| `index.html` | Charge p5.js 0.8 et TensorFlow.js 1.1 depuis des CDN. L’exemple dépend donc du réseau. |
| `boundary.js` | Segment avec deux extrémités, dessin et point milieu. |
| `ray.js` | Intersection rayon/segment. Le plus proche impact mesure la distance au mur. Les comparaisons strictes excluent les extrémités et l’origine ; les nouveaux capteurs couvrent explicitement ces cas. |
| `vehicle.js` | Six rayons aux angles −45, −30, −15, 0, 15 et 30 degrés. Distances normalisées, prédiction de deux sorties (angle/vitesse), puis vitesse désirée moins vitesse actuelle et limitation de la force. La voiture meurt à proximité d’un mur ou après expiration de son compteur. Ce fichier fourni reste protégé. |
| `nn.js` | Réseau dense, copie, mutation, prédiction et nettoyage des tenseurs. Le journal de chaque prédiction est très bavard pour 100 voitures. |
| `ga.js` | Sélection proportionnelle à la fitness et mutation des descendants. Le cas d’un tirage exactement nul peut donner un indice négatif ; une fitness exponentielle peut déborder pour de grandes progressions. |
| `sketch.js` | Population de 100 voitures, circuit aléatoire construit à partir de bruit, checkpoints et accélération du calcul. Le circuit est régénéré entre générations, ce qui complique la comparaison d’un apprentissage sur une piste fixe. |

La distance de checkpoint est celle de la droite infinie, pas seulement du segment : une voiture hors du passage peut donc être comptée. La classe ne positionne pas `finished` à la fin d’un tour. La portée réelle du capteur et la normalisation utilisent deux paramètres différents (`this.sight` / `SIGHT`), à harmoniser pour étendre cet exemple.

## Transfert retenu

`gp/sensors.js` reprend le principe géométrique de `Ray.cast`, avec douze directions, portée bornée, impacts inclusifs, détection des voitures, vitesse relative et temps avant rapprochement. Un index spatial des bordures évite de parcourir tout le circuit pour chaque rayon. Les mesures sont renouvelées à intervalles fixes de six ticks, sans consommer d’aléatoire. Le debug lit le dernier relevé.

Les distances frontales limitent la vitesse désirée ; les mesures latérales protègent les changements de voie ; une correction de bordure bornée complète le steering près du bord. Le contrôleur conserve la navigation géométrique et les règles de course. Il n’entraîne pas un nouveau réseau pendant le Grand Prix : les forces restent explicites, composables et testables. Aucun comportement ne déplace directement une voiture.
