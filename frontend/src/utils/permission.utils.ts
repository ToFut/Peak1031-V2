import { User } from '../types';
import { ExchangeParticipant } from '../types/exchange-details.types';

export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin';
}

export function isCoordinator(user: User | null): boolean {
  return user?.role === 'coordinator';
}

export function isClient(user: User | null): boolean {
  return user?.role === 'client';
}

export function isThirdParty(user: User | null): boolean {
  return user?.role === 'third_party';
}

export function isAgency(user: User | null): boolean {
  return user?.role === 'agency';
}

export function canManageExchange(user: User | null): boolean {
  return isAdmin(user) || isCoordinator(user);
}

export function canUploadDocuments(user: User | null, participant?: ExchangeParticipant): boolean {
  if (isAdmin(user) || isCoordinator(user)) return true;
  if (participant && participant.permissions?.canUpload) return true;
  return false;
}

export function canViewDocuments(user: User | null, participant?: ExchangeParticipant): boolean {
  if (isAdmin(user) || isCoordinator(user)) return true;
  if (participant && participant.permissions?.canViewDocuments) return true;
  return false;
}

export function canMessageInExchange(user: User | null, participant?: ExchangeParticipant): boolean {
  if (isAdmin(user) || isCoordinator(user)) return true;
  if (participant && participant.permissions?.canMessage) return true;
  return false;
}

export function canManageParticipants(user: User | null): boolean {
  return isAdmin(user) || isCoordinator(user);
}

export function canAdvanceStage(user: User | null): boolean {
  return isAdmin(user) || isCoordinator(user);
}

export function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    admin: 'Administrator',
    coordinator: 'Coordinator',
    client: 'Client',
    third_party: 'Third Party',
    agency: 'Agency'
  };
  return roleNames[role] || role;
}