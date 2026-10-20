# Décor urbain et coût du rendu — 20 octobre 2026

Les bâtiments existants reçoivent des parapets de toiture, des grilles de ventilation et des vitrines orientées vers leur rue. Les troncs et poteaux sont cylindriques ; les feuillages sont arrondis. Ces détails habillent les CityBuilding et StreetFixture existants. Ils ne créent ni nouvelle entité physique ni obstacle sur la chaussée. Les 20 classes physiques conservent leur héritage Vehicle.

`road-batching.js` regroupe uniquement les meshes décoratifs explicitement marqués `staticRoad`. Les boîtes utilisent des instances d'un cube commun ; les surfaces utilisent une géométrie fusionnée par matériau et propriétés d'ombre. Les transformations des groupes imbriqués, dimensions, normales et UV sont conservées. Les tabliers physiques, murs et plafonds portant `cameraSolid` restent des meshes distincts pour les rayons de caméra. Les colliders, observations, forces, modèles et règles de conduite ne sont pas modifiés.

Les géométries originales restent sous la responsabilité du renderer, notamment lorsqu'elles sont partagées par son cache. Les nouveaux buffers d'instances et géométries fusionnées rejoignent ses ressources et sont libérés à la reconstruction. Les matériaux partagés survivent à cette reconstruction. Aucun asset externe, éclairage dynamique supplémentaire ou tirage dans le RNG du monde.

## Mesure dans le navigateur

Même contexte isolé, même preset **Métropole · viaduc et tunnel**, 60 points, cadrage initial de l'éditeur et qualité automatique :

| Compteur Three.js | Avant | Après |
| --- | ---: | ---: |
| Appels de dessin | 836 | 167 |
| Géométries chargées par le renderer | 836 | 162 |
| Triangles rendus | 152 412 | 165 816 |
| Textures | 7 | 7 |

Les 679 éléments décoratifs routiers sont regroupés en neuf appels. Les bâtiments et accessoires utilisent 22 groupes instanciés. La réduction mesurée des appels de dessin est d'environ **80 %**. Les triangles augmentent d'environ **9 %**, avec les nouveaux détails et un découpage de visibilité plus large des groupes. Il ne s'agit pas d'une mesure comparative de FPS ni d'une garantie de performance sur tout matériel. Les coques de caméra restent volontairement séparées.

## Fichiers

- Créés : `kart/road-batching.js`, `tests/kart-urban-rendering.test.mjs`, ce rapport.
- Modifiés : `kart/track-geometry.js`, `kart/city-art.js`, `agent.md`, `architecture.md`.
- Frontend reconstruit : `python kart/build-frontend.py`, build **8c4a4293c7e7**.
- `vehicle.js` inchangé : SHA-256 `A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`.

## Validation

- `node --test tests/*.test.mjs` : **338 réussis**, dont six nouveaux tests des transformations imbriquées et pentes, normales/UV fusionnés, exclusions et idempotence, libération des ressources, primitives urbaines et intégration Métropole sans mutation physique.
- `./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'` : **29 réussis**, fixtures temporaires bornées.
- `python -m unittest discover -s tests -p test_kart_build.py` : **3 réussis**.

Total : **370 tests réussis**. Aucun entraînement utilisateur lancé ni modèle/sauvegarde réécrit.

Navigateur isolé avec les vrais p5.js et Three.js : chargement du preset, vue générale puis Dans la rue, inspection des façades/végétation, lancement de Conduire en 3D, accélération au clavier avec déplacement réel et vitesse finie, changement de caméra C, pause. Les 75 meshes de dégagement restent présents dans le jeu. Un diagnostic de caméra sur le vrai tunnel et ses volumes conserve une hauteur de 50,29 sous son plafond de 94, sans avancer la simulation. Aucun avertissement ou erreur console. Les autres onglets et le stockage utilisateur ne sont pas modifiés.
