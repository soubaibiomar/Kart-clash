# Quartiers urbains — validation du 19 octobre 2026

## Résultat livré

Travail limité à `C:\SteeringBehaviours\5-3-PathFollowingComplex`. L’éditeur propose trois parcours urbains éditables : Centre-ville (60 points), Les docks (75 points) et Métropole (60 points, viaduc et tunnel). Les virages utilisent des arcs circulaires tangents. Les nouvelles données restent au format kart-track-v2 ; les sauvegardes et anciens modèles ne sont pas réécrits.

Les routes v2 partagent un habillage urbain dans l’éditeur, la conduite et l’entraînement : asphalte texturé, passages piétons, marquages, trottoirs continus, immeubles de styles/hauteurs variés, fenêtres, vitrines, toitures techniques, lampadaires et arbres. La case Décor urbain permet de désencombrer l’éditeur sans changer le tracé physique. Le chargement d’un quartier est annulable/rétablissable.

## Bugs constatés et corrigés

1. **Pente et tunnel absents de la vue de population.** Les instantanés transmettent désormais surfaceIndex et slopeVector. Les objets d’affichage reçoivent ces données pour l’inclinaison du kart et le comportement de caméra en tunnel, sans intégration physique supplémentaire.
2. **Un ancien résultat remplaçait l’aperçu choisi dans le formulaire.** L’état de préparation suspend cette reprise automatique. Flux du calcul réactive explicitement son suivi.
3. **Un nouveau lancement réutilisait brièvement les anciennes poses.** L’aperçu et la clé d’interpolation sont réinitialisés au démarrage réussi. Un aperçu invalide ne détruit plus le monde affiché.
4. **Le décor arrière influençait le côté d’évitement du pilote de référence.** RoadAvoid considère le danger avant le plus proche, tourne à l’opposé du rayon touché et ignore les rayons arrière dans son choix. Force toujours bornée ; le mode neuronal conserve son propre pilotage sans secours scripté.
5. **Virages serrés et raccords du nouvel habillage.** Les arcs ont un rayon adapté ; trottoirs et tunnels suivent les offsets partagés. Les faces des trottoirs pointent vers le haut, les bandes de route possèdent des UV, et les toitures de tunnel sont des volumes fermés continus plutôt que des boîtes chevauchées.
6. **Durée de vie du nouveau rendu instancié.** Les buffers des InstancedMesh sont libérés aux reconstructions et les textures avec leurs matériaux. Les reconstructions répétées ne font pas croître le nombre de géométries observé.

## Fichiers créés

- `kart/city-tracks.js` : catalogue de tracés v2 à arcs circulaires.
- `kart/city-layout.js` : parcelles et accessoires déterministes, avec marge routière.
- `kart/entities/CityBuilding.js`, `kart/entities/StreetFixture.js` : entités physiques héritant de ArenaObstacle puis Vehicle.
- `kart/city-art.js` : matériaux Standard rugueux, texture d’asphalte procédurale et rendu instancié.
- `tests/kart-city.test.mjs` : 11 tests ciblés de géométrie, force, rendu et flux d’interface.
- `kart/urban-editor.png`, `kart/urban-road.png` : captures réelles du navigateur.
- Ce rapport.

## Fichiers modifiés

- `index.html`, `kart/node-world.cjs` : chargement des nouveaux services/classes dans le navigateur et le moteur partagé.
- `kart/track-arena.js` : instanciation des bâtiments et accessoires, colliders et filtrage vertical.
- `kart/track-editor.js`, `kart/game.css` : bibliothèque des quartiers, descriptions, historique et visibilité du décor.
- `kart/track-geometry.js`, `kart/arcade-art.js`, `kart/track-builder-view.js`, `kart/renderer.js` : surfaces, volumes de tunnel, quartier et balises discrètes sur les tracés denses.
- `kart/behaviors.js` : évitement avant du pilote de référence, indépendant des réseaux.
- `kart/evolution-population.js`, `kart/evolution-view.js`, `kart/evolution-ui.js` : pente/tablier, aperçu atomique, nouveau lancement et protection du circuit préparé.
- `tests/kart-ux-regressions.test.mjs` : audit complet de 20 fichiers d’entités.
- `kart/academy/test_tracks.py` : parité des presets JS/Python et petite fixture CUDA urbaine temporaire.
- `README.md`, `agent.md`, `architecture.md` : documentation actualisée.
- Fichiers publics reconstruits sous `dist/kart-clash`, build **dcf0e6366b17**.

`vehicle.js` est inchangé : SHA256 `A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`.

## Tests exécutés

Depuis le dossier du projet :

```powershell
node --test tests/*.test.mjs
# 243 réussis, 0 échec, 0 ignoré

./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'
# 26 réussis, incluant CUDA réel et la fixture urbaine temporaire

python -m unittest discover -s tests -p test_kart_build.py
# 3 réussis

python kart/build-frontend.py
# dcf0e6366b17
```

**Total : 272 tests réussis.**

Les trois tracés terminent un tour avec le pilote de référence à plafond 3 unités/tick (180 px/s), dans un budget de 2400 ticks et sans contact. Ce contrôle prouve leur praticabilité à ce réglage ; il ne garantit pas qu’un réseau aléatoire ou entraîné termine le circuit.

Les tests vérifient aussi : entités héritées, parcelles hors de toutes les chaussées, génération reproductible sans consommation du RNG du monde, filtrage des hauteurs, forces bornées et non-mutation, sens d’évitement et insensibilité au décor arrière, rendu instancié sans mutation physique, faces/UV/fermeture du tunnel, parité du format Python et protection de l’aperçu face au polling ancien.

## Parcours réel dans le navigateur

- Chargement du quartier Métropole, annulation vers Centre-ville, rétablissement vers Métropole : noms/choix synchronisés.
- Sauvegarde et passage vers Académie IA : circuit sélectionné et scène 3D identiques.
- Choix d’un autre parcours dans l’entraînement : aperçu conservé après polling.
- Conduite : déplacement mesuré au clavier, p5.Vector réel, descendant de Vehicle, altitude finie et limite de force respectée.
- D active le debug ; pause fige l’horloge et reprise fonctionne.
- Six reconstructions de l’éditeur : même nombre de géométries observé avant/après sur le même tracé.
- Fenêtre de 600 px : aucun débordement horizontal.
- Dernier chargement et conduite : zéro erreur ou avertissement console. Le service local optionnel a été relancé sans apprentissage automatique ; les diagnostics du calcul terminé existant sont conservés.
- Les essais de sauvegarde ont utilisé un contexte de navigateur isolé. Aucun modèle ni tracé utilisateur existant n’a été écrasé. La fixture CUDA urbaine s’exécute dans un dossier temporaire nettoyé.

## Limites

Le quartier est une 3D stylisée plus détaillée, avec une physique de kart arcade. Il n’inclut pas de circulation civile, piétons, code de la route, sauts ou chute libre. Les anciens circuits v1 gardent leur rendu historique. Le décor v2 est déterministe et procédural ; aucune édition individuelle des bâtiments n’est ajoutée. Les bâtiments et accessoires physiques héritent de Vehicle ; le fond, les façades décoratives, les marquages et les contrôles restent du rendu ou de l’interface. Les réseaux, leur apprentissage CUDA et leurs formats restent séparés des pilotes de référence.
