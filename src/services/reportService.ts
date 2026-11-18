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
import type { DailySiteReport } from '@/src/types/models';

export interface SubmitDailyReportInput {
  date: string;
  shift: string;
  totalAssignedWorkers: number;
  presentWorkers: number;
  absentWorkers: number;
  workCompleted: string;
  tasksInProgress: string;
  tasksDelayed: string;
  materialsConsumed: string;
  materialsRequired: string;
  equipmentUsed: string;
  safetyObservations: string;
  issuesAndBlockers: string;
  tomorrowsPlan: string;
  supervisorRemarks: string;
  photoUrls: string[];
  asDraft?: boolean;
}

export const reportService = {
  async listDailyReports(ctx: AuthContext): Promise<DailySiteReport[]> {
    const db = loadDb();
    return simulateLatency(
      db.dailyReports.filter((r) => matchesTenantAndCrew(ctx, r))
    );
  },

  async submitDailyReport(
    ctx: AuthContext,
    input: SubmitDailyReportInput
  ): Promise<DailySiteReport> {
    assertPermission(ctx, 'submit_daily_report');
    const db = loadDb();

    const report: DailySiteReport = {
      id: `dsr-${Date.now()}`,
      companyId: ctx.companyId,
      projectId: ctx.projectId,
      siteId: ctx.siteId,
      supervisorId: ctx.user.id,
      supervisorName: ctx.user.name,
      date: input.date,
      shift: input.shift,
      totalAssignedWorkers: input.totalAssignedWorkers,
      presentWorkers: input.presentWorkers,
      absentWorkers: input.absentWorkers,
      workCompleted: input.workCompleted.trim(),
      tasksInProgress: input.tasksInProgress.trim(),
      tasksDelayed: input.tasksDelayed.trim() || 'None',
      materialsConsumed: input.materialsConsumed.trim(),
      materialsRequired: input.materialsRequired.trim(),
      equipmentUsed: input.equipmentUsed.trim(),
      safetyObservations: input.safetyObservations.trim(),
      issuesAndBlockers: input.issuesAndBlockers.trim() || 'None',
      tomorrowsPlan: input.tomorrowsPlan.trim(),
      supervisorRemarks: input.supervisorRemarks.trim(),
      photoUrls: input.photoUrls,
      status: input.asDraft ? 'Draft' : 'Submitted',
      submittedAt: input.asDraft
        ? undefined
        : new Date().toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }),
    };

    assertTenantScope(ctx, report);
    db.dailyReports.unshift(report);

    appendAuditLog(
      db,
      ctx,
      input.asDraft ? 'SAVE_DAILY_REPORT_DRAFT' : 'SUBMIT_DAILY_SITE_REPORT',
      'DailySiteReport',
      report.id,
      `Daily Site Report for ${report.date} (${report.status})`
    );

    saveDb(db);
    return simulateLatency(report);
  },

  async reviewDailyReport(
    ctx: AuthContext,
    reportId: string,
    decision: 'Accepted' | 'Correction Requested',
    feedback: string
  ): Promise<DailySiteReport> {
    assertPermission(ctx, 'review_daily_reports');
    const db = loadDb();
    const report = db.dailyReports.find((r) => r.id === reportId);
    if (!report) throw new Error('Report not found.');
    assertTenantScope(ctx, report);

    report.status = decision;
    report.siteManagerFeedback = feedback;
    appendAuditLog(
      db,
      ctx,
      'REVIEW_DAILY_REPORT',
      'DailySiteReport',
      report.id,
      `Report ${report.date} marked ${decision}`
    );
    saveDb(db);
    return simulateLatency({ ...report });
  },
};
