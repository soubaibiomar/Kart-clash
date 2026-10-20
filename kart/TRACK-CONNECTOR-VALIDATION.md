# Raccord courbe de circuit — 20 octobre 2026

Dans Circuits, la commande **Préparer le raccord** relie la fin d'une route ouverte à son départ. Le curseur **Amplitude** modifie réellement la courbe proposée. L'aperçu bleu indique sa largeur et son passage entre les bâtiments. **Ajouter le raccord courbe** ferme la boucle en conservant les directions d'entrée et de sortie. Annuler et Rétablir restaurent le tracé complet.

Les altitudes sont raccordées progressivement ; les portions élevées deviennent des ponts. Le validateur commun contrôle les pentes (50 %), les croisements (120 unités de dégagement vertical), le terrain et les 240 points maximum. Le raccord refuse aussi les virages dont le rayon local est inférieur à la demi-largeur + 25. Il ne recherche pas automatiquement un passage parmi toutes les routes possibles : si la proposition est refusée, régler son amplitude ou déplacer les extrémités. Les outils existants de pont, tunnel, rampe et fermeture directe restent disponibles.

L'aperçu réserve les mêmes parcelles que le circuit ajouté ; aucun bâtiment ne doit occuper sa projection. Sur grand écran, la vue reste visible pendant le défilement des outils. Les brouillons, circuits enregistrés et modèles existants ne sont pas migrés.

## Fichiers

- Créés : `kart/track-connector.js`, `tests/kart-track-connector.test.mjs`, ce rapport.
- Modifiés : `kart/track-editor.js` (commandes, aperçu et historique), `kart/track-builder-view.js`, `kart/construction-view.js` (ville proposée et dernier segment fermé), `kart/game.css` (panneau et vue persistante), `kart/academy/test_tracks.py` (parité du validateur), `agent.md`, `architecture.md`.
- Frontend reconstruit par `python kart/build-frontend.py` : **b4d14928a3fb**.
- `vehicle.js` inchangé : SHA-256 `A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`.

TrackConnector et les meshes d'aperçu sont des services d'édition/rendu. Les entités physiques existantes conservent leur héritage Vehicle et une intégration p5.Vector par tick. La courbe n'est jamais une trajectoire animée de voiture.

## Tests

- `node --test tests/*.test.mjs` : **316 réussis**, dont sept tests du raccord : tangentes, hauteurs, absence de mutation, limites, aperçu, effets du curseur, historique et parcours déterministe avec forces bornées.
- `./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'` : **29 réussis**. Le nouveau test vérifie le même circuit plat/élevé dans le validateur Python sans lancer d'apprentissage.
- `python -m unittest discover -s tests -p test_kart_build.py` : **3 réussis**.

Total : **348 tests réussis**. Les fixtures d'apprentissage existantes restent temporaires et bornées ; aucun entraînement utilisateur démarré.

Navigateur isolé avec vrais p5.js/Three.js : aperçu de 955 unités et 30 nouveaux points, modification de l'amplitude, rejet à faible amplitude sans mutation, ajout, annulation/rétablissement, sauvegarde et transmission du circuit fermé de 34 points à l'écran Académie. Le lancement d'une conduite manuelle conserve exactement cette géométrie ; l'entrée flèche haut déplace le kart d'environ 142 unités pendant le contrôle. À 375 px, panneau, curseur et bouton restent dans l'écran sans débordement horizontal. Aucun avertissement/erreur console. Le service d'entraînement reste au repos.
