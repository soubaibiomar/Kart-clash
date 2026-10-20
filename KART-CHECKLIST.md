# Kart Clash implementation

Plan: build the shared Vehicle simulation and combat loop first; add the rendered arena and menus; connect seven playable behavior challenges; implement a separate combat schema, configurable inference and local Academy; validate deterministic rules and real browser gameplay; document limits.

- [x] Main loop: setup, countdown, 180 seconds, combat, safe respawn, standings, replay
- [x] Vehicle inheritance, bounded forces, fixed ticks, separate contacts
- [x] Six items, ownership, lifetimes, swept collisions, pause/restart cleanup
- [x] Scripted bots, navigation, perception, independent observable behaviors
- [x] Seven challenges with objectives, success/failure, records
- [x] Original 3D karts/arena, chase camera, readable responsive UI and audio
- [x] Configurable combat networks, real local training, validation, inspection, save/load
- [x] Deterministic tests, legacy suites, browser playthrough, documentation

Preserve: protected vehicle.js, gp/models, every laboratory and unrelated modification. Old race entry copied to apex-lab.html before replacing the main entry.

Résultats : 162 tests JavaScript et 6 tests Academy réussis. Vérifications et limites détaillées dans kart/VALIDATION.md. Le frontend public est construit dans dist/kart-clash, sans publication externe.

## Refonte jouet cartoon — plan et suivi

- [x] Conserver la simulation et les modèles, supprimer le conflit D/direction.
- [x] Cache de perception/forces, inspection sélectionnable, couches et projection sur segment ; éliminer le double évitement.
- [x] Lobby visuel, trois personnages, carrosserie arrondie, repère central, HUD et retour directionnel des dégâts.
- [x] Conduite/freinage révisés, caméra anti-obstruction et cadrage corrigé après inspection visuelle.
- [x] Comparaison Academy à graines identiques avec un bot de référence, trois scénarios réels.
- [x] Reconstruction répétable, chemins vérifiés, identifiant de build, préservation des fichiers non gérés.
- [x] Dernière validation navigateur et documentation de livraison : kart/REFRESH-VALIDATION.md (limites de captures explicites).
