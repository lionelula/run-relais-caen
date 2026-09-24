# Run Relais — Caen et Caen la Mer

Prototype de carte pour repérer les cafés, commerces et services utiles le long d’un trajet à pied.

## Fonctionnalités

- Itinéraires piétons entre deux points, via Valhalla.
- Relevé régional de lieux OpenStreetMap, filtré localement autour du trajet.
- Onze catégories de lieux combinables, sans plafond d’affichage.
- Pages distinctes pour les coureurs et les professionnels.
- Aucun compte, paiement, formulaire envoyé ou backend.

## Lancer le site localement

Le site est composé de fichiers HTML, CSS et JavaScript, sans compilation.
Depuis ce dossier, avec Python installé :

```sh
python -m http.server 8765 --bind 127.0.0.1
```

Ouvrir ensuite http://127.0.0.1:8765/index.html.
Une connexion Internet est nécessaire pour Leaflet, les tuiles OpenStreetMap, Valhalla et les polices. Le relevé des lieux est fourni dans le dépôt.

## Fichiers principaux

- `index.html`, `map.js` : carte et interface.
- `routing.js` : calcul des itinéraires piétons.
- `nearby.js`, `nearby-snapshot.json` : lieux et filtres.
- `abonnements.html` : présentation destinée aux coureurs.
- `partenaires.html`, `professionnels.css`, `professionnels.js` : présentation professionnelle.
- `styles.css` : styles communs.

Les données OpenStreetMap sont attribuées à leurs contributeurs sous licence ODbL 1.0. Le relevé conserve la requête source, l’emprise et la date des données. Voir les précisions ci-dessous.

## Parcours professionnels — évolution du 24 septembre 2026

La page existante partenaires.html est désormais une présentation commerciale dédiée aux professionnels, accessible par le lien discret « Professionnels » et par l’encart public « Vous êtes un professionnel ? ». Elle reste accessible sans authentification ; cette séparation éditoriale ne constitue pas une restriction d’accès.

La carte, les fiches et la page coureurs n’affichent aucun tarif partenaire. La page professionnelle présente d’abord les bénéfices, puis les deux formules de lancement : Visible à 19 €/mois et Recommandé à 49 €/mois. Les anciennes offres Référence et options chiffrées sont remplacées par une proposition personnalisée sans prix. Les offres coureurs restent distinctes.

Les quatre appels à l’action commerciaux mènent à un message « Lancement commercial en préparation ». professionnels.js affiche uniquement la sélection sur la page, sans envoi, stockage, formulaire, paiement, compte ni backend. Le message reste accessible si JavaScript est désactivé. Les statistiques sont annoncées comme prévues progressivement. La mise en page professionnelle est isolée dans professionnels.css pour pouvoir faire évoluer ce parcours séparément.

Vérifications : absence des tarifs partenaires sur les pages grand public, deux seules formules chiffrées côté professionnel, ordre bénéfices puis tarifs, liens locaux valides et contrôle visuel desktop/mobile.

## État du prototype

La récupération n'effectue aucune publication sur Internet. Les abonnements, paiements et réservations ne sont pas activés. Les établissements sont affichés comme lieux à contacter. Le repère de test reste illustratif et est exclu des choix de trajet. Les informations sur les établissements et leurs coordonnées n'ont pas fait l'objet d'une nouvelle vérification lors de la récupération.

## Itinéraires piétons — évolution du 23 septembre 2026

Le polygone illustratif a été supprimé. Le fichier routing.js utilise maintenant le service Valhalla public de FOSSGIS, avec le profil `pedestrian` exclusivement. Le tracé suit la géométrie renvoyée par le moteur, issue du réseau OpenStreetMap. Aucun segment direct de remplacement n’est affiché en cas d’échec.

- Départ et arrivée parmi les deux lieux existants, ou par clic sur la carte avec les boutons ⌖.
- Choix libre étendu à Caen et au territoire de Caen la Mer ; la zone opérationnelle couvre le littoral, les communes périurbaines et le sud de l’intercommunalité (latitude 49.05–49.34, longitude -0.59–-0.14). Il s’agit d’une emprise rectangulaire incluant aussi des communes voisines, pas d’une frontière administrative. Raccordement au réseau limité à 100 mètres.
- Inversion du sens, distance calculée, estimation du temps de marche à 5 km/h et indications en français.
- Recentrage sur le trajet, erreurs explicites, délai de calcul limité à 18 secondes, annulation des requêtes devenues obsolètes et cache des 20 derniers trajets pendant la session.
- Coordonnées choisies envoyées au service de calcul ; aucune géolocalisation automatique.

La documentation du profil piéton indique qu’il exclut les voies sans accès piéton et favorise les cheminements piétons. Les accès restent tributaires des données cartographiques et de la situation sur place. Ce calcul n’est pas une validation terrain d’un parcours de course.

Sources techniques :

- https://valhalla.github.io/valhalla/api/route/api-reference/
- https://github.com/valhalla/valhalla#demo-server
- https://caenlamer.fr/carte-des-communes

Le service public est utilisé pour ce prototype à faible trafic, avec un identifiant de client. Avant une publication destinée à un usage soutenu, choisir un service adapté et respecter les conditions de l’opérateur ; celui-ci demande aux applications publiées de se signaler via GitHub Discussions.

Vérifications : six tests automatisés couvrant le décodage polyline6, le profil piéton, les réponses invalides ou automobiles, les limites de service et les erreurs réseau. Dans le navigateur : trajet initial (491 m), trajet vers un point choisi sur la carte (353 m), indications françaises, rejet de points identiques sans maintien de l’ancien tracé. Ces distances correspondent aux calculs observés le jour de la vérification, aux coordonnées du prototype.

## Lieux proches du trajet

Le fichier nearby.js recherche les cafés, restaurants, bars, boulangeries, épiceries, supermarchés, magasins de sport, points d’eau potable et toilettes cartographiés dans OpenStreetMap, via Overpass. Une requête bornée couvre le trajet et une marge de 550 m ; le filtrage local mesure ensuite la distance au segment le plus proche du tracé piéton, y compris aux extrémités A et B.

- Rayons de 100, 250 ou 500 m ; 250 m par défaut.
- Onze filtres cumulables : cafés, restaurants, fast-foods, bars, pubs, boulangeries, épiceries, supermarchés, magasins de sport, eau potable et toilettes. Cliquer sur plusieurs types affiche leur union ; « Tout » réinitialise la sélection. Les catégories proviennent des tags OpenStreetMap, pas du nom commercial.
- Distance géométrique approximative à vol d’oiseau, explicitement distincte d’un détour à pied.
- Tous les lieux correspondant au rayon et aux filtres sont affichés sur la carte, sans plafond de 40, y compris sur les longs trajets. Zoomez pour distinguer les repères superposés. La liste triée par proximité se déroule par groupes de huit sans plafond, ou entièrement avec « Déplier toute la liste ». Déplier la liste ne recrée pas les marqueurs et les fiches sont construites à l’ouverture pour réduire le travail d’affichage.
- Fiche OpenStreetMap individuelle avec source, adresse et horaires lorsqu’ils sont renseignés. Les noms et horaires ne sont pas des garanties d’activité ou d’ouverture.
- Bouton « Choisir comme arrivée » : nouveau calcul piéton vers les coordonnées cartographiées du lieu.
- Les lieux marqués privés, interdits, abandonnés ou désaffectés sont écartés. Les mentions accès clientèle et accès payant sont reprises si renseignées.
- Cache de huit zones dans la session du navigateur, avec expiration à 30 minutes et conservation après rafraîchissement ; changement de rayon ou filtre sans nouvelle requête réseau. Les trajets longs sont découpés en secteurs piétons chevauchants d’environ 1,4 km, interrogés par groupes de trois, puis les réponses sont fusionnées par identifiant OpenStreetMap : la recherche n’est donc pas limitée à la zone centrale ni à environ 715 m. Les premiers résultats sont affichés dès qu’un secteur répond ; un relevé local proche sert aussi d’aperçu immédiat pendant la mise à jour en ligne. Annulation des recherches obsolètes et message distinct d’un résultat vide si le service échoue. Aucun lieu inventé en cas d’échec.

Sources techniques :

- https://wiki.openstreetmap.org/wiki/Overpass_API
- https://wiki.openstreetmap.org/wiki/OverpassQL

L’instance publique Overpass utilisée est https://overpass.private.coffee/api/interpreter, répertoriée par le wiki OpenStreetMap. Le serveur initial overpass-api.de a présenté une indisponibilité lors des vérifications.

Depuis le 24 septembre 2026, nearby-snapshot.json contient un relevé régional de 1 715 lieux OpenStreetMap, récupéré via Overpass Private.coffee. La zone interrogée va de 49.04 à 49.35 de latitude et de -0.59 à -0.13 de longitude. Elle englobe les contours des 48 communes de Caen la Mer vérifiés avec l’API géographique de l’État, ainsi que des secteurs voisins. Le serveur indique une base OSM datée du 31 mai 2026 à 22:37:44 UTC : l’interface affiche cette date des données, distincte du téléchargement. Le fichier conserve la requête, l’URL source, les dates et la licence ODbL 1.0. Attribution : © OpenStreetMap contributors.

Ce relevé est chargé une fois au démarrage et utilisé directement lorsque le trajet se situe dans cette zone, même si un ancien cache de session est présent. Les lieux proches sont alors filtrés localement sans attendre Overpass. Si le rayon déborde de la zone répertoriée, la couverture partielle est explicitement indiquée. Ailleurs, la recherche utilise Overpass ; en cas d’échec, une partie du relevé local peut être affichée si elle est proche du trajet, avec une mention explicite. Il ne s’agit pas d’un annuaire exhaustif ni d’une garantie d’ouverture actuelle des établissements.

Source du relevé : https://overpass.private.coffee/api/interpreter (requête exacte dans nearby-snapshot.json).

Contours de contrôle : https://geo.api.gouv.fr/epcis/200065597/communes?fields=nom,code,contour&format=geojson&geometry=contour

Validation régionale : six tests supplémentaires vérifient la couverture des contours officiels et l’affichage sans appel Overpass à Ouistreham (73 lieux dans le relevé), Hérouville-Saint-Clair (61), Ifs (41), Thue et Mue (14) et Troarn (12), y compris avec un ancien cache vide. Ces nombres correspondent aux catégories sélectionnées et aux données datées ci-dessus. Le filtrage local mesuré sur ces petits tracés de test prenait 0 à 9 ms sous Node ; ce n’est pas une mesure du chargement complet du navigateur.

Validation de l’affichage sans plafond : trois tests supplémentaires couvrent 120 marqueurs sur un tracé synthétique de plus de 10 km, la liste au-delà du 40e résultat et jusqu’au dernier, l’union de catégories, la remise à zéro, l’absence de résultats et la conservation des catégories dans le relevé régional et les réponses en ligne. Total : 22 tests réussis.

Validation : sept tests supplémentaires sur la distance au milieu et aux extrémités d’un trajet, le filtrage par rayon, le tri, les objets OSM et leurs centres, les doublons, les accès privés, les réponses partielles, le cache et la fusion de secteurs sur un trajet de plusieurs kilomètres. Dans le navigateur : résultats réels, filtres, réduction du rayon, source d’un point d’eau et recalcul vers ce lieu (228 m observés). Aucun partenariat n’est déduit de la présence dans OpenStreetMap.
