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
import type {
  Attendance,
  AttendanceException,
  WorkerAttendanceStatus,
} from '@/src/types/models';

export interface SubmitAttendanceExceptionInput {
  attendanceId: string;
  requestedStatus: WorkerAttendanceStatus;
  reason: string;
  remarks: string;
}

export const attendanceService = {
  async listAttendance(ctx: AuthContext): Promise<Attendance[]> {
    assertPermission(ctx, 'view_assigned_attendance');
    const db = loadDb();
    const records = db.attendance.filter((a) => matchesTenantAndCrew(ctx, a));
    return simulateLatency(records);
  },

  async submitAttendanceException(
    ctx: AuthContext,
    input: SubmitAttendanceExceptionInput
  ): Promise<Attendance> {
    assertPermission(ctx, 'record_attendance_exceptions');
    const db = loadDb();
    const record = db.attendance.find((a) => a.id === input.attendanceId);
    if (!record) {
      throw new Error('Attendance record not found.');
    }
    assertTenantScope(ctx, record);

    const canVerifyDirectly = ctx.user.effectivePermissions.verify_attendance_directly;

    // Crucial business rule: preserve originalStatus & original GPS/photo telemetry, never fabricate verification!
    const exception: AttendanceException = {
      id: `exc-${Date.now()}`,
      companyId: ctx.companyId,
      attendanceId: record.id,
      workerId: record.workerId,
      originalStatus: record.originalStatus,
      requestedStatus: input.requestedStatus,
      reason: input.reason,
      remarks: input.remarks,
      submittedBy: ctx.user.name,
      submittedAt: new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
      approvalStatus: canVerifyDirectly
        ? 'Verified Directly'
        : 'Pending Site Manager Approval',
      reviewedBy: canVerifyDirectly ? ctx.user.name : undefined,
      reviewedAt: canVerifyDirectly ? 'Just now' : undefined,
    };

    record.exceptions.unshift(exception);
    record.exceptionReason = `${input.reason}: ${input.remarks}`;

    if (canVerifyDirectly) {
      record.status = input.requestedStatus;
      record.pendingReview = false;
      const worker = db.workers.find((w) => w.id === record.workerId);
      if (worker) {
        worker.attendanceStatus = input.requestedStatus;
        if (input.requestedStatus === 'Present' && worker.availabilityStatus === 'Temporarily Unavailable') {
          worker.availabilityStatus = 'Available';
        }
      }
    } else {
      // Sent to Site Manager / HR for approval; keep pendingReview active
      record.pendingReview = true;
    }

    appendAuditLog(
      db,
      ctx,
      canVerifyDirectly ? 'VERIFY_ATTENDANCE_EXCEPTION' : 'SUBMIT_ATTENDANCE_CORRECTION',
      'Attendance',
      record.id,
      `Worker ${record.workerName}: original=${record.originalStatus}, requested=${input.requestedStatus}, mode=${exception.approvalStatus}`
    );

    saveDb(db);
    return simulateLatency({ ...record });
  },
};
