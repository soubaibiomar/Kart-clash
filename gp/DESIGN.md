# APEX Neural Racing — jeu, garage, entraînement

## HUD de course compact

Évolution UI/UX : la structure HTML contient désormais `race-toolbar` et `race-console`. La première regroupe état de séance, vues, direction et radio. La seconde regroupe circuit, lancement et télémétrie, hors de la surface de rendu. Le canvas est redimensionné entre ces deux régions ; ce sont ses dimensions réelles, pas un recouvrement graphique. Sur mobile, la barre d'outils occupe deux lignes et la console se replie en une colonne. Aucun changement de commandes, modèles ou règles de course.

`race-hud.css` compose l'écran de course : classement compact à gauche, vues centrées en haut, direction et radio à droite, télémétrie horizontale en bas. Le message de grille est regroupé près du lancement, sans masquer le centre du circuit. Les commandes des stands restent dans la télémétrie sur grand écran. Les contrôles radio et direction conservent leur ouverture exclusive ; sur mobile leur panneau masque les éléments situés derrière lui. Les libellés fonctionnels restent à 11 px minimum.

## Direction visuelle : course 3D et menus charbon

Référence fournie par l'utilisateur : présentation sombre neutre et vignette de jeu F1. Le choix confirmé porte sur les deux. Les pages conservent Barlow, leur navigation et leurs actions ; les surfaces opaques charbon, le texte clair et un rouge d'action contrasté rapprochent les menus de cette référence. Le décor et la caméra portent l'immersion pendant la course.

`cinematic.css` centralise cette finition sur Course, Garage et Entraînement. `raceScenery3d.js` construit vibreurs instanciés, barrières, tribunes illustratives, portique de départ, ciel et ombres de contact. La caméra arrière est plus basse et proche. Le modèle de monoplace reçoit un vernis PBR, des roues plus rondes, un capot moteur et des rétroviseurs. Il reste un modèle procédural illustratif, sans assets du jeu EA ni promesse de photoréalisme.

Direction fixée par l’utilisateur : grande piste et interface discrète pendant la course ; garage et entraînement dans des écrans séparés. Le tableau de bord précédent est remplacé, pas simplement recoloré.

- Course : canvas occupant la fenêtre, cinq positions compactes extensibles, pilote/vitesse en bas, commandes secondaires repliées. Le joueur entre directement dans l’expérience.
- Garage : choix du circuit et du week-end, liste des 22 pilotes et de leurs modèles. Les styles restent des interprétations de jeu, les métadonnées d’apprentissage sont réelles.
- Entraînement : état CUDA réel, sélection des pilotes, paramètres de population/générations, courbes issues du journal réel, démarrage et arrêt explicites. Aucune animation ne simule un entraînement inexistant.
- Navigation persistante entre les trois pages. Fond de course discret, interface neutre sombre, accent rouge, police Barlow locale.
- Contrastes lisibles, tailles fonctionnelles d’au moins 12 px, focus visible, commandes clavier hors champs de saisie, mises en page adaptées.
- L’ancien écran broadcast est conservé séparément dans broadcast-lab.html.

## Évolution demandée : voitures 3D et interface

Les deux caméras sont fixées par l’utilisateur : vue du dessus et vue perspective derrière la voiture. La course conserve la piste plein écran ; le sélecteur de caméra est visible en permanence, le classement reste compact, la télémétrie se place à droite et les panneaux radio/direction sont mutuellement exclusifs. Sur petit écran, la télémétrie passe en bas et les panneaux s’ouvrent sur la largeur disponible.

Le garage présente la monoplace interactive avant les réglages. L’entraînement conserve ses vraies données et rend le statut GPU et les commandes de lancement/arrêt accessibles dès le début. Identité conservée : Barlow local, surfaces charbon, accent rouge, mesures alignées. Les voitures sont des modèles stylisés procéduraux, pas des reproductions homologuées ni des assets officiels.

## Radio et entraînement : simplification de l’usage

La radio privilégie le destinataire, l’état du canal, la phrase et sa confirmation. Trois raccourcis préparent un ordre sans l’exécuter ; les options de ciblage, pneus et traitement sonore sont repliées. L’état réception/émission provient du vrai flux, sans faux oscilloscope. Sous-titres horodatés, volume accessible, test explicite. Sur petit écran, ouvrir la radio masque les contrôles situés derrière le panneau.

La préparation de course prend moins de hauteur ; cliquer un pilote du garage affiche sa monoplace. L’entraînement place la machine, l’état courant et la progression réelle avant les paramètres. Recherche des pilotes, sélection partielle explicite et bascule préparation/suivi complètent l’usage sur petit écran.
