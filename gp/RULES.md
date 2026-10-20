# Règles : couverture et limites

Cette version est une simulation pédagogique 2D. Elle ne reproduit **pas l’intégralité du règlement FIA**. Cette page distingue les règles appliquées des simplifications et du travail restant.

Référence vérifiée : [FIA, règlement sportif 2026, section B, édition 07 du 25 juin 2026](https://www.fia.com/system/files/documents/fia_2026_f1_regulations_-_section_b_sporting_-_iss_07_-_2026-06-25.pdf). Le logiciel ne surveille pas automatiquement les amendements ultérieurs.

## Appliqué dans la simulation

- Formats classique et Sprint ; séances distinctes, temps remis à zéro entre phases qualificatives et groupes éliminés conservés pour la grille.
- Horloges de base : essais 60 minutes, Q1/Q2/Q3 18/15/13, SQ1/SQ2/SQ3 12/10/8. Le mode compact réduit ces horloges ; le mode officiel conserve leurs valeurs. Le rythme 1×–16× est indépendant.
- Classement des séances selon les meilleurs tours valides réellement parcourus ; à temps égal, priorité au temps établi le premier.
- Grille de course issue des qualifications ; grille du Sprint issue de SQ ; le Sprint ne détermine pas la grille du Grand Prix.
- Départ avec feux et réactions individuelles ; formation optionnelle ; aucune commande clavier ne court-circuite les feux.
- Drapeaux jaune, bleu, SC, VSC, rouge et à damier ; limitation d’allure et suspension des annonces de dépassement sous neutralisation.
- Drapeau rouge : retour physique aux stands, attente et reprise contrôlée. Une reprise prématurée est refusée.
- Passage sous damier au premier franchissement de la ligne après l’arrivée du leader ; classement selon les tours puis le temps corrigé. Seuil de classification à 90 % arrondi aux tours entiers.
- Barèmes de points course et Sprint, sans point de meilleur tour.
- Pneus secs/pluie, usure, température, changement de gomme et disponibilité des trains ; deux gommes sèches distinctes requises pour les courses d’au moins trois tours, avec exception après utilisation de pneus pluie. L’absence de seconde gomme entraîne une disqualification. Les démonstrations plus courtes sont explicitement exemptées.
- Limite de vitesse dans la voie des stands, temps de service, contrôle de sortie, avertissements de limites de piste, invalidation de tours et pénalités de temps.
- Option de distance complète calculée à partir de la longueur géographique du circuit ; distance personnalisée également disponible.

## Simplifié ou partiel

| Sujet | Limite actuelle |
|---|---|
| SC / VSC | Allure bornée et ordre de référence ; pas le système FIA complet de deltas minimum par secteur, de lignes SC ou de dédoublement des retardataires. |
| Jaune | Contrôle global de la piste ; pas de secteurs de commissaires locaux ni distinction automatique simple/double jaune. |
| Rouge | Horloge gelée dans toutes les séances, y compris les essais ; reprise roulante contrôlée. Les exceptions d’horloge des essais et la procédure officielle de reprise arrêtée ne sont pas reproduites. |
| 107 % | Seuil évalué en Q1/SQ1 et signalé dans les résultats comme nécessitant une décision ; les décisions discrétionnaires des commissaires ne sont pas automatisées. |
| Pneumatiques | Stocks pédagogiques par séance ; pas l’allocation FIA complète, les restitutions, les règles de gomme SQ ni les dispositions particulières de Monaco. |
| Parc fermé | Le réglage crée un nouveau week-end ; pas de contrôle complet des modifications interdites ni de départ imposé depuis les stands. |
| Pénalités | Temps et disqualification disponibles ; pas toutes les procédures de drive-through, stop-and-go, points de licence, appels et sanctions de grille cumulées. |
| Arrivée / points | Distance personnalisée ; pas les limites de durée officielles, interruptions définitives, résultats rétroactifs ou barèmes de points réduits. |
| Essais / qualifications | Libération initiale sur grille et décisions de pilotage simplifiées, pas un programme d’ingénierie complet avec carburant et relais planifiés. Une limite de 120 secondes termine les voitures bloquées après expiration, sans inventer de temps de tour. |
| Circuits | Tracés géographiques complets ; largeurs, secteurs, stands et décor sont illustratifs. Pas de relevé homologué, d’élévation physique ni de gestion de niveau au croisement de Suzuka. |
| Saison | 24 sites initialement annoncés disponibles ; pas une gestion automatique du calendrier révisé ou du championnat complet. |
| Règles techniques | Aéro et énergie 2026 approximatives, option DRS historique séparée. Pas de conformité technique/financière, de contrôle de masse, de débit de carburant ou de parc moteur. |

Ces sujets restent des étapes identifiées pour une reproduction plus complète. Les noms réels des pilotes ne rendent pas les réglages de conduite officiels : les profils sont des interprétations éditoriales de gameplay.

Sources d’identité : [équipes et pilotes F1 2026](https://www.formula1.com/en/teams), [numéros 2026](https://www.formula1.com/en/latest/article/all-the-2026-f1-driver-numbers-confirmed-in-full.5rh7o9mPntG7NerzVk9onc). Géométrie et licence : [CIRCUIT-SOURCE.md](CIRCUIT-SOURCE.md).
