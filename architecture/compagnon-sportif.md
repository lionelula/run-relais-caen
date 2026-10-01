# Compagnon sportif — analyse et état livré

## Analyse préalable

Projet statique HTML/CSS/JavaScript, sans compilation, base de données, authentification ni paiement. `map.js`, `routing.js`, `nearby.js` et `nearby-snapshot.json` portent la carte piétonne et ses 1 715 lieux. `styles.css`, `professionnels.css` et `plateforme.css` constituent l'identité graphique. `compte-sportif.html` était un aperçu sans persistance ; `comptes.js` conserve son rôle de démonstration pour les professionnels. Les prix et la séparation des tarifs professionnels doivent rester inchangés.

Les huit PDF sont désormais publics sur demande explicite du propriétaire. Leur publication n'est pas un contrôle d'abonnement. Les nouvelles fonctions locales restent gratuites ; les avantages et abonnements connectés demeurent annoncés comme futurs.

## Fonctionnel sans backend

- Navigation du 28 septembre : accueil avec trois entrées parcours / entraînement / après-sortie, accès direct à Mon espace, barre fixe à quatre destinations sur mobile. Les pages et les tarifs existants sont conservés.
- Questionnaire : sélection exacte de 2 à 5 jours de semaine. Le générateur retient un sous-ensemble réparti si la pratique actuelle limite le nombre de séances ; les jours retenus sont expliqués. La date de course reste prioritaire, les séances au-delà de l'échéance sont retirées. Les anciens plans ne sont pas recalculés et restent lisibles. `trainingDays` est facultatif dans les anciens enregistrements ; le nouvel algorithme s'identifie par `local-general-v2-days`.
- Carte : proposition d'une boucle de 2 à 20 km souhaités, direction facultative. Au plus quatre essais séquentiels utilisent le moteur piéton existant, avec deux étapes intermédiaires et retour au départ. Les points candidats ne sont jamais affichés comme un tracé. La longueur affichée vient du service ; un écart supérieur à 20 % est signalé. Une boucle peut partager des portions aller/retour et sa praticabilité dépend des données et des accès sur place. Aucune promesse de distance exacte, de parcours inédit ou de revêtement particulier. Modification des étapes et enregistrement local conservés.

- Questionnaire progressif running, validation des réponses et aperçu avant adoption. Les autres sports peuvent être enregistrés dans le profil, mais aucun programme n'est inventé pour eux.
- Programme déterministe fondé sur le volume actuel, la sortie habituelle et maximale, la fréquence réellement pratiquée, les créneaux disponibles, le niveau, la priorité et le délai. Le chrono est conservé comme souhait, avec signalement s'il exige une allure plus rapide qu'une référence récente ; il n'impose pas une vitesse d'entraînement. Les règles ne sont pas une évaluation de santé ni une validation d'entraîneur.
- Plan actif, semaine au calendrier, progression basée sur les seules cases cochées, séances restantes et prochaines. Les séances passées non cochées sont signalées sans proposition de rattrapage.
- Profil multisport, objectifs, activités manuelles, lieux/parcours favoris, brouillons d'événements et défis personnels persistés dans ce navigateur. Export JSON et suppression explicite. Aucune identité vérifiée, aucune synchronisation. Erreurs de stockage annoncées ; pas de message de réussite si l'écriture échoue.
- Une sortie liée à une séance remplace une saisie déjà liée, évitant le double comptage. Une case cochée seule ne crée pas de distance fictive. Supprimer une sortie liée réinitialise sa case.
- Après ma sortie : sélection manuelle d'un point, point d'arrivée d'un parcours ou coordonnées, rayon 500 m / 1 km / 2 km, liste et carte sur le relevé existant. Les catégories OSM connues restent distinctes des services vérifiés Run Relais, aujourd'hui absents. Date et attribution affichées ; aucune offre/partenaire inventé.
- Défis personnels du mois calculés sur les activités manuelles correspondant au sport et aux dates. Les sorties déjà saisies du mois sont incluses. Aucun participant, classement ou cadeau collectif fictif.

## Fichiers et responsabilités

- `loop-routes.js`, `loop-routes.test.cjs` : recherche bornée de boucles, contrôle de fermeture, annulation, limites de service et tests indépendants. `map.js` ajoute le mode boucle ; `routing.js` expose la limitation de requêtes pour éviter les répétitions.
- `plateforme.css` et les 14 pages HTML : navigation commune et barre mobile ; `accueil.html` remonte les outils avant les présentations du réseau.

- `sport-core.js` : fonctions pures et dépôt local versionné, exportable sous Node pour les tests. Pas de DOM ni de réseau.
- `sport-ui.js` : vues, formulaires, interactions et export du navigateur.
- `sport.css` : composants et responsive qui réutilisent les variables/polices du site.
- `questionnaire.html`, `mon-plan.html`, `apres-sortie.html`, `communaute.html` : nouvelles vues.
- `compte-sportif.html` : tableau de bord local, en remplacement de son ancien aperçu tout en conservant profil, favoris, parcours, avantages, abonnement et paiements futurs.
- `apres-sortie.js` : recherche locale et carte séparée, sans requête Overpass ; localisation ponctuelle facultative via `geolocation.js`.
- `sport-map.js` et événements `run-relais-route-ready/clear` dans `map.js` : sauvegarde explicite du parcours et lien vers l'après-sortie. La restauration d'un parcours valide ses arrêts puis utilise le calcul piéton existant.
- Accueil, connexion, choix de compte, formules sportifs et catalogue PDF : liens intégrés, sans remplacement des autres pages.
- `sport-domain.d.ts` complète `domain.d.ts` sans casser les contrats existants. `ActivityRecord` évite un conflit avec le type de sport `Activity` existant.

## Stockage et migration

Clé locale `run-relais-sport-v1`, `schemaVersion: 1`. L'état contient `profile`, `plan`, `goals`, `activities`, `favorites`, `eventDrafts`, `challenges`. Les identifiants locaux ne prouvent aucune identité. Ne jamais publier un export personnel dans ce dépôt public.

Le futur adaptateur API devra mapper `profile.sport/sports/sessions` vers `mainSport/activities/availableSessions`, associer les données locales à un utilisateur authentifié après consentement et gérer les conflits/idempotences. Le domaine peut être partagé avec une application mobile, mais la couche DOM et `localStorage` devront être remplacés par les composants et le stockage mobiles. Un contrat de migration n'est pas une API déployée.

## Préparé pour la suite, serveur nécessaire

Authentification, synchronisation multi-appareils, stockage distant, offres validées selon les droits, abonnement et historique de paiement, publication/modération des sorties, inscription/annulation, gestion atomique de capacité et participants, challenges collectifs et récompenses. Les boutons concernés sont explicitement indisponibles ; le navigateur ne peut pas s'attribuer des droits payants.

Prévoir contrôle des propriétaires, validation serveur, transactions d'inscription (pas de dépassement de capacité), dates et fuseaux, suppression/export, permissions, signalement et modération. Les dates d'événements des brouillons sont locales ; la future API stockera également un fuseau IANA. Les données professionnelles publiques restent séparées des preuves privées de vérification.

## Services externes

La carte existante utilise Leaflet/OSM et Valhalla pour les trajets piétons. Après ma sortie utilise les tuiles OSM mais filtre les lieux localement. Si Leaflet échoue, la liste et les champs de coordonnées restent utilisables. La localisation ponctuelle est disponible sur action explicite, avec permission du navigateur et précision affichée. Elle ne crée aucun tracé d’activité, aucun suivi en arrière-plan et aucun enregistrement automatique. Les refus, erreurs, délais et positions hors zone sont signalés. Aucun service météo, montre connectée, notification ou Stripe n'est ajouté.

## Limites du générateur et sources

Modèle général destiné aux adultes déjà capables d'une pratique régulière. Minima de conception : 8 / 10 / 12 / 20 semaines selon 10 / 15 / 21 / 42 km. Le marathon exige une base déclarée de 40 km/semaine, une sortie de 90 min, un semi terminé et quatre créneaux disponibles. Les cas hors champ reçoivent une explication et aucun programme comprimé.

Le volume initial ne dépasse pas le temps hebdomadaire déclaré. Au plus une séance supplémentaire par rapport à la pratique actuelle ; jamais plus que les créneaux demandés. Hausse du volume de référence de 3% (débutant ou moins de 20 km/semaine) ou 5% sur les semaines de progression, plafond de 155% du départ, réduction toutes les quatre semaines et avant l'objectif. Retour au volume de référence après l'allègement, donc la hausse apparente entre récupération et reprise n'est pas une nouvelle hausse de 3/5%. Les bornes sont des choix conservateurs de programmation, **pas une règle médicale universelle de prévention des blessures**. Les durées n'attestent pas la capacité à terminer la distance finale.

Repères consultés le 25 septembre 2026 : [NHS Couch to 5K](https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/) (progressivité, récupération, avis en cas de doute) et [B.A.A. Marathon Training](https://www.baa.org/races/boston-marathon/info-for-athletes/boston-marathon-training/) (préparation marathon structurée, base de pratique). Le programme est propre à Run Relais, non validé ni approuvé par ces organismes. Leurs plans ne sont pas reproduits.
