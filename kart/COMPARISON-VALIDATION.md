# Comparaison 3D des réseaux — 20 octobre 2026

Dans **Académie IA → Comparer deux modèles**, sélectionner deux champions génétiques enregistrés, le champion courant/précédent de la session, ou importer leurs JSON. La comparaison accepte des topologies différentes et affiche leur nombre de neurones. Elle exige la même géométrie de circuit, largeur, hauteur et version.

Le curseur de plafond commun est limité par le plus lent des deux profils. Budget, délai sans balise et graine sont communs. Au clic sur Comparer en 3D, deux réseaux figés roulent dans des essais indépendants, avec la physique Vehicle existante. Les conditions effectivement lancées restent affichées même si les prochains réglages changent après la fin.

Les vues sont côte à côte sur grand écran et empilées sur écran étroit. Pause/reprise, arrêt manuel, caméra circuit/poursuite et export des mesures JSON sont disponibles. Les statistiques indiquent temps simulé, balises, état, vitesse mesurée, moyenne et pointe. Un écart B − A est annoncé uniquement pour deux arrivées ; sinon, les causes d'arrêt restent visibles. Un essai isolé ne prouve pas une amélioration générale.

## Sources et limites

Les réseaux précédents sont des instantanés de révisions réellement reçues ; un seul précédent est conservé en mémoire, pas un historique permanent. Les imports restent en mémoire et ne remplacent aucune sauvegarde. Un modèle de combat ou d'un autre circuit est refusé. La comparaison couvre l'Académie génétique border-rays-v1 ; l'ancien atelier reste séparé.

L'inférence de comparaison et la physique sont locales sur CPU, explicitement identifiées. Le GPU continue d'être utilisé par le service d'apprentissage existant lorsqu'un utilisateur lance un calcul. La comparaison ne démarre aucun entraînement. Si le service est occupé, elle se suspend jusqu'à une reprise manuelle. Les vues interpolent les relevés réels ; elles ne pilotent aucun kart. Les états d'échec demeurent affichés et les voitures peuvent rester visibles à leur dernière position mesurée.

## Fichiers

- Créés : `kart/evolution-comparison.js`, `kart/comparison-panel.js`, `tests/kart-comparison.test.mjs`, ce rapport.
- Modifiés : `kart/evolution-ui.js` (accès, sources et révision précédente), `kart/evolution-view.js` (dessin hors écran et affichage des arrêts), `kart/game.css`, `agent.md`, `architecture.md`.
- Frontend reconstruit : `python kart/build-frontend.py`, build **f0fefa4ba638**.
- Aucun fichier d'entité ni modèle utilisateur modifié. Les 20 types d'entités physiques conservent leur héritage Vehicle. `vehicle.js` inchangé : SHA-256 `A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`.

## Validation

- `node --test tests/*.test.mjs` : **332 réussis**, dont huit tests du comparateur : conditions communes, héritage/intégration/forces, incompatibilités, chronos déterministes, échecs/arrêt, pause/reprise, snapshots de révisions et imports bornés.
- `./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'` : **29 réussis** ; fixtures existantes temporaires et bornées.
- `python -m unittest discover -s tests -p test_kart_build.py` : **3 réussis**.

Total : **364 tests réussis**. Aucun entraînement utilisateur ni écrasement de modèle.

Navigateur isolé, vrais p5.js/Three.js : imports de deux réseaux constants synthétiques explicitement nommés non entraînés ; refus d'une largeur différente avant création des vues ; deux vues 3D avec positions réellement simulées. Pause vérifiée à tick 0 sur les deux essais, verrou des réglages, suspension simulée du panneau pendant l'occupation du service sans lancer de calcul, puis reprise. Rapport exporté inspecté en mémoire sans fichier utilisateur créé ; absence de chrono inventé lors d'un essai inachevé. Sur la fixture terminée, le rapport et l'interface conservent les conditions communes (144 px/s, 2400 ticks, 30 s sans balise, graine 2026). Les formulaires et vues tiennent dans 375 px sans débordement horizontal. Aucun avertissement/erreur console après rechargement complet.

Le serveur d'affichage local a été relancé sur 8870 avec une file de connexions de 128 et HTTP/1.1 après des refus intermittents de ressources pendant les validations. Le service optionnel 8871 a été relancé au repos ; aucun calcul utilisateur démarré. Les autres onglets et stockages utilisateur n'ont pas été modifiés.
