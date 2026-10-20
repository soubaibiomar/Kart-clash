# Fantôme du meilleur passage — 20 octobre 2026

Dans **Circuits → Conduire en 3D**, un nouveau record complet conserve aussi une relecture locale. Au prochain départ sur la même géométrie et avec le même profil/limites, un kart translucide reproduit ce passage. Le bouton **Fantôme du record** du chronomètre permet de le masquer ou de le réactiver pendant cette session.

Le fantôme représente des positions réellement relevées, pas un nouveau pilote : aucun réseau, objectif ou steering n'est déduit de cette trace. L'interpolation est réservée à la présentation. Il n'intervient dans aucune collision, perception, mini-carte d'adversaires ou commande d'entraînement. Les essais neuronaux ne le chargent ni ne créent de record personnel.

## Données et compatibilité

`TrackGhostRecording` relève position, altitude, cap et pente au plus toutes les 100 ms simulées, puis conserve la pose exacte d'arrivée. Il n'enregistre aucune observation de réseau ni commande clavier et ne produit pas de démonstration d'entraînement. La capture s'arrête avec les règles existantes du parcours. Elle est bornée à 1 802 poses et 180 secondes. Les données non finies, désordonnées, incomplètes, hors bornes ou trop volumineuses sont refusées.

La clé `kart-clash-track-ghosts` conserve au maximum trois relectures. Les 24 records de temps restent dans leur stockage séparé. Une relecture n'est acceptée que si sa géométrie/profil/limites et son temps final correspondent exactement au record chargé. Les anciens records sans trace restent valables ; un nouveau meilleur temps permet de créer leur fantôme. Le record de référence est figé pendant le passage courant. Un stockage de relecture indisponible n'annule pas le record de temps sauvegardé ; les résultats signalent alors que la relecture n'a pas été conservée.

## Héritage et rendu

`GhostKart extends Kart extends Vehicle`, dans son propre fichier, est la **21e classe d'entité** de l'inventaire. Les 20 types interactifs existants restent inchangés. Cette instance est un objet de présentation de relevés, comme les poses affichées des populations ; elle n'entre jamais dans KartWorld.karts, les colliders ou la locomotion. `present()` applique uniquement la pose enregistrée de cette instance d'affichage. Aucun déplacement autonome par trajectoire scriptée n'est introduit dans les véhicules simulés.

`track-ghost-view.js` utilise le modèle simplifié commun et un matériau translucide dédié, sans ombre et avec test de profondeur actif. Les façades et tunnels restent opaques. Le fantôme se masque à moins de 45 unités du joueur pour dégager la vue, pendant le compte à rebours et après la fin de sa relecture. Pause et reprise suivent exclusivement l'horloge du monde. Les changements de monde et la fermeture libèrent son matériau, sans détruire les géométries partagées. Les poses et angles sont interpolés entre échantillons ; la relecture n'est pas une seconde simulation ni un résultat neuronal.

## Fichiers

- Créés : `kart/track-ghost.js`, `kart/entities/GhostKart.js`, `kart/track-ghost-view.js`, `tests/kart-track-ghost.test.mjs`, ce rapport.
- Modifiés : `kart/track-timing.js`, `kart/track-trial.js`, `kart/track-timing-view.js`, `kart/renderer.js`, `kart/app.js`, `kart/game.css`, `kart/node-world.cjs`, `index.html`, les deux tests d'inventaire `kart-controls-audit.test.mjs` et `kart-ux-regressions.test.mjs`, `agent.md`, `architecture.md`.
- Build : `python kart/build-frontend.py` → **bd04d2ddac3d**.
- `vehicle.js` inchangé : SHA-256 `A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`.

## Validation

- `node --test tests/*.test.mjs` : **354 réussis**, dont huit nouveaux tests : capture bornée et arrivée, validation des relectures, interpolation des angles/hauteurs, héritage et absence d'intégration, correspondance au record et panne de stockage, historique limité, visibilité/occlusion/ressources, simulation et pose finale identiques.
- `./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'` : **29 réussis**, fixtures temporaires bornées.
- `python -m unittest discover -s tests -p test_kart_build.py` : **3 réussis**.
- Après précision du message d'échec de relecture : `node --test tests/kart-track-ghost.test.mjs tests/kart-track-timing.test.mjs` : **16 réussis**, y compris seuil inclusif de 45 unités et message de stockage.

Total de la suite complète : **386 tests réussis**. Aucun entraînement utilisateur lancé, aucune sauvegarde de modèle réécrite.

Navigateur isolé, vrais p5.js/Three.js : fixture ouverte parcourue par maintien de la touche d'accélération, arrivée vers 2,09 s, 22 poses conservées avec première pose au départ et dernière à l'arrivée réelle. Redémarrage : fantôme visible devant le joueur et absent de la population physique. Pause vérifiée à temps et position constants ; pour inspecter le rendu figé, le voile de pause a temporairement été masqué dans le seul contexte de test. Le bouton réel masque/réactive la relecture et synchronise aria-pressed. À 375 × 812, panneau et bouton restent dans l'écran et sous le bandeau de progression. Rechargement complet : référence et 22 poses restaurées. Un réseau synthétique non entraîné utilise ensuite son propre contrôleur, sans fantôme ni modification du nombre de relectures. Aucun avertissement ou erreur console. Les onglets et stockages utilisateur restent intacts.
