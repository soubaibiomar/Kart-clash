# Vérification utilisateur, bugs et héritage — 18 octobre 2026

Périmètre : Kart Clash actif dans `5-3-PathFollowingComplex`. Les pages F1 historiques et les autres exemples ne sont pas modifiés.

## Corrections

1. **Circuit du modèle et circuit d’entraînement différents.** Charger un cerveau sélectionne désormais son tracé exact. Un circuit importé est utilisable sans sauvegarde implicite. Les noms de circuits comme `@3d` ne peuvent plus sélectionner accidentellement un exemple intégré.
2. **Lancements et contrôles concurrents.** La requête de démarrage verrouille immédiatement les réglages ; un double clic n’envoie pas deux calculs. Le polling ne remplace pas la configuration pendant cette requête. Le sélecteur de démonstration reste désactivé sur circuit, même après réception d’un statut. Reconnexion explicite et déverrouillage après échec ajoutés.
3. **Écran détruit avant validation d’une session.** La session complète est préparée avant la fermeture de l’éditeur ou de l’Académie. Un cerveau absent/incompatible affiche une erreur et laisse l’écran utilisable. Quitter une partie ne provoque plus deux reconstructions de page.
4. **Éditeur ambigu sur un tracé invalide.** Conduire, entraîner et sauvegarder sont désactivés tant que le tracé ou son nom est invalide. Annuler reflète l’historique ; la largeur et le nom peuvent être annulés. Après sauvegarde, le nom normalisé est aussi celui de l’éditeur. Supprimer est désactivé sans circuit enregistré correspondant.
5. **État graphique masqué.** Un échec de création de la vue 3D reste visible et libère le renderer partiellement créé. Les préférences de qualité et de mouvements réduits s’appliquent aussi à la vue d’entraînement. Un changement de circuit efface le statut de palier précédent.
6. **Tirs entre étages.** Les projectiles héritent de la hauteur de lancement. Impacts et missiles respectent les niveaux : une voiture à plus de 30 unités d’écart n’est pas touchée ; les garde-corps sont filtrés au niveau du projectile. Les projectiles continuent d’utiliser applyForce et la mise à jour héritée. Les armes restent désactivées dans les sessions circuit ordinaires, comme auparavant.
7. **Interface de l’Académie.** Largeur commune et centrée, palette cohérente, commandes de navigation internes sans changement de route, accès direct à la configuration et au réseau, reconnexion, états désactivés lisibles, options d’imitation regroupées dans une section secondaire. Aucun framework ni dépendance ajouté.

## Héritage vérifié

Un test parcourt **tous les 17 fichiers** de `kart/entities` : chaque fichier déclare une classe d’entité et son prototype descend de Vehicle. Les mondes de circuits v1, v2 et du passage superposé sont également inspectés à l’exécution.

| Entités | Chaîne d’héritage |
| --- | --- |
| Kart | Kart → Vehicle |
| PlayerKart, BotKart | PlayerKart/BotKart → Kart → Vehicle |
| Projectile | Projectile → Vehicle |
| Rocket, Bullet, HomingMissile | Classe → Projectile → Vehicle |
| Mine, WeaponCrate, ObjectiveMarker | Classe → Vehicle |
| ArenaObstacle | ArenaObstacle → Vehicle |
| ArenaBoundary, TrackSupport | Classe → ArenaObstacle → Vehicle |
| TrackSegment, TrackRail | Classe → Vehicle |
| Core, TeamBase | Classe → Vehicle |

Caméra, interface, entraînement, géométrie de rendu, effets non interactifs et diagnostics sont des services, pas des entités du monde. Spawn, attachement d’un objectif et résolution des contacts restent des phases explicites distinctes du steering.

`vehicle.js` n’a pas été modifié. SHA-256 : `A13B9EF7092EF2E15839F253A18C79A41B0530AC53D46BB4A6669A29D0CA9B4B`.

## Parcours dans le vrai navigateur

- Jouer : lancement, déplacement par flèches, D, pause et retour au salon.
- Les sept défis : lancement, HUD de progression, pause et entités héritées vérifiés. Leurs règles/conditions de fin sont couvertes par les tests automatisés.
- Circuit : nouveau tracé invalide, annulation, renommage, sauvegarde et passage vers l’Académie.
- Académie : chargement de cerveau, synchronisation du circuit, essai 3D, pause/recommencement, navigation vers la configuration, verrouillage/déverrouillage, coupure du service et reconnexion. Une panne 3D injectée conserve son message et libère le renderer.
- Jouer, garage, circuits, défis, réglages, aide et Académie : navigation et absence de débordement horizontal vérifiées à 600 px de largeur. Vue principale vérifiée à 1440 px.
- Cinq reconstructions successives du monde de présentation : ressources renderer stables à 267, sans croissance dans ce scénario.
- Aucun message console d’erreur/avertissement après le parcours normal. Le service d’entraînement reste `idle`.

Les sauvegardes de test et les changements de préférences sont effectués dans un **contexte navigateur isolé**. Le lancement/arrêt depuis l’interface est intercepté dans ce contexte pour vérifier les requêtes et les états sans lancer un entraînement utilisateur. La vraie chaîne CUDA est exercée par les fixtures temporaires bornées de la suite Python. Aucun modèle ni circuit utilisateur n’est supprimé ou remplacé. Ces vérifications établissent les parcours ci-dessus, pas l’absence absolue de tout défaut possible ni la convergence de l’apprentissage sur tout circuit.

## Commandes et résultats

Depuis le dossier de l’exemple :

```powershell
node --test tests/*.test.mjs
# 217 réussis, 0 échec, 0 ignoré.
node --test tests/kart-ux-regressions.test.mjs
# 7 réussis ; réexécutés après ajout des assertions sur les noms réservés.
& ./gp/training/.venv/Scripts/python.exe -m unittest discover -s kart/academy -p 'test_*.py'
# 18 réussis, y compris les fixtures CUDA temporaires.
python -m unittest discover -s tests -p test_kart_build.py
# 3 réussis.
python kart/build-frontend.py
# Build public 6a5a15719691, vérifié dans dist/kart-clash/build.json.
```

## Fichiers créés et modifiés

Créés : `kart/session.js`, `kart/academy-state.js`, `tests/kart-ux-regressions.test.mjs`, ce rapport et `kart/ux-bugfix.png`.

Modifiés : `kart/app.js`, `kart/academy-ui.js`, `kart/training-drive-view.js`, `kart/track-editor.js`, `kart/game.css`, `kart/entities/Projectile.js`, `kart/entities/HomingMissile.js`, `kart/weapons.js`, `agent.md`, `architecture.md`, `README.md`. Les fichiers publics gérés dans `dist/kart-clash` sont régénérés.
