import {
  appendAuditLog,
  loadDb,
  matchesTenantAndCrew,
  saveDb,
  simulateLatency,
} from '@/src/services/mockApiClient';
import {
  assertPermission,
  assertTenantScope,
  type AuthContext,
} from '@/src/services/policyService';
import type { Worker, WorkerCategory } from '@/src/types/models';

export interface AddCrewWorkerInput {
  name: string;
  employeeId: string;
  designation: WorkerCategory;
  skillCategory: 'Skilled' | 'Unskilled';
  employmentType: 'Company Payroll' | 'Contractor';
  contractorName?: string;
  phone: string;
  requestApprovalReason: string;
}

export const crewService = {
  async listAssignedWorkers(ctx: AuthContext): Promise<Worker[]> {
    assertPermission(ctx, 'view_assigned_crew');
    const db = loadDb();
    const filtered = db.workers
      .filter((w) => matchesTenantAndCrew(ctx, w))
      .map((w) => {
        // Backend field-level redaction: never expose confidential wage unless policy allows
        if (!ctx.user.effectivePermissions.view_worker_wages) {
          return { ...w, dailyWageInr: 0 };
        }
        return w;
      });
    return simulateLatency(filtered);
  },

  async addOrRequestWorkerToCrew(
    ctx: AuthContext,
    input: AddCrewWorkerInput
  ): Promise<{ worker: Worker; approvalMode: 'Assigned Directly' | 'Pending Site Manager Approval' }> {
    assertPermission(ctx, 'view_assigned_crew');
    const db = loadDb();
    const canAssignDirectly = ctx.user.effectivePermissions.manage_crew_reassignment;
    const crewId = ctx.user.assignedCrewIds[0] || 'crew-gv-civil';

    const newWorker: Worker = {
      id: `w-${Date.now()}`,
      companyId: ctx.companyId,
      projectId: ctx.projectId,
      siteId: ctx.siteId,
      crewId,
      supervisorId: ctx.user.id,
      employeeId: input.employeeId.trim(),
      name: input.name.trim(),
      designation: input.designation,
      skillCategory: input.skillCategory,
      employmentType: input.employmentType,
      contractorName: input.contractorName?.trim() || undefined,
      phone: input.phone.trim(),
      dailyWageInr: input.skillCategory === 'Skilled' ? 920 : 620,
      attendanceStatus: 'Not Checked In',
      availabilityStatus: canAssignDirectly ? 'Available' : 'Temporarily Unavailable',
      joinedDate: '2026-11-18',
      workHistory: [],
      documents: [
        {
          id: `doc-${Date.now()}`,
          title: canAssignDirectly
            ? 'Crew Assignment Record'
            : `Crew Mobilization Request (${input.requestApprovalReason})`,
          type: 'Assignment',
          verified: canAssignDirectly,
          restricted: false,
        },
      ],
    };

    assertTenantScope(ctx, newWorker);
    db.workers.unshift(newWorker);

    db.attendance.unshift({
      id: `att-${Date.now()}`,
      companyId: ctx.companyId,
      projectId: ctx.projectId,
      siteId: ctx.siteId,
      crewId,
      workerId: newWorker.id,
      workerName: newWorker.name,
      employeeId: newWorker.employeeId,
      date: '2026-11-18',
      checkInTime: null,
      checkOutTime: null,
      checkInPhotoStatus: 'Unavailable',
      gpsVerificationStatus: 'Pending',
      geofenceStatus: 'Unknown',
      status: 'Not Checked In',
      originalStatus: 'Not Checked In',
      pendingReview: false,
      exceptions: [],
    });

    const approvalMode = canAssignDirectly
      ? 'Assigned Directly'
      : 'Pending Site Manager Approval';

    appendAuditLog(
      db,
      ctx,
      canAssignDirectly ? 'ASSIGN_WORKER_TO_CREW' : 'REQUEST_WORKER_FOR_CREW',
      'Worker',
      newWorker.id,
      `${newWorker.name} (${newWorker.designation}) — ${approvalMode}. Reason: ${input.requestApprovalReason}`
    );

    saveDb(db);
    return simulateLatency({ worker: newWorker, approvalMode });
  },
};
