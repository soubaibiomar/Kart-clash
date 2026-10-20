# Entraînement depuis la plateforme

La page `http://127.0.0.1:8765/training.html` lance le calcul local sur la RTX 4060 uniquement après un clic utilisateur. Le service peut fonctionner sans cette conversation. Aucun appel à GPT ou à une API distante n’est utilisé.

## Relancer

```powershell
& .\5-3-PathFollowingComplex\gp\training\start.ps1
```

Le lanceur démarre uniquement le serveur et ouvre le jeu. Il ne démarre jamais d’entraînement. Dans Entraînement : choisir les pilotes, régler les paramètres, conserver « Reprendre les modèles existants » pour continuer, puis cliquer « Lancer sur le GPU ». « Arrêter proprement » est pris en compte à une étape sûre ; les derniers modèles exportés sont conservés.

## Environnement installé

Python 3.14, PyTorch 2.14.1+cu126, CUDA 12.6 et RTX 4060 Laptop GPU 8 Go. Le moteur compatible a été réutilisé depuis le cache local dans un environnement isolé `.venv`. Aucun paquet global ni pilote NVIDIA n’a été remplacé. Les versions et le GPU sont également inscrits dans chaque modèle.

Pour reconstruire ailleurs, utiliser une version CUDA compatible proposée par https://pytorch.org/get-started/locally/ dans un environnement virtuel et installer NumPy. Le moteur refuse de remplacer silencieusement CUDA par le CPU. `--device cpu` est réservé aux essais explicitement demandés.

Les observations locales sont générées par `node gp/training/collect.mjs` depuis le dossier de l’exemple. Le jeu charge uniquement les exports JSON/JavaScript. `.venv`, observations, journaux, statut et checkpoints sont ignorés par Git ; les 22 modèles et leur manifeste sont conservés dans `gp/models`.

## Architecture et limites

MLP indépendant 18–36–2 par pilote ; imitation facultative sur CUDA puis populations séparées avec sélection et mutations. Les évaluations GPU utilisent les rayons et une intégration force/vitesse/position ; le dessin de la plateforme lit les relevés réels. Les premiers modèles restent expérimentaux et peuvent abandonner. Un entraînement supplémentaire ne garantit pas une maîtrise de tous les circuits.

Le moteur ne crée pas de nouveau processus à l’ouverture de la page. L’API est liée à 127.0.0.1, valide les valeurs et ne publie pas le dossier privé d’entraînement. Les modèles mis à jour s’appliquent lors de la prochaine ouverture/recréation de la course, pas au milieu d’un tour.
