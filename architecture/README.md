# Architecture cible — réseau local pour sportifs

Cette spécification prépare les phases 2 à 5. Elle n’est ni un backend, ni une authentification, ni une intégration Stripe. Les interfaces TypeScript ne sont pas chargées par le site. `plans.json` décrit le catalogue prévu ; les montants sont exprimés en centimes. Aucun identifiant de paiement ni secret n’est configuré.

## Phase 1 livrée

Site statique compatible avec GitHub Pages. `accueil.html` présente le réseau multisport ; `index.html` garde la carte et son URL existante. `abonnements.html` présente les sportifs ; `partenaires.html` présente les professionnels sans prix. Les tarifs professionnels sont regroupés dans `offres-partenaires.html`. La séparation est éditoriale : ces pages restent accessibles publiquement, sans contrôle d’accès fictif.

`connexion.html` et `compte.html` orientent vers les deux aperçus. `compte-sportif.html` et `compte-professionnel.html` montrent l’organisation future. `comptes.js` ne conserve les choix que dans les éléments de la page : aucun stockage, mot de passe, appel réseau ou soumission de formulaire. Le lien de revendication transmet uniquement l’identifiant OSM et le nom public du lieu dans l’URL locale. Ces paramètres ne prouvent pas la propriété et ne créent aucune demande.

Le catalogue professionnel n’est pas chargé par les pages grand public. Les prix présentés dans le HTML devront être maintenus en cohérence avec `plans.json` jusqu’à la mise en place d’un rendu alimenté par le catalogue serveur.

## Phase 2 — identité, stockage et droits

- Choisir un hébergement serveur, une base de données et un fournisseur d’identité avant ouverture des comptes ; GitHub Pages ne contiendra que le frontend public.
- `User.userType` distingue sportif et professionnel. `AthleteProfile.activities` permet plusieurs activités. Si une même personne doit gérer les deux types, définir explicitement un modèle de rôles multiples lors de cette phase.
- Définir les droits côté serveur : un sportif accède uniquement à ses favoris, parcours, informations et abonnements ; un professionnel ne modifie que ses établissements après contrôle de propriété. Un rôle de modération distinct valide les demandes. Refuser par défaut les accès non autorisés.
- Un établissement OSM est initialement `prospect`, `needs_review`, `partner: false`, `partnerPlan: null`, sans propriétaire. Une demande entraîne `pending_verification`. L’approbation de propriété associe le propriétaire et le statut `verified` ; elle n’active aucun partenariat payant.
- Les services sont des déclarations distinctes des catégories et tags OSM. Ils passent par `pending_verification`, `verified` ou `needs_review`. Une modification substantielle repasse en validation. Exiger des preuves datées et une prochaine date de revue ; retirer l’affichage « vérifié » si la preuve expire.
- Ajouter favoris et parcours seulement après ces contrôles. Un profil vélo ne transforme pas un itinéraire piéton en trajet cyclable.
- Prévoir avant collecte la gestion des consentements applicables, la confidentialité des trajets, les durées de conservation, l’export, la suppression, les informations légales et la revue RGPD adaptée au service. Aucune conformité n’est revendiquée par ce prototype.

## Phase 3 — abonnements et paiements

Le catalogue distingue Curieux / Adhérent / Développeur et Découverte / Visible / Recommandé / Référence. Référence n’a pas de tarif prédéfini. Les champs de `Subscription` couvrent identifiant, montant, périodicité, statut, début, renouvellement, annulation et état du paiement. `PaymentRecord` ne contient que des références de prestataire et de facture, jamais de coordonnées bancaires.

Flux à implémenter après choix du prestataire : utilisateur authentifié → requête serveur avec identifiant de formule → vérification des droits et du prix serveur → page de paiement hébergée par le prestataire → notification serveur authentifiée → mise à jour de l’abonnement et des droits. Une simple redirection de succès côté navigateur ne doit jamais activer un abonnement.

Prévoir la validation des signatures des notifications, leur traitement idempotent, les échecs de paiement, changements de formule, annulations, remboursements et la réconciliation. Les secrets et identifiants privés resteront côté serveur. Aucun champ de carte ni mot de passe en clair ne sera stocké par le projet. Le prestataire devra gérer la saisie bancaire, les renouvellements et l’accès aux factures. Vérifier sa documentation officielle à jour au moment de l’intégration ; aucun endpoint de paiement simulé n’est livré ici.

Le passage `verified` → `partner` exige une validation éditoriale en cours de validité et un abonnement professionnel actif confirmé côté serveur. La fin d’un abonnement retire les mises en avant payantes sans effacer le lieu OSM. Le statut `inactive` permet de suspendre un établissement ; l’accès payant et la vérification demeurent deux dimensions distinctes.

## Phases 4 et 5

Les offres et campagnes ont leurs dates, conditions, territoire et validation. Définir les statistiques réellement mesurées (vues, clics, itinéraires, interactions, utilisations) et leur collecte avant d’afficher un bilan ; aucun chiffre de démonstration ne doit apparaître comme réel.

Un identifiant de territoire relie utilisateurs, établissements, parcours et campagnes. Le lancement reste Caen / Caen la Mer. L’emprise cartographique existante reste une couverture opérationnelle incluant des communes voisines, pas une frontière administrative. D’autres territoires nécessiteront leurs propres données sourcées et une validation locale.

## Bibliothèque de plans running

`plans-entrainement.html` présente huit programmes avec filtres par distance et niveau. Les liens d'entrée sont sur l'accueil, les formules sportifs et l'aperçu du compte sportif. Les huit PDF sont publiés à la racine et proposés en téléchargement direct.

Décision explicite de l'utilisateur du 25 septembre 2026 : publier aussi les huit PDF publiquement sur GitHub. Elle remplace la répartition initiale réservée à Adhérent et Développeur. Tous les visiteurs peuvent télécharger ces plans sans compte ni abonnement. `training-plans.json` expose `access: public`, `downloadsEnabled: true` et les chemins publics. Les plans ne constituent donc plus un avantage exclusif des formules payantes. Les comptes et paiements restent non activés.

Sources : huit PDF fournis par l'utilisateur, niveaux Débutant et Amateur sur 10 km, 15 km, semi-marathon et marathon. Refonte graphique uniquement ; aucune validation médicale ou sportive indépendante n'est revendiquée.

De futurs contenus réellement réservés aux abonnés nécessiteront un stockage privé et une vérification des droits côté serveur. Ne pas réutiliser les liens publics comme contrôle d'accès.

## Source des choix

Spécification utilisateur « ÉVOLUTION MAJEURE DU PROJET — RUN RELAIS → PLATEFORME POUR SPORTIFS », fournie le 24 septembre 2026. Les services, prix, phases et termes sont des choix de produit demandés, pas des offres commerciales déjà actives.
