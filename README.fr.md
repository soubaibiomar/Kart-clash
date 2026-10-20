# Kart Clash · Rival Academy

**Construisez votre circuit. Conduisez votre kart. Regardez votre réseau apprendre.**

[Français](README.fr.md) · [English](README.en.md)

Kart Clash réunit un jeu de combat de karts en 3D, un éditeur de routes et une académie de conduite autonome. Affrontez des bots locaux, assemblez des circuits avec ponts et tunnels, puis entraînez des réseaux neuronaux sur GPU. Le projet explore les steering behaviors dans une expérience jouable dans le navigateur.

> Le jeu fonctionne sans CUDA. L’apprentissage démarre uniquement sur demande depuis l’Académie IA. Aucun multijoueur en ligne n’est implémenté.

## Fonctionnalités

- **Combat arcade** : six objets, bots locaux, dérapage et turbo gagné en conduite Arcade ; chacun pour soi ou capture du noyau.
- **Circuits personnels** : lignes droites, virages, rampes, ponts, tunnels, largeur réglable, poignées et outils avancés.
- **Quartiers urbains** : routes entre les bâtiments, chaussées à plusieurs niveaux et caméras de conduite.
- **Académie IA** : réseaux indépendants, capteurs de bordures, activations, fitness et suivi 3D.
- **Projets persistants** : objectif, circuit exact et réseau sauvegardés ensemble, export/import JSON.
- **Comparaison et chronos** : essais de champions sous conditions identiques, records manuels, secteurs et fantôme compatible.

## Démarrage rapide

Prérequis : Git, Python, Node.js et un navigateur de bureau avec WebGL. Aucun framework frontend ni installation npm n’est nécessaire. Ces commandes ciblent PowerShell sous Windows ; adaptez le chemin au besoin.

```powershell
git clone https://github.com/soubaibiomar/Kart-clash.git C:\Kart-clash
Set-Location C:\Kart-clash
python kart/build-frontend.py
python -m http.server 8870 --bind 127.0.0.1
```

Ouvrez [Kart Clash](http://127.0.0.1:8870/dist/kart-clash/index.html#play) et gardez le terminal ouvert. Utilisez cette adresse HTTP plutôt qu’un double-clic sur le fichier HTML : le rendu utilise des modules JavaScript. Après modification des sources, reconstruisez avec `python kart/build-frontend.py`, puis rechargez la page.

## Commandes

| Touche | Action |
| --- | --- |
| ↑ / ↓ | Accélérer ; freiner puis reculer |
| ← / → | Tourner |
| Espace | Utiliser l’objet équipé ; maintenir pour la rafale |
| Maj + virage | Déraper ; en Arcade, maintenir un dérapage valide puis relâcher Maj pour gagner un turbo |
| C | Changer de caméra |
| D | Afficher ou masquer les diagnostics |
| Échap | Pause / reprise |

Les raccourcis respectent les champs de saisie. Les touches tenues sont effacées à la pause et à la perte de focus. La conduite nécessite un clavier ; les menus sont adaptatifs, mais la conduite tactile n’est pas disponible.

## Jouer

**Chacun pour soi** et **Capture du noyau** utilisent des bots locaux. Sept défis illustrent parking, slalom, interception, fuite, escorte, convoi et patrouille. Le Garage conserve personnage et couleur ; les Réglages contrôlent son, qualité, caméra et profil de conduite.

Les objets sont la roquette, le missile guidé, la mine, la rafale, le bouclier et le turbo. Leurs statistiques diffèrent entre Classique et Arcade ; l’interface lit les règles du profil actif. Les mines détectent après armement et tiennent compte du couvert et de l’étage.

## Construire un circuit

1. Ouvrez **Circuits**, puis **Créer un circuit vide**, ou chargez un exemple facultatif.
2. Choisissez une portion, réglez ses dimensions et ajoutez-la. Ajustez la route avec les poignées ou les outils avancés.
3. Ajoutez ponts ou tunnels, inspectez les hauteurs, puis fermez la boucle si nécessaire. Rouvrez une boucle avant de la prolonger.
4. Utilisez **Enregistrer mon circuit**, **Conduire en 3D** ou **Entraîner sur ce circuit**.

**Lire le tracé** mesure longueur 3D, altitudes, pentes et angles. Ses repères sont des conseils géométriques, pas une garantie de praticabilité ni une ligne de course fournie à l’IA. Terrain, pente, hauteur et dégagement aux croisements restent contrôlés.

Les parcours manuels disposent de chronos, secteurs et d’un fantôme du record lorsqu’une trace compatible a été conservée. Les records comparent une géométrie et des paramètres de conduite identiques.

## Académie IA et GPU — facultatif

L’académie génétique s’inspire de l’exemple pédagogique 9 du dépôt d’origine : les distances aux bordures entrent dans un réseau qui produit direction et vitesse. La progression alimente la fitness ; sélection, mutations gaussiennes et conservation d’un parent élite produisent la génération suivante. Les candidats ont leurs propres réseaux et essais ; ils ne se percutent pas entre eux.

**Répartition des calculs :** CUDA exécute les réseaux, la sélection et les mutations. Physique, capteurs et collisions utilisent le moteur JavaScript partagé sur CPU. Les essais de champions et comparaisons dans le navigateur sont des inférences CPU. Augmenter les cycles accélère le temps simulé, sans fabriquer une meilleure vitesse apprise.

### Installer le service sous Windows

Créez l’environnement attendu par le lanceur :

```powershell
python -m venv gp/training/.venv
.\gp\training\.venv\Scripts\Activate.ps1
```

Installez une version CUDA compatible de PyTorch en suivant le [sélecteur officiel PyTorch](https://pytorch.org/get-started/locally/). Exécutez sa commande dans l’environnement activé, puis vérifiez :

```powershell
python -c "import torch; print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CUDA indisponible')"
```

Dans un second terminal, depuis la racine du projet :

```powershell
.\kart\academy\start.ps1
```

Le service écoute sur `127.0.0.1:8871`. Dans **Académie IA**, choisissez circuit, population, capteurs, couches cachées, mutations et budget, puis cliquez sur **Lancer la population**. Démarrer le service ou ouvrir la page ne lance aucun entraînement. L’ancien atelier d’imitation et de combat reste accessible séparément.

La RTX 4060 a servi aux validations locales. Un autre système nécessite son installation CUDA compatible. L’apprentissage reste expérimental : un calcul terminé ne garantit ni un tour réussi ni la généralisation à d’autres circuits.

## Sauvegarder et réutiliser un pilote

Dans l’Académie, **Garder ce pilote pour plus tard** permet de renseigner un nom et un objectif, puis d’enregistrer le projet. Avec un champion chargé, le projet conserve **objectif, circuit exact, configuration et poids du réseau**. Sans champion, il conserve le circuit seul.

Dans **Mes projets** :

- **Conduire ce circuit** ouvre la route au clavier.
- **Voir mon pilote** ouvre l’essai 3D du réseau enregistré, sans apprentissage.
- **Exporter / Importer** transporte le projet dans un fichier JSON ; l’import est limité à 2 Mo.

Le texte d’objectif décrit votre intention ; il ne modifie pas la fitness. Un réseau de bordures n’est pas un bot de combat. La sauvegarde conserve le réseau utilisable, **pas la population entière ni un point de reprise d’un calcul GPU interrompu**.

Les sauvegardes locales dépendent du navigateur et de l’origine HTTP : `localhost` et `127.0.0.1` ne partagent pas leur stockage. Vider les données du navigateur peut les effacer. Exportez vos projets importants. Les noms de projets dupliqués sont refusés plutôt qu’écrasés.

## Architecture

```text
index.html                 Entrée du jeu
vehicle.js                 Locomotion et comportements de base protégés
kart/entities/             Entités dérivées de Vehicle
kart/                      Jeu, rendu, éditeur, sauvegardes et interfaces IA
kart/academy/              API locale, entraînement Python et workers Node
gp/vendor/, gp/fonts/      Dépendances de rendu et typographies
libraries/                 p5.js
tests/                     Tests JavaScript et construction Python
dist/kart-clash/            Livraison générée, ignorée par Git
```

Le moteur sépare perception, décision, steering et locomotion. Les comportements retournent des forces bornées, appliquées par `applyForce()` et la mise à jour héritée. Les 21 classes d’entités héritent directement ou indirectement de `Vehicle` ; le fantôme est une entité de présentation hors collisions. Interface, caméra, audio et diagnostics restent des services distincts.

`vehicle.js` reste inchangé. Consultez [les consignes](agent.md) et [l’architecture](architecture.md) avant de modifier le moteur. Les pages F1, steering et serpent sont des laboratoires historiques conservés ; elles ne sont pas l’entrée de Kart Clash.

## Tests

Depuis la racine du dépôt :

```powershell
node --test tests/*.test.mjs
python -m unittest discover -s tests -p test_kart_build.py
.\gp\training\.venv\Scripts\python.exe -m unittest discover -s kart/academy -p "test_*.py"
```

La suite actuelle comprend **376 tests JavaScript**, **3 tests Python de construction** et **29 tests Python de l’Académie**. Ces derniers nécessitent l’environnement Python adapté ; leurs fixtures temporaires ne lancent pas d’entraînement utilisateur.

Rapports : [projets sauvegardés](kart/SAVED-PROJECTS-VALIDATION.md), [apprentissage génétique 3D](kart/EVOLUTION-3D-VALIDATION.md), [éditeur personnel](kart/PERSONAL-TRACK-VALIDATION.md), [comparaison](kart/COMPARISON-VALIDATION.md), [caméras](kart/CAMERA-VALIDATION.md).

## Dépannage

| Symptôme | Vérification |
| --- | --- |
| Les modifications n’apparaissent pas | Reconstruire la livraison et recharger sans cache. |
| Service IA inaccessible | Lancer `kart/academy/start.ps1` et vérifier le port 8871. Le jeu reste jouable sans ce service. |
| CUDA indisponible | Vérifier le Python utilisé, la version CUDA de PyTorch et le pilote NVIDIA. |
| Sauvegarde absente | Utiliser le même navigateur, la même adresse et le même port ; importer votre export si nécessaire. |
| Circuit refusé | Corriger les points, pentes, limites et dégagements signalés par l’éditeur. |
| Rendu lent | Choisir la qualité Fluide, réduire la population affichée ou masquer les capteurs. |

## Limites et licence

Conduite arcade attachée à la chaussée : pas de simulation automobile homologuée, de saut libre, de circulation civile ou de multijoueur réseau. Les performances et la réussite des réseaux dépendent des circuits, réglages et matériels.

Le code du projet est distribué selon la [licence du dépôt](LICENSE). Les dépendances et données tierces conservent leurs notices : [Three.js](gp/vendor/THREE-LICENSE.txt), [polices](gp/fonts/OFL.txt), [circuits du laboratoire F1](gp/CIRCUIT-LICENSE.txt). Les modèles historiques nécessaires aux laboratoires sont conservés ; les environnements Python, données de session et sorties de calcul locales sont exclus.
