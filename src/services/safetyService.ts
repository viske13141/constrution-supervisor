import {
  appendAuditLog,
  loadDb,
  matchesTenantAndCrew,
  saveDb,
  simulateLatency,
} from '@/src/services/mockApiClient';
import {
  assertTenantScope,
  type AuthContext,
} from '@/src/services/policyService';
import type {
  SafetyCategory,
  SafetyIncident,
  SafetySeverity,
  SafetyStatus,
} from '@/src/types/models';

export interface CreateSafetyIncidentInput {
  category: SafetyCategory;
  workZone: string;
  occurredAt: string;
  personInvolved?: string;
  description: string;
  severity: SafetySeverity;
  immediateActionTaken: string;
  witnessInfo?: string;
  photoUrls: string[];
}

export const safetyService = {
  async listIncidents(ctx: AuthContext): Promise<SafetyIncident[]> {
    const db = loadDb();
    return simulateLatency(
      db.safetyIncidents.filter((s) => matchesTenantAndCrew(ctx, s))
    );
  },

  async reportIncident(
    ctx: AuthContext,
    input: CreateSafetyIncidentInput
  ): Promise<SafetyIncident> {
    const db = loadDb();
    const isCritical = input.severity === 'Critical';

    const incident: SafetyIncident = {
      id: `saf-${Date.now()}`,
      incidentCode: `INC-2026-0${90 + db.safetyIncidents.length}`,
      companyId: ctx.companyId,
      projectId: ctx.projectId,
      siteId: ctx.siteId,
      workZone: input.workZone.trim(),
      category: input.category,
      occurredAt: input.occurredAt,
      personInvolved: input.personInvolved?.trim() || undefined,
      description: input.description.trim(),
      severity: input.severity,
      immediateActionTaken: input.immediateActionTaken.trim(),
      witnessInfo: input.witnessInfo?.trim() || undefined,
      photoUrls: input.photoUrls,
      status: isCritical ? 'Action Required' : 'Reported',
      reportedById: ctx.user.id,
      reportedByName: ctx.user.name,
      requiresSiteManagerClose: isCritical,
    };

    assertTenantScope(ctx, incident);
    db.safetyIncidents.unshift(incident);

    if (isCritical) {
      db.notifications.unshift({
        id: `notif-crit-${Date.now()}`,
        companyId: ctx.companyId,
        projectId: ctx.projectId,
        siteId: ctx.siteId,
        targetUserId: ctx.user.id,
        category: 'Safety',
        title: `CRITICAL SAFETY ALERT: ${incident.incidentCode}`,
        message: `${incident.category} at ${incident.workZone}. Immediate escalation sent to Site Manager & EHS.`,
        createdAt: 'Just now',
        read: false,
        actionRoute: '/safety',
        severity: 'critical',
      });
    }

    appendAuditLog(
      db,
      ctx,
      'REPORT_SAFETY_INCIDENT',
      'SafetyIncident',
      incident.id,
      `${incident.incidentCode} (${incident.severity}): ${incident.category} at ${incident.workZone}`
    );

    saveDb(db);
    return simulateLatency(incident);
  },

  async updateIncidentStatus(
    ctx: AuthContext,
    incidentId: string,
    nextStatus: SafetyStatus
  ): Promise<SafetyIncident> {
    const db = loadDb();
    const inc = db.safetyIncidents.find((s) => s.id === incidentId);
    if (!inc) throw new Error('Incident not found.');
    assertTenantScope(ctx, inc);

    if (
      nextStatus === 'Closed' &&
      inc.requiresSiteManagerClose &&
      !ctx.user.effectivePermissions.close_critical_safety
    ) {
      throw new Error(
        'Critical safety incidents require Site Manager or EHS authorization to close.'
      );
    }

    inc.status = nextStatus;
    appendAuditLog(
      db,
      ctx,
      'UPDATE_SAFETY_STATUS',
      'SafetyIncident',
      inc.id,
      `${inc.incidentCode} status changed to ${nextStatus}`
    );
    saveDb(db);
    return simulateLatency({ ...inc });
  },
};
