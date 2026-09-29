import type {User, AthleteProfile, AthletePlan, Activity as Sport, Establishment, AthleteOffer, VerificationStatus} from './domain';

/** Storage-neutral records. `local-device` is a browser scope, never an authenticated user. */
export interface SportProfile extends AthleteProfile {
  alias: string;
  mainSport: Sport;
  level: 'beginner' | 'regular' | 'experienced';
  availableSessions: number;
  trainingDays?: number[]; // 0 = Sunday ... 6 = Saturday; legacy profiles may omit this.
  preferences: string;
}
export interface Goal {id: string; userId: string; sport: Sport; title: string; date: string; distance: number | null; planId?: string}
export interface Workout {
  id: string; planId: string; week: number; date: string;
  type: 'easy' | 'varied' | 'long' | 'event';
  duration: number | null; distance: number | null; description: string;
  completed: boolean; completedAt: string | null;
}
export interface TrainingPlan {
  schemaVersion: 1; algorithmVersion: string; id: string; userId: string;
  sport: Sport; objective: string; targetDate: string; targetMinutes: number | null;
  priority: 'finish' | 'improve' | 'performance'; startDate: string; duration: number;
  sessionsPerWeek: number; createdAt: string; notes: string[];
  trainingDays?: number[] | null; // Actual selected subset; race date is an exception.
  weeks: {number: number; kind: 'build' | 'recovery' | 'taper' | 'event'; plannedMinutes: number; workouts: Workout[]}[];
  // Completion is derived from workouts, never from elapsed time alone.
}
export interface ActivityRecord {
  id: string; userId: string; sport: Sport; date: string;
  source: 'manual' | 'gps'; duration: number; distance: number | null; elevation: number | null;
  notes: string; routeId: string | null; workoutId: string | null; createdAt: string;
}
export interface CommunityEvent {
  id: string; creatorId: string; sport: Sport; title: string; date: string; time: string;
  location: string; distance: number; level: string; maxParticipants: number;
  participants: {userId: string; joinedAt: string}[];
  description: string; scope: 'local-draft' | 'published'; createdAt: string;
}
export interface Challenge {
  id: string; title: string; sport: Sport; target: number; unit: 'km' | 'activities';
  startDate: string; endDate: string; scope: 'personal' | 'community';
  reward: null | {offerId: string; conditions: string};
}
export type RecoveryCategory = 'water' | 'cafe' | 'food' | 'recovery' | 'massage' | 'pool' | 'wellness' | 'shower' | 'health' | 'equipment' | 'toilets';
export interface PartnerOffer extends AthleteOffer {
  category: RecoveryCategory; description: string;
  location: Establishment['coordinates']; verificationStatus: VerificationStatus;
}
export interface LocationSelection {coordinates: [number,number]; source: 'manual' | 'route-end' | 'gps'; observedAt: string | null; accuracyMeters: number | null}
export interface AthleteRepository {
  getProfile(userId: User['id']): Promise<SportProfile | null>;
  saveProfile(profile: SportProfile): Promise<void>;
  getActivePlan(userId: User['id']): Promise<TrainingPlan | null>;
  savePlan(plan: TrainingPlan): Promise<void>;
  saveActivity(activity: ActivityRecord): Promise<void>;
  listActivities(userId: User['id']): Promise<ActivityRecord[]>;
  listOffers(userId: User['id'], plan: AthletePlan): Promise<PartnerOffer[]>;
  // Server implementations must derive identity and subscription from trusted auth, not these parameters.
}
