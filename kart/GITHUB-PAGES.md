# Publication GitHub Pages

Le jeu est publié à l’adresse https://soubaibiomar.github.io/Kart-clash/.

Le workflow `.github/workflows/pages.yml` s’exécute après un push sur `main`, ou manuellement depuis Actions. Il exécute les tests JavaScript et les tests Python de construction/publication, construit `dist/kart-clash`, puis publie uniquement ce dossier avec les actions officielles GitHub Pages. Le job de déploiement seul reçoit les permissions Pages et OpenID nécessaires.

Dans Settings → Pages, la source doit être **GitHub Actions**. Le statut de publication et ses erreurs éventuelles se trouvent dans Actions → Deploy Kart Clash to GitHub Pages. Un échec des tests empêche la publication.

## Disponible en ligne

Conduite 3D, modes de course et combat, éditeur de circuits avec ponts et tunnels, réglages, sauvegardes navigateur, import/export JSON et essais locaux de réseaux compatibles. Les liens de ressources sont relatifs pour fonctionner sous `/Kart-clash/`.

## Entraînement CUDA

GitHub Pages sert des fichiers statiques. Il n’exécute ni Python, ni CUDA, ni le service du port 8871. Pour entraîner sur la RTX 4060, lancer le jeu et le service localement selon le README. Les restrictions d’origine de l’API locale restent inchangées ; la page publique n’a pas accès à ce service.

Les modèles et circuits conservés sur `127.0.0.1` ne sont pas automatiquement présents sur `soubaibiomar.github.io`. Exporter un projet JSON depuis la version locale, puis l’importer sur le site public. Aucune synchronisation cloud n’est ajoutée.

## Vérification reproductible

```powershell
node --test tests/*.test.mjs
python -m unittest discover -s tests -p 'test_kart*.py'
python kart/build-frontend.py
```

Les tests de l’Académie CUDA restent exécutés localement dans leur environnement adapté. Ils ne sont pas lancés par l’hébergement du jeu.
