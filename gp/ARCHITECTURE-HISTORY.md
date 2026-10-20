# Circuit de F1 — Exemple 5-3

## Services locaux distincts

Le serveur de pages sur 8765 et la radio sur 8766 restent conservés. Le moteur GPU mis à jour est démarrable séparément par `server.py --port 8767` ; la balise `training-api` de la page fixe son adresse. Le client garde la même validation JSON et les contrôles de capacité. CORS accepte uniquement les origines loopback de la plateforme sur 8765 et du port réellement lié ; aucune origine externe ni wildcard. Les requêtes OPTIONS sont sans effet sur l'entraînement. Le lanceur vérifie les services avant d'ouvrir la page et ne tue aucun processus.

## Inspection neuronale

`gp/networkInspector.js` est un service d'interface, pas une entité du monde. Il valide les dimensions et tenseurs du modèle du pilote observé, calcule les comptes de neurones/connexions/paramètres, dessine la structure et fournit une inspection accessible par couche et indice. Il ne lance aucune inférence navigateur et ne modifie ni les poids ni les réglages de préparation.

Le moteur CUDA expose `sigmoid_activations`, réutilisé par `sigmoid_model` pour conserver exactement les mêmes calculs et gradients. Les snapshots de preview portent les entrées et activations du candidat en tête de progression de chaque pilote. L'interface distingue structure du modèle sauvegardé et activations du candidat CUDA ; elle ne mélange pas les poids d'un export ancien avec les connexions pondérées d'un candidat en cours. Un relevé absent, incomplet ou d'un autre pilote ne déclenche aucune activation de remplacement.

## Visualisation 3D de l'apprentissage

`gp/training3d.js` est un service de rendu des diagnostics CUDA, distinct des entités Vehicle de la course. `TrainingPresentation.preview` sélectionne le relevé d'un pilote ; `TrainingScene3D` valide ses données puis construit la route et les matrices instanciées des monoplaces. Le même asset F1 représente jusqu'à 128 candidats avec un nombre borné d'appels de dessin. Les positions, orientations et rayons du relevé sont lus sans modification. Les capteurs utilisent leur origine au dernier scan GPU.

La caméra globale cadre le circuit ; la caméra de suivi lit le candidat en tête de progression fourni par le moteur. Le rendu est actualisé aux nouveaux relevés et aux interactions de caméra, sans boucle d'entraînement ni course fictive. Les changements de circuit, pilote ou taille de population libèrent le groupe précédent ; la fermeture déconnecte le ResizeObserver et libère le renderer. Une perte de contexte WebGL restitue la preview 2D. Les courbes statistiques restent séparées et secondaires.

## Poids de l'apprentissage CUDA

`gp/trainingWeights.js` construit et valide les huit curseurs de préparation ; `training/trainingWeights.py` partage les bornes et profils avec le serveur et le moteur. L'API transmet un instantané JSON `--weights`. Les poids de score alimentent `fitness_score` ; les trois forces de sécurité sont calculées séparément puis combinées avec la force neuronale, avant une seule intégration vectorisée bornée. L'imitation initiale est inchangée. Le statut, l'historique, la preview et les modèles exportés conservent cet instantané.

`CircuitRollout` présente le même trafic de référence déterministe à chaque candidat, avec perception par rayons et contexte de proximité. Les candidats ne s'évitent pas mutuellement : cela empêcherait une comparaison indépendante des réseaux. Ces données de preview sont des diagnostics du calcul, pas de nouvelles entités physiques de la scène p5. La course conserve ses sous-classes de Vehicle et son gestionnaire de forces séparé.

Une ancienne instance du serveur ne doit pas accepter silencieusement des valeurs ignorées : la page exige `weightControls: 1` avant tout lancement. Les curseurs sont désactivés pendant un calcul actif. Le redémarrage du service est nécessaire après mise à jour du backend ; il ne démarre aucun entraînement.

## APEX : comportements composables

### Rendu de course en relief

`gp/raceScenery3d.js` est une fabrique de décor, pas une entité physique : vibreurs et barrières instanciés depuis les échantillons du circuit, tribunes, portique, ciel et ombres de contact. Ces représentations ne changent ni les frontières perçues ni les collisions. Les barrières graphiques laissent le corridor de stands ouvert. Le relief et les tribunes sont illustratifs, non une reconstruction exacte du circuit réel.

La caméra arrière lit position et orientation via `chasePose`. Le ciel suit la caméra comme rendu ; son brouillard est réservé à cette vue, pour garder la vue du dessus lisible. Les textures d'ombre et les géométries du ciel sont libérées à la destruction. Les monoplaces restent des représentations de `GrandPrixCar extends Vehicle`. `gp/cinematic.css` partage les menus charbon sans changer leurs actions.

Les classes physiques de `gp/` sont `GrandPrixCar`, `SafetyCar`, `PitCrewMember`, `TrackObstacle` et `ServiceVehicle`, toutes sous-classes de `Vehicle`, chacune dans son fichier. Chaque instance possède un `BehaviorManager`. Les classes historiques du laboratoire restent décrites ci-dessous.

`BehaviorManager` expose `add`, `remove`, `activate`, `deactivate`, `changeWeight`, `getSteeringForce`, `exportSettings` et `importSettings`. Il compose une somme pondérée ou le groupe de priorité actif le plus élevé. Les poids sont bornés de 0 à 10 ; chaque force et le résultat respectent `maxForce`. Les forces sont copiées. Seuls les comportements actifs sont calculés ; le gestionnaire ne déplace aucune entité.

`steeringBehaviors.js` fournit seek, flee, arrive, pursue, evade, wander, séparation, alignement, cohésion, suivi de leader et limites de zone. Les méthodes fournies de `Vehicle` sont réutilisées quand leur contrat convient. `ObstacleAvoidanceBehavior` prédit le corridor devant la voiture et conserve un côté de contournement pendant la rencontre. Il renvoie une force, sans téléportation. Cet évitement local ne garantit pas l'absence de collision à toute vitesse.

Le contrôleur de course choisit le mode prioritaire. Le réseau reste responsable du pilotage normal ; séparation, évitement et correction des bords sont des contributions de sécurité visibles et désactivables. Sous Safety Car, le suivi du leader devient explicite. Le pilote expert conserve sa composition historique et reçoit seulement l'évitement des obstacles ajoutés. Les modèles et le moteur CUDA ne sont pas modifiés.

Les quatre véhicules de service illustrent wander, flocking, suivi de leader et poursuite/fuite dans une zone de paddock. Ils utilisent un générateur aléatoire séparé. La démonstration tourne à pas fixe, même sur la grille sans avancer la séance ; une pause dédiée et le mode désactivé la suspendent. Les changements de scénario conservent les instances. Ces démonstrations n'entrent pas dans le classement de course.

`BehaviorPanel` règle les trois poids de sécurité, sauvegarde/charge leurs réglages locaux, sélectionne les démonstrations et place jusqu'à 20 obstacles sur la chaussée. `RaceScene3D` représente les instances existantes, libère les meshes retirés et affiche les forces/capteurs déjà calculés. La caméra Paddock et le picking permettent d'observer un véhicule de service. Aucun calcul de force n'est déclenché par le debug.

## Entités et locomotion

`RaceCar extends Vehicle`, `WanderCar extends RaceCar`, `RoadObstacle extends Vehicle` et `TrackBorder extends Vehicle`. Chaque classe d’entité a son fichier. Les obstacles et les segments de bordure sont immobiles : vitesse nulle. Les voitures réutilisent `update()`, `applyForce()`, `seek()`, `separate()` et `wander()` du véhicule fourni. Aucun déplacement n’est imposé sur une trajectoire.

`RaceTrack extends Path` constitue le décor et sa géométrie ; `RaceSimulation` est le contrôleur ; `BorderSteering` et `ObstacleAvoidance` calculent des forces ; les contrôles sont du DOM. Ce ne sont pas des entités du monde. `vehicle.js` et `path.js` restent inchangés.

## Référence : 6-ObstacleAvoidance

Le dossier 6 a été lu sans modification. `sketch.js` crée les véhicules et obstacles, puis applique les comportements avant la locomotion. `obstacle.js` dessine des cercles. `vehicle.js` fournit notamment `avoid()` et `avoidCorrige()` : anticipation `ahead = vel × 30`, `ahead2 = vel × 15`, test de proximité, puis vitesse désirée opposée au danger et force limitée. `index.html` charge p5.js et ses scripts ; `style.css` règle le canvas ; `jsconfig.json` sert à l’éditeur.

L’adaptation ne recopie pas les défauts de cette référence : `avoid()` suppose qu’un obstacle existe, le plus proche du véhicule n’est pas forcément celui qui menace sa trajectoire, les seuls points ahead/ahead2 peuvent manquer un petit obstacle intermédiaire et une force exactement colinéaire peut être nulle. La séparation du dossier 6 utilise aussi des noms de propriétés incompatibles avec sa classe (`maxspeed`, `velocity`, `maxforce`). Ici, la séparation réutilisée est celle du dossier 5-3, sans modifier sa base.

## Pilotage par bordures

`RaceTrack` dessine une piste de 120 px sur ordinateur (80 px auparavant), adaptée aux petits écrans avec un minimum de 44 px. Le tracé est espacé verticalement pour accueillir cette largeur et la voie des stands est décalée. Elle construit deux contours à la largeur de l’asphalte et instancie 352 `TrackBorder`. Les méthodes `nearestBorder()`, `advanceBorder()` et `senseBorder()` interrogent ces contours. La mémoire locale du segment empêche de confondre deux branches voisines. Les segments repliés du contour intérieur d’une épingle sont exclus de la perception et le pilotage préfère alors le bord extérieur. Pendant la construction du décor, les portions de contour recouvertes par l’asphalte d’une branche voisine sont retirées des murs détectables. Les intervalles visibles contigus sont fusionnés. `contains()` utilise les deux contours fermés et leur nombre d’enroulement pour reconnaître l’intérieur de la route, y compris près d’un raccord concave ; elle n’utilise pas la ligne centrale.

`BorderSteering` anticipe les intersections avec les bordures dans la direction de la vitesse, à 15 et 30 images, et utilise des capteurs obliques. La distance frontale et la courbure du mur bornent la vitesse. La direction désirée longe la bordure avec une correction latérale de distance ; elle ne vise pas un point fixe à l’intérieur du virage. La force vaut vitesse désirée moins vitesse courante, bornée par `maxForce`. Un risque immédiat de sortie donne priorité au retour vers l’intérieur.

Aucun `project()` ou `sample()` de la ligne centrale n’est appelé pendant le pilotage. Ces méthodes servent uniquement au dessin et au placement/orientation initial des voitures. Les diagnostics affichent les données déjà calculées, sans recalculer le pilotage.

## Obstacles et composition

`ObstacleAvoidance` reprend ahead/ahead2 de l’exemple 6. Le segment complet entre la position actuelle et ahead est testé contre chaque obstacle, avec une marge de 20 px. L’obstacle menaçant rencontré en premier est sélectionné. Le contournement évalue les deux côtés selon la place réellement disponible jusqu’aux bordures, en essayant la tangente du bord près de l’obstacle puis la direction actuelle. Il prépare un point d’entrée et un point de sortie décalés de `rayon + 25 px`, vérifie leur appartenance à la route et leur dégagement, puis conserve le même côté jusqu’au dépassement. Le mouvement vers ces points utilise le `seek()` hérité, sans imposer de position.

Pendant un contournement, la vitesse maximale est temporairement bornée à 2,2 px/image et le poids de la conduite habituelle diminue : elle ne doit pas ramener immédiatement la voiture vers le mur qu’elle longeait. Les forces restent bornées à `maxForce`. Si aucun côté n’offre une marge de 16 px ou si les autres obstacles ferment les passages, la voiture s’arrête devant le danger. La menace reste mémorisée même à vitesse nulle, pour éviter une alternance arrêt/redémarrage. La reprise est possible lorsque l’obstacle est retiré ou que l’évitement est désactivé. Le redimensionnement efface le plan de contournement et la menace mémorisée pour recalculer leurs coordonnées.

Le curseur Évitement règle le poids de cette force de 0 à 5 (2 initialement). À zéro, l’évitement des obstacles est désactivé ; la conduite par bordures reste active. Un poids positif donne davantage de priorité au contournement ; à zéro, le plan et son éventuel arrêt sont annulés. Le curseur Séparation règle de 0 à 5 un gain de 0 à 1 sur la répulsion héritée. Il ne divise plus la force de conduite par son poids : sans voisin, il n’affecte ni traction ni vitesse. Le freinage longitudinal est conservé lorsqu’un véhicule est devant ; seule la répulsion des voisins latéraux est atténuée. `maintainTrafficSpacing()` mesure la place occupée par les voitures selon leur orientation, puis borne temporairement la vitesse du suiveur à celle du véhicule devant et à la distance libre. Le curseur augmente la marge de confort. Les limites normales sont rétablies à chaque calcul avant les contraintes de circulation et de virage, pour permettre la reprise après un arrêt. À zéro, ces contraintes de séparation sont désactivées. Les superpositions exactes reçoivent une force opposée selon le numéro de voiture. La somme des forces est bornée à `maxForce`.

Wander conserve son comportement libre dans le même tableau ; il bénéficie de la séparation et de l’évitement des obstacles. Ce n’est pas un moteur de collisions rigides : des réglages faibles ou nuls peuvent autoriser les contacts.

## Interface et contrôleur

Le bouton + Obstacle active un mode de placement : chaque clic sur le canvas ajoute un obstacle orange immobile ; cliquer à nouveau sur le bouton termine ce mode. Le glisser ne crée pas de voitures dans ce mode. Les obstacles superposés sont refusés et leur nombre est limité à 30. Leur rayon est adapté à la largeur de route pour laisser de la place aux voitures. Recommencer efface les obstacles et réinitialise les 16 voitures, en conservant les valeurs des curseurs.

Les voitures restent limitées à 80. Clic/glisser ajoute une voiture, S une F1 rouge rapide, W une F1 verte en promenade. D et la case Debug restent synchronisés, même après utilisation d’un curseur ou d’un bouton. Les répétitions clavier et les champs de saisie sont ignorés. Le redimensionnement conserve les populations et positions relatives, puis réinitialise la mémoire des bordures.

## Vérification

Depuis ce dossier : `node --test tests/*.test.mjs`.

Les tests déterministes couvrent l’héritage, les forces et leurs limites, les sondes, les cas vide/lointain/proche/centré, la menace entre deux sondes, les deux curseurs, les bordures, l’absence de lecture de la ligne centrale, le retour sur piste, le contournement d’obstacle, le choix du côté libre, la stabilité de ce côté, l’arrêt devant un passage fermé, la reprise, la largeur réelle et un tour complet dans le format écran large. Compléter par une validation du vrai p5.js dans le navigateur, incluant le bouton et les événements des curseurs.


# Grand Prix race-day extension

The default `index.html` now launches the autonomous race-day simulation documented in [gp/README.md](gp/README.md). The complete earlier laboratory is preserved at [steering-lab.html](steering-lab.html), using its existing scripts and controls.

The race extension is isolated in `gp/`: deterministic fixed-tick controller, circuit coordinates, driver/strategy/race-control agents, steering, tyre/weather models, actual pit navigation, Safety Car, pit crews, contacts and the broadcast UI. `GrandPrixCar`, `SafetyCar` and `PitCrewMember` all inherit `Vehicle`. Helpers, scenery and DOM controls are not physical entities. All car locomotion uses the protected base implementation; no existing `vehicle.js` or `path.js` is edited.

See the README for the file map, execution order, controls, tests and explicit modeling limits. Existing unrelated working-tree changes were preserved.


## Extension 2026 : capteurs, week-end et pilotage

L’analyse de l’exemple 9 est conservée dans `gp/EXAMPLE-9-ANALYSIS.md`. Son intersection rayon/segment inspire `RacingSensors` : douze directions, portée réglable, index spatial des bordures, distance et rapprochement des autres voitures. Les mesures sont échantillonnées tous les six ticks ; le debug ne les recalcule pas. `RacingSteering` compose freinage perceptif, correction de bordure et forces existantes. Les décisions de changement de voie lisent l’occupation latérale.

`RaceWeekend` possède la succession des séances et crée une simulation autonome pour chaque séance. Les temps réellement mesurés classent les pilotes ; Q1/Q2/SQ1/SQ2 éliminent les groupes concernés, puis Q3/SQ3 déterminent le haut de leur grille respective. `SportingRules` centralise les règles supportées ; `gp/RULES.md` fait autorité sur leur couverture, sans annoncer une conformité FIA exhaustive.

`ManualControl` remplace la sélection de vitesse désirée du pilote choisi, puis retourne une force bornée. L’intégration reste héritée. Les stands, feux et états de neutralisation conservent leur priorité. La perte de focus efface les touches. Le pilotage impose le rythme 1×.

Les 24 données de circuit géographiques sont embarquées et versionnées. Leur projection est un service de géométrie, pas une entité autonome. Les points de course sont mesurés par projection locale et déroulement de la distance ; une correction bornée de la mesure évite qu’un décalage accumulé bloque la voiture en visant derrière elle. La largeur, le décor et la voie des stands sont illustratifs.

Les identités pilotes/équipes/numéros sont vérifiées pour 2026 ; les styles de conduite sont des réglages éditoriaux clairement identifiés. L’interface conserve APEX avec une barre de séances, une direction de course, le pilotage et la télémétrie. Le laboratoire serpents du dépôt amont est séparé dans `snake-lab.html` pour éviter les collisions de sketch et de tests.

Aucun fichier `vehicle.js` ni `path.js` n’est modifié par cette extension.


## Réseaux individuels et entraînement piloté par la plateforme

`DriverNeuralModel` porte une instance MLP indépendante par pilote et valide le format des exports CUDA. `NeuralSteering` fournit la vitesse désirée puis la force ; il n’appelle pas le pilote géométrique. `DriverAgent` conserve la sélection tactique et les procédures de séance, sans choisir la direction à la place du réseau. `GrandPrixCar` réutilise intégralement la locomotion de Vehicle.

`gp/training/train.py` entraîne des poids indépendants par pilote sur CUDA et évalue des populations séparées avec des capteurs et une locomotion vectorisés. Les calculs de progression servent à la fitness, pas à assigner une trajectoire au réseau. La page Entraînement commande ce moteur via le service local `server.py` : démarrage explicite, arrêt, reprise, état GPU, mesures et positions de population. Aucune conversation ni API GPT n’intervient dans ce fonctionnement.

La course, le garage et l’entraînement sont trois pages distinctes. Les modèles actifs restent constants pendant une course et se rechargent à sa recréation. Les modèles initiaux sont identifiés comme expérimentaux ; les tests de règles historiques emploient explicitement le pilote expert et les tests neuronaux interdisent tout repli caché vers celui-ci.

## Radio et instructions confirmées

`TeamRadio` est un service d’interface et de sélection d’action, sans entité visible ni intégration du mouvement. Il interprète des intentions FR/EN connues, conserve les phrases libres, prépare un ordre pour les IDs de voiture explicitement sélectionnés, puis vérifie sa validité avant application. Un changement de séance invalide la proposition. Une instruction à l’équipe valide tous les destinataires avant d’engager un arrêt ; les stocks de pneus et les voitures indisponibles bloquent l’ensemble.

`RaceRadioUI` reçoit une transcription finale via Web Speech, ouvre la proposition et attend un clic de confirmation. Une phrase non comprise peut être associée explicitement à une action ou envoyée comme simple message sans effet de pilotage. Aucun modèle de langage/GPT n’est appelé. Les langues de dictée sont sélectionnables ; ce n’est pas une détection automatique bilingue. Le navigateur peut transmettre l’audio à son service de reconnaissance. Si le micro n’est pas supporté, les commandes écrites restent disponibles. Les commentaires et réponses sont des voix synthétiques, pas des enregistrements réels.

Les ordres tactiques se placent dans `DriverAgent`, derrière les priorités de sécurité et de récupération. `NeuralSteering` garde la direction issue du réseau et ajuste seulement la vitesse désirée selon l’intention ; sa force reste bornée par `maxForce`, puis la locomotion de `Vehicle` l’applique. Le pilotage clavier garde sa priorité. Les procédures de stands réutilisent `requestPit`. Durée : secondes simulées, non secondes murales. Les messages sont suivis sans rejeu, avec une file vocale bornée, audio désactivé au chargement et arrêt du micro avant changement de séance.

## Vue 3D, projection et rendu

Le modèle de mouvement reste inchangé. `f1Model3d.js` est une fabrique de géométrie et de matériaux PBR Three.js r180 : ailerons, corps profilé, cockpit, halo, roues et numéros. Les coordonnées de l’asset sont en mètres. La course applique une échelle illustrative de huit unités de simulation par mètre ; cela ne redimensionne jamais les collisions ni la physique.

`RaceScene3D` est un service de rendu, pas une entité du monde. Il relie chaque `GrandPrixCar` existant à un groupe de meshes. Positions `(x,y)` deviennent `(x,-y,0)` et l’orientation devient `-heading` autour de Z. Le décor p5 mis en cache devient une texture sur un plan ; le circuit reste un tracé géographique illustratif, sans relief modélisé. La Safety Car et les membres d’équipe visualisent leurs instances Vehicle existantes.

La projection orthographique suit les paramètres de `BroadcastRenderer`. La caméra perspective suit la voiture par interpolation graphique seulement. Le picking utilise une intersection rayon/plan, puis sélectionne la voiture la plus proche. Les sondes du debug lisent les points calculés par la simulation ; aucun scan n’est déclenché par le rendu. Le contrôle clavier reste sur le canvas p5. La perte du contexte WebGL laisse le rendu 2D p5 disponible.

`garage3d.js` présente le même asset avec sélection de livrée, éclairage de studio et rotation par pointeur ou flèches. `platform.css` partage navigation, hiérarchie, contrôles, focus et adaptations d’écran entre Course, Garage et Entraînement. Aucun entraînement n’est lancé par le rendu ou la navigation.

## Chaîne radio locale et interface de transmission

`RadioAudio` reçoit une parole WAV du service Windows local 8766. La chaîne filtrée (passe-haut, passe-bas, compresseur, saturation douce) est mélangée avec la voix claire selon le curseur d’effet, puis envoyée au gain général. Le souffle et les bips sont générés uniquement pendant une transmission, avec enveloppes d’ouverture/fermeture. Sources, requêtes et callbacks sont annulés avec un numéro de version ; les caches de texte/audio et la file sont bornés.

La synthèse du navigateur ne donne pas son PCM au graphe Web Audio. Elle est donc un repli explicitement annoncé « sans filtre », notamment pour le français en l’absence d’une voix Windows française. Le mode anglais local utilise une voix synthétique Windows, sans imitation de pilote ou enregistrement officiel. Micro et écoute restent opt-in ; les sous-titres restent disponibles sans audio. La touche R commence une prise de parole, son relâchement termine la dictée ; aucune commande vocale ne confirme un ordre.

`TrainingPresentation` transforme les relevés en lectures d’interface sans modifier le calcul : étape actuelle, fraction bornée, temps écoulé, nombre de pilotes, mémoire allouée. Une fin de calcul affiche la barre complète ; une erreur conserve le dernier instantané partiel avec un état distinct. Les réglages et le suivi deviennent deux vues sélectionnables sur petit écran. Un verrou temporaire de fichier Windows déclenche un retry borné du remplacement atomique du statut, sans tronquer l’ancien fichier.

## Fiabilité de l’entraînement et télémétrie individuelle

`CircuitRollout` publie une entrée de preview par pilote avec positions, état vivant, orientation, progression et capteurs du candidat en tête. Les origines/orientations de sondes sont copiées lors du scan tous les six ticks. Le rendu reste une lecture de diagnostics GPU, sans modifier les entités Vehicle de la course. Les statistiques finales distinguent minimum, médiane, maximum, survie et progression du champion selon la fitness.

`TrainingPresentation.preview` refuse d’attribuer un ancien relevé du premier pilote à un autre ; `series` groupe les scores par circuit et fraction de départ. Le contrôleur d’interface conserve les erreurs d’action malgré le polling. La sélection des circuits est validée contre les observations disponibles ; l’objectif est passé explicitement au processus.

`replace_snapshot` partage les retries bornés de remplacement Windows entre JSON et bundle JS. `save_warmstart` exporte seulement les époques achevées lorsque l’utilisateur demande l’arrêt, avec compteurs par pilote et validation fraîche. La reprise conserve les poids et réinitialise Adam : ce n’est pas un checkpoint complet d’optimiseur. Aucune procédure de vérification ne lance un entraînement utilisateur.


## Relation Course, Garage et Entraînement

`gp/platformState.js` conserve le pilote sélectionné (`apex-selection`) et un brouillon validé de préparation (`apex-training`) : pilotes, circuits, objectif, huit poids et paramètres numériques. Un brouillon corrompu est ignoré. `gp/workflow-ui.js` transporte le pilote dans les liens ; une ouverture explicite avec `?driver=4` sélectionne ce pilote pour l’entraînement, sans lancer de calcul. Le brouillon des poids survit aux changements d’écran. La configuration du week-end est partagée via `apex-garage` ; le circuit sauvegardé est proposé pour l’évaluation s’il est disponible dans le service GPU. Une sélection de circuits devenue invalide revient aux circuits disponibles.

`gp/modelRepository.js` relit le manifeste et les JSON individuels avec cache désactivé, valide les tenseurs et l’identité, puis remplace la banque seulement après validation de tous les fichiers demandés. Garage propose une actualisation et Course relit les exports avant un nouveau week-end. Une erreur empêche un nouveau départ ; une session précédente est conservée. Chaque voiture copie ses tenseurs à la construction : une nouvelle sauvegarde ne change pas son réseau pendant la course. L’inspecteur d’entraînement relit aussi les exports ; ce rendu ne lance aucun apprentissage.

Les poids de séparation, évitement et bordures présents dans les métadonnées du modèle initialisent le gestionnaire de chaque voiture. Les anciens exports sans ces poids conservent les valeurs par défaut. Les curseurs de course restent des ajustements explicites pour la session.

Le freinage neuronal utilise la distance physique disponible et la vitesse projetée du véhicule devant, même s’il a un tour de retard. Les capteurs utilisent le rayon réel, ignorent les entités supprimées et distinguent la voie des stands. Une bordure frontale limite la vitesse par la distance de freinage ; sa correction choisit le côté le plus dégagé et reste bornée. Le mode expert conserve sa négociation existante des voies et de l’ordre sur le circuit, nécessaire dans les épingles. Aucun déplacement direct, aucune trajectoire de secours ni modification de `vehicle.js`.

Validation de cette évolution : `node --test tests/*.test.mjs` depuis cet exemple, **143 tests réussis**. Le navigateur avec le vrai p5.js a vérifié les 22 identités de modèles, les forces bornées, le pilote commun, le retour au brouillon des poids, l’inspecteur du bon pilote et le garage 3D. Aucun entraînement lancé. Le service CUDA n’était pas disponible pendant cette vérification ; le message de reconnexion est conservé. Les réseaux actuels peuvent encore sortir de piste : ces corrections de sécurité ne constituent pas un réentraînement ni une garantie de tour complet.

Fichiers créés : `gp/platformState.js`, `gp/modelRepository.js`, `gp/workflow-ui.js`, `tests/workflow.test.mjs`, `tests/traffic-safety.test.mjs`.
Fichiers modifiés : `gp/sensors.js`, `gp/neuralSteering.js`, `gp/car.js`, `gp/app.js`, `gp/broadcast.js`, `gp/garage.js`, `gp/training-ui.js`, `gp/platform.css`, `index.html`, `garage.html`, `training.html`, `tests/weekend.test.mjs`, `agent.md`, `architecture.md`, `gp/README.md`.
