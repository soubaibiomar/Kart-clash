# Parcours, édition et préparation de l'entraînement — 20 octobre 2026

Après un parcours, les résultats proposent **Modifier ce circuit** et **Préparer son entraînement**. Les deux commandes transmettent une copie validée de la route réellement parcourue : points, largeur, fermeture, altitudes, ponts et tunnels. Un bandeau conserve le temps actif, les balises, les contacts et le contrôleur utilisé. Ces mesures décrivent ce passage et ne deviennent pas des résultats d'apprentissage.

Dans l'Académie, le choix **Dernier parcours** possède sa propre valeur `@session` ; il ne résout pas un circuit par son nom. Une sauvegarde de même nom, mais de géométrie différente, reste intacte. Le lien **Modifier ce circuit** renvoie le circuit actuellement sélectionné à l'éditeur. **Entraîner sur ce circuit** transmet à son tour la copie éditée à l'Académie. Dans l'application, ni conduire ni préparer l'entraînement ne sauvegarde automatiquement : les boutons Enregistrer restent explicites.

Le bandeau disparaît quand la géométrie, la largeur ou la version du circuit change ; il revient après annulation ou resélection du tracé d'origine. Un simple renommage ne change pas la géométrie du bilan. Un ancien tracé v1 converti en v2 dans l'éditeur ne conserve pas l'affichage de mesures comparables à sa version initiale.

## Transfert et limites

`TrackWorkspaceTransfer` contient un seul transfert en mémoire, destiné à l'éditeur ou à l'Académie. La validation et la copie précèdent le changement d'écran. Le transfert est consommé une fois et abandonné lors d'une navigation vers une autre destination. Aucun circuit, modèle, poids ou préférence n'est écrit par ce service. Une modification reçue ne peut pas muter le résultat ou le circuit d'origine.

Cette copie de session n'est pas une nouvelle sauvegarde permanente. Un rechargement reprend les choix sauvegardés existants ; le bandeau invite à enregistrer le circuit dans l'éditeur pour le conserver. Les records et fantômes existants gardent leur stockage propre.

La préparation de l'Académie conserve désormais son état d'aperçu dès la construction du panneau. Le polling d'un ancien calcul ne remplace pas la route choisie ; Flux du calcul demeure l'action explicite pour reprendre le flux. L'ouverture de l'écran effectue ses lectures de service habituelles, sans démarrer ni arrêter un entraînement. Si un autre calcul occupe le service, ses verrouillages restent applicables.

L'inspecteur de debug est fermé à l'arrivée. D, C et Échap n'activent plus des commandes de conduite au-dessus du dialogue de résultats ; les boutons du dialogue restent utilisables au clavier. Le compte à rebours et la pause gardent leurs commandes.

## Fichiers

- Créés : `kart/track-workspace.js`, `tests/kart-track-workspace.test.mjs`, ce rapport.
- Modifiés : `kart/app.js`, `kart/track-editor.js`, `kart/evolution-ui.js`, `kart/inspection.js`, `kart/game.css`, `agent.md`, `architecture.md`.
- Build : `python kart/build-frontend.py` → **bf3157f6c152**, également vérifié sur le serveur local.
- Aucune entité physique ajoutée ou modifiée ; les 21 classes de l'inventaire conservent leur héritage Vehicle, dont GhostKart réservé à la présentation.
- `vehicle.js` inchangé : SHA-256 `A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`.

## Tests

- `node --test tests/*.test.mjs` : **363 réussis**, dont neuf nouveaux tests des bilans réels, validation, transfert atomique à usage unique, collisions de noms, géométrie détachée en préparation, lancements sans sauvegarde automatique, protection de l'aperçu initial, masquage/échappement du bilan et commandes de fin de session.
- `./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'` : **29 réussis**, fixtures temporaires bornées.
- `python -m unittest discover -s tests -p test_kart_build.py` : **3 réussis**.

Total : **395 tests réussis**. Aucun entraînement utilisateur lancé, aucun modèle réécrit.

## Vérification navigateur

Contexte isolé, vrais p5.js et Three.js. Une route ouverte à quatre points, avec montée de 0 à 80, tunnel à 80 et descente à 0, est conduite par maintien de la touche d'accélération. Dernier passage de validation : **3,133 s, trois balises, zéro contact**. Le debug activé pendant la conduite est fermé automatiquement à l'arrivée et D ne le rouvre pas au-dessus des résultats.

Une sauvegarde homonyme de largeur 320 est conservée comme témoin. Modifier ce circuit ouvre bien la copie de largeur 160, avec altitudes `[0,80,80,0]` et types `bridge,tunnel,bridge,road`. Le bilan correspond aux valeurs du passage. Passer la largeur à 180 masque le bilan ; Annuler restaure son affichage. La sauvegarde témoin reste inchangée.

Le bouton réel Préparer son entraînement ouvre `@session`, avec la même route et un aperçu protégé. Les liens réels Académie → éditeur → Académie conservent ensuite cette copie. Un départ depuis l'éditeur après modification de largeur utilise 180 et préserve toujours le témoin de 320. L'instrumentation des requêtes du seul onglet de test ne relève aucun POST pendant ces navigations ou préparations.

À 375 × 812, les résultats, les deux raccourcis et leurs commandes restent dans l'écran, sans débordement horizontal. Le bandeau d'éditeur/Académie reste sous la navigation mobile (haut à 182 pour une navigation finissant à 150). Sélectionner un autre circuit masque le bilan, puis revenir au Dernier parcours le restaure. Aucun avertissement ou erreur console lors de la validation finale. Les autres onglets et stockages utilisateur ne sont pas modifiés.
