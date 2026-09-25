/** Target contracts only. No database, authentication or payment runs in phase 1. */
export type UserType = 'sportif' | 'professionnel';
export type Activity = 'running' | 'trail' | 'cycling' | 'mtb' | 'hiking' | 'fitness' | 'strength' | 'swimming' | 'team_sports' | 'outdoor' | 'other';
export type ProfessionalStatus = 'prospect' | 'pending_verification' | 'verified' | 'partner' | 'inactive';
export type VerificationStatus = 'pending_verification' | 'verified' | 'needs_review';
export type PartnerPlan = 'visible' | 'recommended' | 'reference';
export type AthletePlan = 'curieux' | 'adherent' | 'developpeur';
export type ServiceKind = 'water' | 'toilets' | 'food' | 'lockers' | 'repair' | 'equipment' | 'shower' | 'changing_room' | 'charging' | 'rest';
export interface Territory {
  id: string;
  name: string;
  countryCode: string;
  // Coverage bounds do not assert an administrative boundary.
  bounds: {south: number; north: number; west: number; east: number};
}
export interface User {
  id: string;
  authSubject: string; // Reference to the future identity provider, never a password.
  userType: UserType;
  displayName: string;
  email: string;
  territoryId: string;
  createdAt: string;
}
export interface AthleteProfile {
  userId: string;
  activities: Activity[];
}
export interface ServiceDeclaration {
  id: string;
  establishmentId: string;
  kind: ServiceKind;
  conditions: string;
  status: VerificationStatus;
  declaredBy: string;
  declaredAt: string;
  verification: null | {reviewerId: string; evidenceRef: string; reviewedAt: string; reviewDueAt: string};
}
export interface Establishment {
  id: string;
  territoryId: string;
  osmId: string | null;
  ownerUserId: string | null; // Only assigned after verified ownership claim.
  professionalStatus: ProfessionalStatus;
  verificationStatus: VerificationStatus;
  partner: boolean;
  partnerPlan: PartnerPlan | null;
  name: string;
  logoUrl: string | null;
  address: string;
  coordinates: [number, number];
  contact: {email: string | null; phone: string | null; website: string | null; socialLinks: string[]};
  description: string;
  openingHours: string;
  photoUrls: string[];
  // OSM tags stay separate: they must never create verified service declarations.
  source: {provider: 'osm' | 'professional'; url: string | null; observedAt: string};
}
export interface OwnershipClaim {
  id: string;
  establishmentId: string;
  requesterUserId: string;
  status: 'pending' | 'approved' | 'rejected';
  evidenceRef: string | null; // Private storage, never the public site.
  reviewerId: string | null;
  reviewedAt: string | null;
}
export interface Favorite {userId: string; establishmentId: string; createdAt: string}
export interface SavedRoute {
  id: string;
  userId: string;
  territoryId: string;
  name: string;
  activity: Activity;
  routingProfile: 'pedestrian'; // Do not imply bicycle routing from an activity selection.
  stops: {coordinates: [number, number]; label: string | null}[]; // Ordered start, waypoints and end.
  coordinates: [number, number][];
  createdAt: string;
}
export interface AthleteOffer {
  id: string;
  establishmentId: string;
  title: string;
  conditions: string;
  eligiblePlans: AthletePlan[];
  startsAt: string;
  endsAt: string;
  status: 'draft' | 'pending_verification' | 'published' | 'expired';
}
export interface Plan {
  id: AthletePlan | PartnerPlan | 'discovery';
  userType: UserType;
  amountCents: number | null;
  currency: 'EUR';
  period: 'free' | 'month' | 'custom';
  providerPriceId: string | null; // Assigned on the server at integration time.
}
export interface Subscription {
  id: string;
  userId: string;
  establishmentId: string | null;
  planId: Plan['id'];
  amountCents: number | null;
  currency: 'EUR';
  period: Plan['period'];
  status: 'pending' | 'active' | 'past_due' | 'canceled' | 'expired';
  startsAt: string | null;
  renewsAt: string | null;
  cancelAtPeriodEnd: boolean;
  paymentStatus: 'not_required' | 'pending' | 'paid' | 'failed' | 'refunded';
  provider: 'stripe' | null;
  providerSubscriptionId: string | null;
}
export interface PaymentRecord {
  id: string;
  subscriptionId: string;
  providerPaymentId: string;
  amountCents: number;
  currency: 'EUR';
  status: Subscription['paymentStatus'];
  paidAt: string | null;
  invoiceRef: string | null; // Authorized server access; never public invoice data.
}
export interface VisibilityCampaign {
  id: string;
  establishmentId: string;
  territoryId: string;
  format: 'pin' | 'enriched_profile' | 'local_selection' | 'temporary_feature' | 'event';
  status: 'draft' | 'pending_verification' | 'published' | 'ended';
  startsAt: string;
  endsAt: string;
}
