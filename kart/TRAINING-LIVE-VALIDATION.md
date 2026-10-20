# Essai 3D pendant l’apprentissage — 18 octobre 2026

Dans l’Académie, la voiture utilise réellement le réseau courant sur le circuit choisi. Le service publie ses poids dès l’initialisation, pendant l’imitation puis après chaque génération ; l’interface les récupère toutes les deux secondes. Le moteur de jeu conserve p5.Vector, applyForce et la locomotion héritée de Vehicle. Il n’existe aucun remplacement silencieux du réseau par le bot de référence.

La vue du circuit et la caméra qui suit la voiture sont disponibles dans le même écran. Vitesse réelle en px/s, plafond, génération, temps, balises et contacts sont visibles. Pause et Recommencer agissent sur l’essai local uniquement. Quitter la page détruit son renderer et son animation ; masquer l’onglet suspend ses ticks. Aucun calcul utilisateur n’a été lancé pendant la livraison.

## Progression de vitesse

- Départ par défaut : 55 % du plafond historique de 4.8 unités/tick, soit 158.4 px/s à 60 Hz. Objectif réglable : 135 % par défaut, soit 388.8 px/s.
- Deux générations consécutives doivent réussir les **trois** scénarios : un tour terminé, contacts/tick <= 0.035 et immobilité <= 2 s. Un échec remet le compteur de confirmations à zéro.
- Un palier confirmé autorise +0.4 unité/tick (24 px/s) à la génération suivante, borné par l’objectif. Le parent et le bot de référence sont réévalués au nouveau plafond.
- Le modèle exporté conserve le plafond **réellement évalué**, dans `driving: {schema: "track-pace-v1", maxSpeed}`. Les anciens modèles restent à 4.8. La plage du contrat est 1.2–8 ; les observations N+21 et les quatre sorties restent identiques.
- La fitness circuit `track-laptime-v1` conserve progression, tour, contacts et immobilité, et ajoute `25 * max(0, 1 - ticksUtilisés / budgetTicks)` pour un tour terminé. Le temps récompense une conduite plus rapide ; l’augmentation du plafond ne suffit pas à réussir.

Cette vue est une **simulation d’inférence locale indépendante**, pas la reproduction exacte du rollout CPU en cours. Les scores et chronos de validation proviennent des évaluations séparées du worker. Le modèle peut rester lent, échouer ou ne jamais atteindre le plafond cible ; aucune amélioration fictive n’est affichée. Les essais terminés s’arrêtent ; Recommencer permet un nouvel essai. Le calcul des réseaux et mutations utilise CUDA ; les simulations physiques d’évaluation restent sur CPU.

## Fichiers concernés

Créés pour cette modification :

- `kart/training-trial.js` : essai neuronal, échange de poids, pause, télémétrie.
- `kart/training-drive-view.js` : vue 3D et contrôles de l’essai.
- `kart/training-camera.js` : cadrage du circuit sans effet sur la simulation.
- `kart/track-pace.js` : profil physique versionné.
- `kart/academy/pace.py` : progression par confirmations.
- `tests/kart-training-live.test.mjs`, `kart/academy/test_pace.py` : règles et limites.
- Ce rapport et `kart/training-live.png` : preuves de livraison. La capture montre honnêtement le circuit avant un lancement, sans score inventé.

Mis à jour : `index.html`, `kart/node-world.cjs`, `kart/brain.js`, `kart/world.js`, `kart/renderer.js`, `kart/app.js`, `kart/academy-ui.js`, `kart/game.css`, `kart/academy/evaluate.cjs`, `kart/academy/train.py`, `kart/academy/server.py`, `kart/academy/test_academy.py`, `README.md`, `agent.md`, `architecture.md`. Le build public `dist/kart-clash` a été régénéré : **069d1178f01f**.

## Vérifications exécutées

Depuis le dossier de l’exemple :

```powershell
node --test tests/*.test.mjs
# 210 tests réussis, 0 échec, 0 ignoré.
& ./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'
# 18 tests réussis, y compris fixtures CUDA temporaires.
python -m unittest discover -s tests -p test_kart_build.py
# 3 tests réussis.
python kart/build-frontend.py
# Build 069d1178f01f.
```

Les tests couvrent limites de vitesse/force, compatibilité des anciens modèles, rejet des profils invalides, intégration héritée une fois par tick, échange de poids sans téléportation, pause/reprise/redémarrage, mesure reproductible de la vitesse et du temps, récompense d’un tour plus rapide, confirmations et échecs des trois scénarios, bornes inclusives, export CUDA et absence de promotion après un tour échoué. Les fixtures GPU utilisent des dossiers temporaires ; aucun modèle ou circuit utilisateur n’est écrasé.

Navigateur avec vrai p5.js/Three.js : inférence mobile, vitesse mesurée 158.4 px/s pour un plafond de 158.4, pause effective, réception d’une nouvelle révision via le polling sans remise à zéro de position/temps, bascule des deux caméras, création/destruction de la vue lors des changements de page et absence de débordement vérifiées. Aucun message console d’erreur après rechargement final. Le service local répond CUDA=true, RTX 4060 Laptop GPU, adaptivePace=true, trainingView=true, phase=idle.

`vehicle.js` est resté inchangé : SHA-256 `A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`.
