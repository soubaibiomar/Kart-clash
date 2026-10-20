# Kart Clash: Rival Academy

Jeu de combat de karts 3D original, solo contre des bots locaux. Choisir une couleur, entrer dans La Fonderie, ramasser des caisses, utiliser six objets, réapparaître et gagner une manche de trois minutes. Aucun joueur en ligne simulé.

## Dessiner sa propre route

L’éditeur **Circuits** commence sur un terrain vide si aucun circuit sauvegardé n’est sélectionné. Pour repartir de zéro, choisir **Créer un circuit vide** : l’ancien brouillon reste récupérable par Annuler. Les quartiers prédéfinis sont maintenant repliés sous **Partir d’un exemple (facultatif)**.

Choisir directement **Ligne droite**, **Virage gauche/droit**, **Pont**, **Tunnel** ou **Rampe**, régler les dimensions, puis **Ajouter cette portion**. Pont ajoute montée, plateau et descente avec hauteur et longueurs réglables. Tunnel couvre la portion ajoutée ; **Voir l’intérieur des tunnels** permet d’inspecter la chaussée. La largeur et le nom sont accessibles en haut. Le menu **Comment construire** permet aussi de placer les points, dessiner à main levée ou déplacer les poignées.

La route peut rester ouverte ou être fermée en boucle. Rouvrir la boucle permet de la prolonger. **Enregistrer mon circuit**, **Conduire en 3D** et **Entraîner sur ce circuit** réutilisent exactement le tracé créé. Les limites existantes de terrain, pente et hauteur restent contrôlées. [Validation de l’éditeur personnel](kart/PERSONAL-TRACK-VALIDATION.md).

## Quartiers urbains en 3D

Dans **Circuits**, la bibliothèque propose **Centre-ville**, **Les docks** et **Métropole** : tracés fermés plus complexes, virages en arcs de cercle, viaduc et tunnel pour Métropole. **Charger ce quartier** remplace uniquement le brouillon courant et reste annulable. Les anciens circuits sauvegardés restent disponibles. Adapter ensuite les portions, conduire en 3D ou enregistrer puis entraîner le réseau sur ce tracé.

Les routes v2 sont habillées d’asphalte texturé, marquages, passages piétons, trottoirs continus et garde-corps de pont. Les quartiers comportent immeubles à façades variées, vitrines, toitures, lampadaires et arbres. **Décor urbain** masque le quartier dans l’éditeur pour faciliter les modifications ; il reste présent dans la conduite et l’entraînement. Le décor est calculé de façon déterministe et laisse une marge autour de toutes les routes, y compris aux étages.

Les bâtiments et accessoires physiques héritent de Vehicle ; aucun changement de vehicle.js. La conduite conserve une physique de kart arcade et le quartier reste stylisé : pas de circulation civile ni de piétons simulés. Les anciens circuits v1 gardent leur géométrie et leur rendu historique.

[Corrections, fichiers et tests de cette révision](kart/URBAN-TRACKS-VALIDATION.md).

## Population génétique en 3D

**Académie IA** ouvre maintenant [l’entraînement génétique 3D](http://127.0.0.1:8870/dist/kart-clash/index.html#evolution), inspiré de `9-VoitureSuitCircuit genetic algo`. Choisir un circuit construit dans l’éditeur ou un exemple, configurer la population, puis **Lancer la population**. Chaque voiture possède son réseau : distances des bordures en entrée, direction et vitesse en sortie. Les checkpoints mesurent la progression sans piloter le réseau. Contacts et stagnation éliminent les candidats ; la sélection proportionnelle à 2^fitness, les mutations gaussiennes et un parent élite produisent la génération suivante.

La population est visible en 3D, en vue générale ou en poursuite. Choisir un candidat pour lire ses capteurs, son état, sa fitness, ses neurones et ses dernières activations. Les essais sont indépendants et superposés : aucune collision entre candidats. Circuits avec rampes, ponts et tunnels utilisent la physique partagée et les capteurs filtrés par étage.

Lancer le service local avec `./kart/academy/start.ps1`. **CUDA sur la RTX 4060** calcule tous les réseaux, la sélection et les mutations ; la physique, les capteurs et les collisions restent sur CPU. Aucun apprentissage ne démarre à l’ouverture. Les cycles accélèrent le temps simulé, pas la vitesse physique. Le plafond de vitesse est configurable et le réseau apprend sa commande de vitesse ; aucune amélioration ou réussite n’est garantie.

Enregistrer/exporter le champion, exporter un candidat de la génération affichée ou tester un champion sauvegardé en 3D. Ce dernier essai est explicitement une inférence locale CPU. Le format `kart-evolution-v1` et son stockage sont séparés des anciens cerveaux. Chaque nouveau lancement crée une population aléatoire ; charger un champion permet son essai, pas une reprise de l’apprentissage.

[Architecture, fichiers et validation 3D](kart/EVOLUTION-3D-VALIDATION.md).

## Rival Academy historique — imitation et combat

Maj maintenu en tournant déclenche le drift à vitesse suffisante. Choisir Chacun pour soi ou Capture du noyau au salon. Capture : équipe azur, ramasser le noyau et le ramener à sa base ; 3 livraisons ou meilleur score à 3 minutes. Difficulté modifie réaction, visée, anticipation et récupération.

Pour créer un rival : dans une partie individuelle, **Enregistrer ma conduite**, jouer puis arrêter. Dans **Académie IA**, choisir cette démonstration (ou importer), configurer, lancer explicitement CUDA, examiner les évaluations, enregistrer puis choisir le rival dans le salon. Un seul bot utilise ce cerveau ; les autres restent scriptés. L’évaluation indépendante sans entraînement est disponible. Les anciens cerveaux v1 restent conservés mais ne sont pas exécutables avec les quatre sorties v2 (drift inclus). Le mode en équipe utilise des rôles scriptés.

[Validation actuelle, commandes, mesures et limites](kart/RIVAL-VALIDATION.md). Les sections historiques ci-dessous décrivent également la base conservée ; le format courant est `kart-combat-v2` avec quatre sorties.

## Lancer et jouer

Cloner ce dépôt dans `C:\Kart-clash` (ou adapter le chemin ci-dessous). Python et Node.js sont nécessaires aux commandes de construction et de tests. Le navigateur suffit pour jouer après lancement du serveur ; CUDA est facultatif.

```powershell
git clone https://github.com/soubaibiomar/Kart-clash.git C:\Kart-clash
Set-Location C:\Kart-clash
python kart/build-frontend.py
```

Depuis PowerShell :

```powershell
Set-Location 'C:\Kart-clash'
python -m http.server 8870 --bind 127.0.0.1
```

Construire ou actualiser la livraison avec `python kart/build-frontend.py`, puis ouvrir [Kart Clash](http://127.0.0.1:8870/dist/kart-clash/index.html#setup). Le GPU et l’Académie ne sont pas nécessaires pour jouer. Garder ce terminal ouvert. Le fichier ne fonctionne pas directement avec `file://`, car le rendu utilise des modules JavaScript.

- Flèches ↑ ↓ ← → : accélération, direction, freinage puis marche arrière.
- Espace : objet équipé ; maintenir pour la rafale.
- Échap : pause/reprise. C : réinitialiser la caméra. D : debug ; également accessible dans la pause. La conduite utilise uniquement les flèches : D est réservé au debug.
- Les touches de conduite sont ignorées dans les champs éditables. Les touches tenues sont effacées à la pause et à la perte de focus.
- Clavier de bureau uniquement. Les menus sont adaptatifs ; aucun contrôle tactile de conduite n’est annoncé.

Le salon affiche le kart, le personnage, le pseudo et le bouton Jouer. Garage : Boulon, Roussi ou Pistache, plus huit couleurs. Options repliables : 0–12 bots, défaut 7. Contrôleur scripté par défaut ou cerveau neuronal explicitement sélectionné. Garage → couleur persistante. Défis → sept parcours. Réglages → volume, silence, mouvements réduits et qualité 3D. Le mode automatique désactive les ombres dynamiques sur le GPU Intel et les rendus logiciels ; « Détaillée » les réactive.

## Règles

Une élimination rapporte un point, une seule fois. Une élimination par sa propre mine ne rapporte aucun point. Départage : éliminations décroissantes, morts croissantes, dégâts infligés décroissants, identifiant de kart croissant. Les tirs déjà lancés restent valides après la mort du tireur ; un kart mort ne peut pas lancer de nouvelle attaque. Les impacts du même tick sont traités dans l’ordre stable de création.

Réapparition après 2 secondes à un point maximisant la distance aux karts vivants et aux projectiles. Protection visible pendant 3 secondes ; l’utilisation d’un objet l’annule. Les caisses reviennent après 10 secondes. Une seule place d’objet. Les murs arrêtent les tirs. Les contacts des karts ne causent pas de dégâts ; ils sont résolus séparément du steering.

| Objet | Règle |
|---|---|
| Roquette | 60 dégâts, 1 tir, vitesse 16 px/tick, expire à 2,5 s |
| Missile guidé | 45 dégâts, 1 tir, vitesse 9, force de poursuite ≤0,22, expire à 4 s ; continue droit si la cible est perdue |
| Mine | 70 dégâts, armement 0,8 s, déclenchement à 46 px inclus, expire à 25 s ; propriétaire vulnérable après armement |
| Rafale | 10 balles de 15 dégâts, intervalle 0,12 s, vitesse 22, expiration 1,2 s |
| Bouclier | Ignore les dégâts pendant 6 s, retour visuel à la normale à l’expiration |
| Turbo | Vitesse ×1,6 et force ×1,35 pendant 3 s, puis limites normales exactement restaurées |

Les durées du bouclier/turbo sont remplacées lors d’une nouvelle activation, jamais multipliées. Recharge des objets hors rafale : 0,45 s. Maximum 128 projectiles, 32 mines, 40 effets et 12 sons simultanés.

## Défis et comportements observables

| Défi | But et règles | Comportements visibles |
|---|---|---|
| Parking précis | 3 balises, arrêt <0,4 px/tick pendant 0,6 s, 75 s | Guide : seek puis arrive ; navigation autour du couvert |
| Slalom industriel | 5 balises dans l’ordre, <8 contacts, 90 s | Guide : path following, évitement ; un contact compté au plus toutes les 0,5 s |
| Interception | 3 contacts espacés de 3 s avec le bot, 75 s | Le bot poursuit la position anticipée du joueur |
| Échappée | Survivre 45 s, élimination = échec | Chasse, flee si blessé, evade des tirs menaçants |
| Escorte | Tous les alliés à moins de 250 px de la sortie, joueur à moins de 100 px, 90 s | Leader following, alignement, cohésion, séparation |
| Convoi serpent | Toute la chaîne rejoint la sortie, 90 s | Arrive vers le prédécesseur, séparation |
| Tour de garde | 4 balises avec le patrouilleur à moins de 140 px, 100 s | Wander continu, path following, boundaries |

Tout défi échoue à la mort du joueur ou au temps limite, sauf Échappée qui réussit à l’expiration si le joueur vit. Résultat, replay et sortie sont disponibles. Les records ne sont sauvegardés qu’en cas de réussite.

## Académie IA optionnelle

Deuxième terminal PowerShell :

```powershell
Set-Location 'C:\Kart-clash'
& .\kart\academy\start.ps1
```

Le lanceur réutilise `gp/training/.venv` et démarre seulement le service local `127.0.0.1:8871`, sans apprentissage. Il faut Node.js et PyTorch CUDA dans cet environnement. Alternative : lancer `kart/academy/server.py --port 8871` avec un Python disposant de PyTorch CUDA. Aucun paquet ou pilote n’est installé par le jeu.

Dans Académie IA : définir capteurs, portée, couches, activation, population et budgets ; cliquer explicitement **Entraîner sur le GPU**. Arrêter interrompt aussi une évaluation Node, avec conservation du dernier export achevé. Une limite de temps peut terminer le calcul sans satisfaire le critère de qualité.

L’imitation apprend de vraies commandes du bot combat dans deux dispositions ; CUDA effectue les couches et l’optimisation. La neuroévolution conserve le meilleur parent et génère des mutations gaussiennes CUDA. **L’évaluation physique et son inférence sont exécutées sur CPU par le même JavaScript que le jeu.** Il ne s’agit pas d’une physique GPU ou d’un moteur GPT. Les anciens réseaux F1 ne sont jamais réutilisés comme cerveaux combat.

Les résultats réels donnent fitness, génération, moyenne, dégâts et éliminations. La preview est un diagnostic 2D du candidat sélectionné de la dernière population évaluée, pas une population animée en direct. L’inspecteur montre la topologie et, si disponibles, les activations réellement calculées. Exporter/importer JSON ou enregistrer un cerveau local, puis le sélectionner avant une manche. Un cerveau aléatoire est marqué non entraîné. Un cerveau entraîné peut rester mauvais ; aucun contrôleur scripté de secours ne le remplace.

Voir [architecture.md](architecture.md) pour le schéma d’observation, la fitness et les limites de parité. Les sorties de calcul sont isolées dans `kart/academy/runs/<UUID>/`, sans écraser les modèles F1.

## Tests

Depuis le dossier de cet exemple :

```powershell
node --test tests/*.test.mjs
& .\gp\training\.venv\Scripts\python.exe -m unittest discover -s kart/academy -p test_academy.py -v
```

Les tests GPU utilisent des tenseurs synthétiques et un répertoire temporaire jetable : un seul pas d’imitation, une génération de quatre candidats et 120 ticks par évaluation. Aucun calcul utilisateur n’est lancé par les tests ou par l’ouverture d’une page. Le contrat Start/Stop HTTP est testé avec un processus simulé.

## Provenance, archives et livraison

Karts, robot, arène, pictogrammes SVG et effets sonores synthétiques sont créés pour ce projet. Référence d’interaction seulement : [Smash Karts](https://smashkarts.io/). Aucun asset extrait de ce jeu. Three.js local (MIT), p5.js fourni par le dépôt et police Barlow (OFL, licence dans `gp/fonts/OFL.txt`) sont réutilisés. Le code de locomotion Vehicle fourni est intact.

Les expériences précédentes restent accessibles : `apex-lab.html` (F1), `garage.html`, `training.html`, `steering-lab.html`, `snake-lab.html`, `broadcast-lab.html`. Documentation historique : `gp/README.md`, `gp/ARCHITECTURE-HISTORY.md`, `SNAKE-LAB.md`. Aucun autre exemple du dépôt n’est modifié.

Pour préparer un frontend statique sans modèles privés ni outils d’entraînement : `python kart/build-frontend.py`. Le dossier `dist/kart-clash` contient une liste explicite de dépendances publiques. Aucun déploiement externe n’est exécuté.

Limites : une arène, sol horizontal, pas de sauts, pas de multijoueur réseau, pas de contrôle tactile. Les rayons d’évitement et les contacts sont approximés par cercles et rectangles alignés ; c’est un jeu arcade. Sous une très longue image, le rattrapage physique est borné à 12 ticks et le chronomètre consomme néanmoins le temps réel actif. Les cerveaux doivent être entraînés et évalués avant d’espérer de bons résultats.

## Refonte cartoon et inspection

Le contrôle par lettres a été retiré pour libérer **D** : flèches pour conduire, Espace pour l’objet, Échap pour la pause, C pour la caméra. D, le bouton « Debug · D » et la case de pause partagent le même état. Les raccourcis du navigateur et la saisie restent libres. Aucun remapping annoncé.

Cliquer sur un kart/caisse/projectile ou utiliser le sélecteur pour examiner une entité. Les cinq couches sont indépendantes : capteurs, forces, chemin, voisins et menace. Le panneau distingue la force de planification, les commandes et la force réellement appliquée. Les origines des rayons restent celles de leur calcul, pas la position ultérieure. Les réseaux affichent les observations et activations effectivement calculées.

Le build est répétable : liste blanche publique, validation des chemins et refus des liens/jonctions, remplacement atomique par fichier, conservation des fichiers non gérés. `build.json` contient un identifiant dérivé du contenu et les empreintes des fichiers ; le salon affiche cet identifiant. Une reconstruction n’est pas une transaction atomique de tout le dossier : recharger après sa fin.

Tests supplémentaires : `python -m unittest discover -s tests -p test_kart_build.py -v`. Voir `kart/REFRESH-VALIDATION.md` pour cette refonte.

## Circuits personnalisés — 18 octobre 2026

Navigation **Circuits** : dessin libre, ajout de points, déplacement de points, portions droites et virages combinables, annulation, largeur, boucle ouverte/fermée. Enregistrer puis **Essayer en 3D** ou **Entraîner sur ce circuit**. Dans l’Académie, choisir le terrain, lancer explicitement le calcul CUDA, enregistrer le cerveau puis **Observer sur le circuit en 3D**. Le cerveau exporté contient son circuit, indépendamment des modifications ultérieures du dessin.

Limites : circuits plats dans une zone de 1800 × 1400, 3–240 points, largeur 120–320, 20 sauvegardes locales. Import/export JSON. Pas de ponts ni de dénivelés ; les croisements sont au même niveau. Bordures rasterisées à 40 px, visibles telles qu’elles sont détectées. La validation géométrique ne garantit pas que tout tracé arbitraire est praticable ou apprenable.

L’objectif est de franchir les balises dans l’ordre, terminer et limiter les contacts. CUDA calcule l’imitation et les mutations ; les évaluations physiques et l’inférence des parcours utilisent le même moteur JS que le navigateur, sur CPU. Validation sur le même circuit avec orientations initiales légèrement différentes, pas preuve de généralisation à des circuits inconnus. Les démonstrations de combat ne sont pas réutilisées pour les circuits. Aucun réseau compétent préentraîné n’est livré. L’aperçu de population reste un relevé ; le bouton Observer lance une exécution 3D du réseau sélectionné.

## Habillage arcade Stadium — 18 octobre 2026

Référence visuelle : https://smashkarts.io/ ; identité, modèles procéduraux et sons propres à Kart Clash. Palette cartoon, volumes plus francs, Stadium extérieur, karts plus massifs, caisses mieux identifiées et nouvelles plaques de noms. Le salon met le kart et le lancement au premier plan. Caméra plus basse et FOV progressif avec la vitesse ; le mode mouvements réduits reste fixe. La caméra se rapproche avant le couvert et vérifie également la ligne de vue après amortissement.

La boucle de combat conserve les règles partagées du moteur : manches de trois minutes, six objets, points d’élimination, réapparition et protection, bots ou adversaire neuronal. La visée projetée est alignée sur le cap du kart et arrêtée par le premier mur ; elle indique le lancement, pas une garantie de toucher (notamment pour le missile guidé). Confirmation d’impact, +1 point, éclats bornés et spatialisation stéréo des sons proches améliorent la lecture du combat. Les lois de locomotion, observations et fichiers de modèles restent compatibles. Les circuits et l’Académie restent accessibles.

Cette réalisation reste un jeu local contre des bots, avec ses propres cartes et ses propres assets. Pas de multijoueur en ligne ni de reproduction exacte des règles physiques de Smash Karts. Détail de validation : kart/ARCADE-VALIDATION.md.

## Construction en 3D et mines de proximité — 18 octobre 2026

La navigation **Circuits** ouvre désormais une construction 3D : clic pour ajouter/sélectionner, outil Déplacer pour déplacer un point, altitude du point sélectionné, altitude de dessin, boutons de route/virage/rampe/pont/tunnel. Clic droit + glisser pour tourner, molette pour zoomer ; boutons équivalents disponibles. Le mode Coupe permet de voir l’intérieur des tunnels. Un pont prédéfini comprend montée, tablier et descente. Deux exemples : Pont et tunnel, Passage superposé.

Les routes `kart-track-v2` portent des altitudes 0–240 et un type par portion. Pente limitée à 50 % ; au croisement des axes de deux portions, 120 unités de hauteur sont requises. La voiture suit la chaussée avec les mêmes forces et la même locomotion héritée ; sa hauteur est la contrainte de contact de la surface. Ponts, garde-corps et piliers sont des entités Vehicle. Les ponts permettent un passage dessous sans collision avec le niveau supérieur. Un tunnel est une chaussée couverte avec 94 unités libres. Les anciens fichiers v1 restent lisibles ; éditer/enregistrer un ancien tracé le convertit en v2. Chaque cerveau v2 embarque son circuit et utilise la normalisation track-deck-v2. L’Académie calcule l’apprentissage sur CUDA et les parcours physiques/inférences sur CPU, dans le moteur partagé.

Les mines affichent leur couche de proximité : rayon exact 46, jaune pendant les 0,8 s d’armement, rouge ensuite. Dès que le centre d’un kart vivant entre dans ce rayon, la mine se déclenche une seule fois et inflige les 70 dégâts habituels à cette cible. Le propriétaire peut la déclencher après armement. Un autre étage, éloigné de plus de 30 unités, ne déclenche pas la mine. Pause et expiration sont respectées. La couche affiche le rayon de détection, pas un nouveau rayon de dégâts en zone.

Limites : conduite attachée aux chaussées, sans sauts ni chute libre ; pas de creusement de terrain ni de tunnels souterrains excavés. Le réseau apprend la conduite sur ces surfaces, pas le vol. Les validations de géométrie ne garantissent pas la praticabilité de toute création arbitraire. Voir kart/3D-TRACKS-VALIDATION.md.


### Regarder la voiture apprendre sur un circuit
Dans **Académie IA**, choisis un circuit sauvegardé ou l’un des trois exemples, puis règle **Apprendre à accélérer** et démarre explicitement le GPU. La voiture 3D utilise les poids publiés pendant l’imitation puis à chaque génération. Vitesse mesurée, plafond, balises et contacts sont affichés ; Pause et Recommencer n’agissent que sur l’essai visible, pas sur le calcul. Le plafond peut augmenter de 24 px/s après deux générations sûres sur les trois essais. Les réglages de départ et d’objectif sont des pourcentages du plafond historique 288 px/s. Le chrono récompense les tours plus rapides. Cet essai local ne remplace pas les mesures de validation ; le budget peut finir sans apprentissage réussi. Les cerveaux exportent leur plafond avec leurs poids, pour conserver le comportement en jeu. Voir [le rapport](kart/TRAINING-LIVE-VALIDATION.md).


La vérification des parcours utilisateur et des 17 types d’entités est documentée dans [UX-BUGFIX-VALIDATION.md](kart/UX-BUGFIX-VALIDATION.md). Dans l’Académie, les boutons « Voir la voiture », « Configurer et lancer » et « Inspecter le réseau » donnent accès aux trois sections. Un cerveau chargé conserve son circuit exact, même si ce circuit n’est pas enregistré dans l’éditeur.


### Assembler un circuit
Dans **Circuits**, clique sur **Nouveau circuit**, choisis une portion et règle ses dimensions. L’aperçu bleu précède l’ajout. Lignes droites, virages à angle/rayon réglables, rampes, ponts et tunnels s’attachent au point final. Annuler/Rétablir et Fermer le circuit sont disponibles ; les points restent ajustables dans les outils avancés. Une fois valide, le circuit peut être conduit et préparé dans l’Académie. Détails : [TRACK-ASSEMBLY-VALIDATION.md](kart/TRACK-ASSEMBLY-VALIDATION.md).


## Vérification du code

```powershell
node --test tests/*.test.mjs
python -m unittest discover -s tests -p test_kart_build.py
# Avec PyTorch disponible dans le Python choisi :
python -m unittest discover -s kart/academy -p "test_*.py"
```

Les laboratoires historiques sont conservés dans leurs pages séparées. Les environnements Python et données de session locales ne sont pas inclus dans le dépôt. Les modèles F1 historiques requis par leurs laboratoires et tests sont conservés. Installer PyTorch avec CUDA dans `gp/training/.venv` pour utiliser le lanceur optionnel `kart/academy/start.ps1`.
