# Lecture géométrique du tracé — 20 octobre 2026

Le panneau **Lire le tracé** affiche la longueur réelle en 3D, l'intervalle d'altitude, la pente maximale et la longueur sous tunnel. Dans l'éditeur, **Voir en 3D** sélectionne le point concerné et cadre sa position exacte dans la vue. Le point utilise sa poignée existante ; aucune entité ni trajectoire de pilotage n'est ajoutée.

L'Académie affiche le même panneau en lecture seule. Il suit l'aperçu choisi, le champion testé ou le flux explicitement repris. Changer de circuit actualise les mesures. La préparation, les contrôles des réseaux, les observations, les modèles et l'apprentissage restent indépendants de cette analyse.

## Mesures et repères

- Longueurs : somme des segments avec leurs variations d'altitude, y compris le retour au départ d'une boucle. Le type de portion appartient au point de départ du segment, comme dans les règles et le rendu existants.
- Changements de direction : angles horizontaux d'au moins 5° aux points intérieurs, ou à tous les points d'une boucle. Ce nombre décrit les points du tracé, pas un regroupement en virages de circuit officiel.
- Rayon local : rayon du cercle passant par les trois points voisins ; il dépend de l'échantillonnage du tracé et n'est pas une trajectoire à suivre.
- Points à examiner : angle d'au moins 60°, rayon local inférieur ou égal à la demi-largeur + 25 px, ou pente d'au moins 35 %. Les seuils sont inclusifs. Les pentes supérieures à la limite de validation de 50 % restent refusées par KartTrack.

Ces repères sont des heuristiques de conception, pas des prédictions de collision ou des vitesses conseillées. Un angle brusque est signalé même si ses segments voisins sont longs. Le nombre de points à examiner est dédupliqué par indice. Jusqu'à six repères sont affichés, espacés d'au moins une largeur de route en distance 3D pour éviter une liste concentrée sur la même petite zone. Les autres points restent modifiables normalement dans l'éditeur.

Les brouillons incomplets affichent une invitation à ajouter des points. Les tracés invalides n'affichent pas de mesures présentées comme valides. Les anciennes boucles v1 avec dernier point répété ne produisent pas de diagnostics non finis. Le panneau garde son exploration dépliée pendant une mise à jour de ses données ; une reconstruction complète de l'éditeur peut la replier.

## Frontières et fichiers

`track-review.js` est un service pur, utilisant la validation de KartTrack. Il ne consomme aucun RNG ni force. `TrackReviewView` est du DOM ; `constructionPointFrame` et `TrackBuilderView.focusPoint` sont des services de caméra. Le cadrage tient compte des façades avec le contrôle existant de distance. Il sait viser le dernier point d'une boucle, y compris le segment qui revient au départ. Aucune locomotion ou entité physique ne change ; les 21 classes héritant de Vehicle restent intactes.

- Créés : `kart/track-review.js`, `kart/track-review-view.js`, `tests/kart-track-review.test.mjs`, ce rapport.
- Modifiés : `kart/track-editor.js`, `kart/evolution-ui.js`, `kart/construction-view.js`, `kart/track-builder-view.js`, `kart/game.css`, `agent.md`, `architecture.md`.
- Build : `python kart/build-frontend.py` → **4409a0716731**.
- `vehicle.js` inchangé : SHA-256 `A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`.

## Tests et navigateur

- `node --test tests/*.test.mjs` : **371 réussis**, dont huit nouveaux tests : longueurs/pentes/tunnels sans mutation, angles/rayons/seuils inclusifs, fermeture de boucle, brouillons/anciens formats, repères bornés et espacés, rendu de conseils distinct de l'apprentissage, cadrage exact sans update physique, cache et état déplié du panneau.
- `./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'` : **29 réussis**, fixtures temporaires bornées.
- `python -m unittest discover -s tests -p test_kart_build.py` : **3 réussis**.
- Après le dernier ajustement de texte : `node --test tests/kart-track-review.test.mjs` : **8 réussis**.

Total de la suite complète : **403 tests réussis**. Aucun entraînement utilisateur démarré, aucun modèle réécrit.

Navigateur isolé, vrais p5.js et Three.js : brouillon vide puis carré fermé de quatre points avec altitudes `[0,80,80,0]` et tunnel. Mesures : longueur **2 410,62 px**, pente **13,33 %**, tunnel **600 px**, quatre angles de 90° signalés. Le bouton du dernier virage sélectionne l'indice 3 et place la cible de caméra à **[300,18,900]**, sans changer le tracé, les positions/vitesses du monde, le tick ou le RNG. Modifier la largeur conserve l'exploration ouverte ; Annuler rétablit 160 et les mesures correspondantes.

À 375 × 812, les quatre mesures et les boutons restent lisibles, sans débordement horizontal ; le panneau se place sous la navigation. Entraîner sur ce circuit ouvre la préparation avec les mêmes mesures et aucun bouton de cadrage physique dans ce panneau en lecture seule. Choisir la boucle au sol actualise la longueur et fait passer la longueur sous tunnel de 600 à 0. L'instrumentation de l'onglet ne relève aucun POST pendant cette préparation. Aucun avertissement ou erreur console. Les autres onglets et stockages utilisateur restent intacts.
