# Kart Clash · Rival Academy

**Build your track. Drive your kart. Watch your neural network learn.**

[Français](README.fr.md) · [English](README.en.md)

Kart Clash combines a 3D kart combat game, a road editor and an autonomous driving academy. Play against local bots, build tracks with bridges and tunnels, and train neural networks on your GPU. The project explores steering behaviors through a playable browser experience.

> Playing does not require CUDA. Training starts only when explicitly launched from the AI Academy. Online multiplayer is not implemented.

## Features

- **Arcade combat:** six item types, local bots, drifting and earned boosts in Arcade; free-for-all or core capture.
- **Custom tracks:** straights, corners, ramps, bridges, tunnels, adjustable width, handles and advanced tools.
- **City environments:** roads between buildings, multiple road levels and driving cameras.
- **AI Academy:** independent networks, border sensors, activations, fitness and a live 3D view.
- **Saved projects:** keep a goal, exact track and network together; export/import JSON.
- **Comparisons and timing:** matching-condition champion trials, manual records, sectors and compatible personal-best ghosts.

The application currently uses French interface labels. This guide includes those labels to help you find controls.

## Quick start

You need Git, Python, Node.js and a desktop browser with WebGL. No frontend framework or npm installation is required. These commands target Windows PowerShell; change the checkout path if needed.

```powershell
git clone https://github.com/soubaibiomar/Kart-clash.git C:\Kart-clash
Set-Location C:\Kart-clash
python kart/build-frontend.py
python -m http.server 8870 --bind 127.0.0.1
```

Open [Kart Clash](http://127.0.0.1:8870/dist/kart-clash/index.html#play) and keep the terminal running. Use this HTTP address instead of opening the HTML file directly: rendering uses JavaScript modules. After editing sources, run `python kart/build-frontend.py` again and reload the page.

## Controls

| Key | Action |
| --- | --- |
| Up / Down arrows | Accelerate; brake, then reverse |
| Left / Right arrows | Steer |
| Space | Use the equipped item; hold for rapid fire |
| Shift while turning | Drift; in Arcade, hold a valid drift and release Shift to earn a boost |
| C | Switch camera |
| D | Toggle diagnostics |
| Escape | Pause / resume |

Shortcuts respect text inputs. Held keys are cleared when paused or when focus is lost. Driving requires a keyboard; menus are responsive, but touch driving controls are not available.

## Play

**Chacun pour soi** is free-for-all and **Capture du noyau** is team core capture, both against local bots. Seven challenges demonstrate parking, slalom, interception, escape, escort, convoy and patrol behaviors. The Garage stores your character and color. Settings control sound, rendering quality, camera and driving profile.

Items include rockets, homing missiles, mines, rapid fire, shields and boosts. Classic and Arcade use different statistics; the HUD reads the active profile’s rules. Mines detect karts after arming and account for cover and road level.

## Build a track

1. Open **Circuits**, then **Créer un circuit vide**, or load an optional example.
2. Choose a road piece, adjust its dimensions and add it. Reshape the road with handles or advanced tools.
3. Add bridges or tunnels, inspect elevations, and close the loop if wanted. Reopen a loop before extending it.
4. Use **Enregistrer mon circuit** to save, **Conduire en 3D** to drive, or **Entraîner sur ce circuit** to prepare training.

**Lire le tracé** reports 3D length, elevations, grades and corner angles. These are geometric hints, not a driveability guarantee or a racing line supplied to the AI. Terrain bounds, grades, elevation and crossing clearances remain validated.

Manual runs include timing, sectors and a personal-best ghost when a compatible recording has been retained. Records compare matching track geometry and driving settings.

## AI Academy and GPU — optional

The genetic academy follows the approach of educational example 9 from the original repository: border distances enter a network that outputs direction and speed. Progress contributes to fitness; selection, Gaussian mutations and an elite parent produce subsequent generations. Candidates own their networks and trials; they do not collide with each other.

**Compute split:** CUDA runs network inference, selection and mutations. Physics, sensors and collisions use the shared JavaScript engine on CPU. Browser champion tests and comparisons run CPU inference. Increasing cycles speeds up simulated time; it does not manufacture learned speed.

### Set up the Windows service

Create the environment expected by the launcher:

```powershell
python -m venv gp/training/.venv
.\gp\training\.venv\Scripts\Activate.ps1
```

Install a compatible CUDA build using the [official PyTorch installation selector](https://pytorch.org/get-started/locally/). Run its command inside the activated environment, then verify:

```powershell
python -c "import torch; print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CUDA unavailable')"
```

In a second terminal, from the project root:

```powershell
.\kart\academy\start.ps1
```

The service listens on `127.0.0.1:8871`. In **Académie IA**, choose the track, population, sensors, hidden layers, mutations and budget, then click **Lancer la population**. Starting the service or opening the page never starts training. The older imitation/combat workshop remains separately accessible.

Local GPU validation used an RTX 4060. Other systems require their own compatible CUDA setup. Learning is experimental: completing a job does not guarantee a successful lap or generalization to other tracks.

## Save and reuse a driver

In the Academy, **Garder ce pilote pour plus tard** lets you name a project, describe a goal and save it. With a champion loaded, the project keeps the **goal, exact track, network configuration and weights** together. Without a champion, it keeps the track only.

From **Mes projets**:

- **Conduire ce circuit** starts keyboard driving on the saved road.
- **Voir mon pilote** opens the saved network’s 3D trial without training.
- **Exporter / Importer** transfers the project as JSON; imports are limited to 2 MB.

The goal text describes your intent; it does not alter fitness. A border-driving network is not a combat bot. Saving keeps the usable network, **not the full population or a checkpoint for resuming an interrupted GPU job**.

Local saves belong to the browser and HTTP origin: `localhost` and `127.0.0.1` have separate storage. Clearing browser data can erase them. Export important projects to retain them elsewhere. Duplicate project names are rejected rather than overwritten.

## Architecture

```text
index.html                 Game entry point
vehicle.js                 Protected base locomotion and steering code
kart/entities/             Entities derived from Vehicle
kart/                      Gameplay, rendering, editor, storage and AI interfaces
kart/academy/              Local API, Python training and Node workers
gp/vendor/, gp/fonts/      Rendering dependencies and fonts
libraries/                 p5.js
tests/                     JavaScript tests and Python build tests
dist/kart-clash/            Generated frontend package, ignored by Git
```

The engine separates perception, decisions, steering and locomotion. Behaviors return bounded forces, applied through `applyForce()` and inherited integration. All 21 entity classes inherit directly or indirectly from `Vehicle`; the ghost is a presentation entity excluded from collisions. UI, cameras, audio and diagnostics remain separate services.

`vehicle.js` remains unchanged. Read the [development instructions](agent.md) and [architecture](architecture.md) before modifying the engine. Historical F1, steering and snake labs remain in separate pages; they are not the Kart Clash game entry point.

## Tests

Run from the repository root:

```powershell
node --test tests/*.test.mjs
python -m unittest discover -s tests -p test_kart_build.py
.\gp\training\.venv\Scripts\python.exe -m unittest discover -s kart/academy -p "test_*.py"
```

The current suites contain **376 JavaScript tests**, **3 Python build tests** and **29 Python Academy tests**. Academy tests require the appropriate Python environment; temporary fixtures do not launch user training.

Reports: [saved projects](kart/SAVED-PROJECTS-VALIDATION.md), [3D genetic learning](kart/EVOLUTION-3D-VALIDATION.md), [personal editor](kart/PERSONAL-TRACK-VALIDATION.md), [comparison](kart/COMPARISON-VALIDATION.md), [cameras](kart/CAMERA-VALIDATION.md). Detailed development reports are primarily in French.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Recent changes are missing | Rebuild the frontend and reload without cache. |
| AI service cannot be reached | Start `kart/academy/start.ps1` and check port 8871. Playing does not require this service. |
| CUDA is unavailable | Check the Python environment, PyTorch CUDA build and NVIDIA driver. |
| A save is missing | Use the same browser, address and port; import your export if needed. |
| A track is rejected | Fix the points, grades, bounds or clearances reported by the editor. |
| Rendering is slow | Select Fluide quality, reduce the displayed population or hide sensors. |

## Scope and license

Driving is arcade-style and attached to road surfaces. There is no certified automotive simulation, free-flight jumping, civilian traffic or network multiplayer. Performance and neural driving success depend on tracks, settings and hardware.

Project code is distributed under the [repository license](LICENSE). Third-party dependencies and data retain their notices: [Three.js](gp/vendor/THREE-LICENSE.txt), [fonts](gp/fonts/OFL.txt), [historical F1 circuits](gp/CIRCUIT-LICENSE.txt). Models needed by historical labs are retained; Python environments, session data and local training outputs are excluded.
