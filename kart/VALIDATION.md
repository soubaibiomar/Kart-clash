# Validation — 17 octobre 2026

## Tests automatisés exécutés

Depuis `C:/SteeringBehaviours/5-3-PathFollowingComplex` :

```powershell
node --test tests/*.test.mjs
# 162 tests, 162 réussis, aucun échec ni test ignoré.
& .\gp\training\.venv\Scripts\python.exe -m unittest discover -s kart/academy -p test_academy.py -v
# 6 tests, 6 réussis, aucun test CUDA ignoré.
```

Les suites historiques restent actives. Deux références d’entrée des tests F1 pointent maintenant vers `apex-lab.html` ; leurs exigences de rendu et de séparation des écrans sont conservées. Aucun test de conduite n’est supprimé pour masquer une régression.

Les tests nouveaux couvrent héritage, intégration héritée unique, forces bornées, freinage/marche arrière, restauration du turbo, temps/pause/rattrapage, perception, A*, contacts, balayage des tirs, durée de vie, protection/bouclier, munitions, armement, attribution unique, réapparition, classement, reset, décisions des bots, fin réelle de match, sept défis, topologies, validation/stockage, allocations GPU partagées et voix audio bornées.

CUDA a été réellement utilisé sur la RTX 4060 Laptop. Les tests comparent les sorties CUDA et JavaScript pour tanh/ReLU à 1e−5 et exécutent une fixture jetable d’un pas d’imitation, une génération de quatre candidats et 120 ticks par rollout, avec arrêt prédemandé séparé. Ces fichiers sont temporaires et supprimés automatiquement. Le contrat HTTP Start/Stop utilise un worker simulé. Aucun calcul utilisateur ou ancien modèle n’est lancé, chargé pour du combat ou écrasé.

## Navigateur réel et paquet statique

Vrai p5.js fourni et Three.js local chargés dans Chrome. GPU de rendu constaté : Intel UHD via ANGLE, distinct du GPU CUDA d’apprentissage. Aucun engagement de fréquence d’images sur cette machine de contrôle. Qualité réglable ; mode automatique sans ombres dynamiques sur Intel.

Vérifications réalisées :

- Menu, préparation et départ avec huit karts ; pilotage par événements clavier, freinage et pause/reprise sans dérive de temps.
- Fixture de combat explicitement contrôlée : ramassage puis utilisation des six objets, munitions, turbo, bouclier, élimination, mort du joueur et réapparition protégée.
- Manche de 180 secondes entièrement intégrée avec le vrai p5.js (pas accélérés pour le contrôle) : fin et classement de trois bots ayant obtenu des éliminations. Ce contrôle n’est pas présenté comme trois minutes de pilotage humain.
- Collision avec la couverture sans traversée, caméra réinitialisée, rendu ne modifiant pas les positions/vitesses de simulation.
- Résultats et replay, scores et projectiles remis à zéro.
- Ouverture et démarrage des sept défis avec leurs instructions, populations et états finis ; succès/échec des objectifs couverts de façon déterministe dans les tests unitaires. Aucun contrôle ne prétend qu’un humain a terminé chacun des sept parcours.
- Garage/couleurs, réglages, aide et Académie ; topologie 28→12→8→4→3, 55 neurones et 503 paramètres, sauvegarde d’un cerveau non entraîné, sélection de vrais contrôleurs neuronaux en manche. Le cerveau de contrôle et les records synthétiques ont été retirés après contrôle.
- Académie connectée au vrai service et GPU identifié, statut idle sans apprentissage automatique. Contrôle isolé du rechargement de deux révisions sous la même identité d’export, sans lancement de job.
- Menus à 500 px et 1366/1440 px, pas de débordement horizontal ; focus visible, modales et réduction de mouvement présents. Le clavier reste nécessaire pour jouer.
- Frontend construit par la liste publique : `dist/kart-clash`. Démarrage réel depuis ce paquet, aucun chargement de modèle F1. Un premier chargement a rencontré des ressources HTTP locales manquantes ; l’état d’erreur a été constaté et le rechargement complet a réussi. Console finale : aucune erreur.

## Provenance et intégrité

Deux skills lus et appliqués : Impeccable (contexte, interface et détecteur : aucun signal) et Expert 3D Modeler (géométrie procédurale, silhouette et ressources). Documentation Three.js consultée via Context7 ; site de référence ouvert au navigateur, aucun média extrait. Aucun plugin installé et aucune publication.

Le fichier fourni `vehicle.js` garde le SHA-256 `A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`. Aucun fichier `vehicle.js` n’a été modifié dans cette intervention. Les modèles `gp/models` et les autres exemples restent intacts.

## Limites restantes

Une arène au sol, collisions arcade cercles/rectangles, pas de sauts ni de multijoueur. Pas de cerveau combat préentraîné livré ou de qualité garantie après un petit budget. Évaluation CPU partagée, apprentissage CUDA ; horizons d’évaluation plus courts qu’une manche. Preview de population diagnostique 2D statique, sélectionnable par candidat, sans population 3D animée. Pas de reconnaissance vocale ou de radio F1 dans le jeu actif.

## Revalidation du 17 octobre 2026

Nouvelle exécution : suite existante `node --test tests/*.test.mjs`, 162 réussites ; suite Python Academy, 6 réussites. Aucun entraînement utilisateur lancé. Le contrôle navigateur a révélé des réponses HTTP vides provenant du serveur local précédent : serveur relancé avec journaux redirigés, puis chargement réussi.

Correction : garde de démarrage dans `index.html`, également copiée au frontend `dist/kart-clash/index.html`. Une erreur de chargement de script ou feuille de style donne maintenant une explication et un bouton de rechargement, même si elle précède la création du DOM. Le mode fichier et un jeu déjà démarré conservent leur affichage. Tests ajoutés : `node --test tests/kart-boot.test.mjs`, 2 réussites. Ces deux tests ont été exécutés après la suite de 162 tests, soit 164 tests JavaScript vérifiés au total en deux commandes.

Vérification navigateur de cette reprise : vrai menu et rendu, démarrage avec le nombre de bots sauvegardé, passage du compte à rebours au jeu, pause avec chronomètre stable, reprise et retour au menu. Aucune erreur ou alerte console après rechargement. Les contrôles plus larges ci-dessus décrivent la validation précédente ; ils n’ont pas tous été rejoués pendant cette reprise. `vehicle.js` conserve son empreinte documentée.

## Livraison cartoon

Voir `kart/REFRESH-VALIDATION.md` pour les nouveaux contrôles, commandes, résultats et limites. La commande D remplace Maj+D, les flèches sont les seules touches de conduite ; l’état courant du build est indiqué dans `dist/kart-clash/build.json`.
