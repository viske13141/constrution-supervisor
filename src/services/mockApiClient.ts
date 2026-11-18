import { createInitialMockDatabase, type MockDatabaseState } from '@/src/data/mockDatabase';
import type { AuthContext } from '@/src/services/policyService';
import type { AuditLog, CompanyPolicy } from '@/src/types/models';

const DB_STORAGE_KEY = 'buildflow_demo_db_v1';

export function loadDb(): MockDatabaseState {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (!raw) {
      const initial = createInitialMockDatabase();
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw) as MockDatabaseState;
  } catch {
    return createInitialMockDatabase();
  }
}

export function saveDb(next: MockDatabaseState): void {
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota issues in sandboxed previews
  }
}

export function resetDb(): MockDatabaseState {
  const fresh = createInitialMockDatabase();
  saveDb(fresh);
  return fresh;
}

export function appendAuditLog(
  db: MockDatabaseState,
  ctx: AuthContext,
  action: string,
  entityType: string,
  entityId: string,
  details: string
): AuditLog {
  const entry: AuditLog = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    companyId: ctx.companyId,
    actorId: ctx.user.id,
    actorName: ctx.user.name,
    actorRole: ctx.user.role,
    action,
    entityType,
    entityId,
    details,
    timestamp: new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
  };
  db.auditLogs.unshift(entry);
  return entry;
}

export function updateCompanyPolicy(companyId: string, patch: Partial<CompanyPolicy>): CompanyPolicy {
  const db = loadDb();
  const comp = db.companies.find((c) => c.id === companyId);
  if (!comp) {
    throw new Error('Company not found');
  }
  comp.policy = { ...comp.policy, ...patch };
  saveDb(db);
  return comp.policy;
}

export function matchesTenantAndCrew(
  ctx: AuthContext,
  record: { companyId: string; projectId?: string; siteId?: string; crewId?: string }
): boolean {
  if (record.companyId !== ctx.companyId) return false;
  if (record.projectId && record.projectId !== ctx.projectId) return false;
  if (record.siteId && record.siteId !== ctx.siteId) return false;
  if (
    record.crewId &&
    ctx.user.role === 'supervisor' &&
    ctx.user.assignedCrewIds.length > 0 &&
    !ctx.user.assignedCrewIds.includes(record.crewId)
  ) {
    return false;
  }
  return true;
}

export async function simulateLatency<T>(result: T, ms = 120): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(result), ms));
}
