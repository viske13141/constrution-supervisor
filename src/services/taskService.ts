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
import type { Task, TaskPriority, TaskStatus } from '@/src/types/models';

export interface CreateTaskInput {
  title: string;
  description: string;
  workZone: string;
  workCategory: string;
  priority: TaskPriority;
  startDate: string;
  dueDate: string;
  plannedHours: number;
  requiredMaterials: string[];
  instructions: string;
  supervisorRemarks?: string;
  workerIds: string[];
  referenceImages: string[];
}

export interface UpdateTaskProgressInput {
  taskId: string;
  progressPercent: number;
  status: TaskStatus;
  workCompletedSummary: string;
  delayReason?: string;
  materialShortage?: string;
  equipmentIssue?: string;
  photoUrls: string[];
}

export const taskService = {
  async listTasks(ctx: AuthContext): Promise<Task[]> {
    const db = loadDb();
    const list = db.tasks.filter((t) => matchesTenantAndCrew(ctx, t));
    return simulateLatency(list);
  },

  async createTask(ctx: AuthContext, input: CreateTaskInput): Promise<Task> {
    assertPermission(ctx, 'allocate_daily_tasks');
    const db = loadDb();
    const crewId = ctx.user.assignedCrewIds[0] || 'crew-gv-civil';
    const assignedWorkers = db.workers.filter(
      (w) => input.workerIds.includes(w.id) && matchesTenantAndCrew(ctx, w)
    );

    const newTask: Task = {
      id: `task-${Date.now()}`,
      companyId: ctx.companyId,
      projectId: ctx.projectId,
      siteId: ctx.siteId,
      crewId,
      supervisorId: ctx.user.id,
      title: input.title.trim(),
      description: input.description.trim(),
      workZone: input.workZone.trim(),
      workCategory: input.workCategory,
      priority: input.priority,
      status: assignedWorkers.length > 0 ? 'Assigned' : 'Draft',
      startDate: input.startDate,
      dueDate: input.dueDate,
      plannedHours: input.plannedHours,
      progressPercent: 0,
      completedUnitsText: '0% started',
      remainingUnitsText: 'Pending start',
      requiredMaterials: input.requiredMaterials,
      instructions: input.instructions.trim(),
      beforeImages: input.referenceImages,
      progressImages: [],
      completionImages: [],
      supervisorRemarks: input.supervisorRemarks?.trim(),
      assignments: assignedWorkers.map((w, idx) => ({
        id: `ta-${Date.now()}-${idx}`,
        taskId: `task-${Date.now()}`,
        workerId: w.id,
        workerName: w.name,
        designation: w.designation,
        assignedAt: new Date().toISOString(),
      })),
      progressHistory: [],
    };

    assertTenantScope(ctx, newTask);

    // Update worker availability
    for (const w of assignedWorkers) {
      w.currentTaskId = newTask.id;
      w.currentTaskTitle = newTask.title;
      if (w.availabilityStatus === 'Available') {
        w.availabilityStatus = 'Currently Working';
      }
    }

    db.tasks.unshift(newTask);
    appendAuditLog(
      db,
      ctx,
      'CREATE_TASK',
      'Task',
      newTask.id,
      `Created task "${newTask.title}" at ${newTask.workZone} with ${assignedWorkers.length} worker(s).`
    );

    saveDb(db);
    return simulateLatency(newTask);
  },

  async updateTaskProgress(
    ctx: AuthContext,
    input: UpdateTaskProgressInput
  ): Promise<Task> {
    assertPermission(ctx, 'update_task_progress');
    const db = loadDb();
    const task = db.tasks.find((t) => t.id === input.taskId);
    if (!task) throw new Error('Task not found.');
    assertTenantScope(ctx, task);

    // Rule: Supervisor cannot self-approve a task; completing routes to Submitted for Review unless user is Site Manager
    let nextStatus = input.status;
    if (
      (nextStatus === 'Approved' || nextStatus === 'Completed') &&
      !ctx.user.effectivePermissions.approve_completed_tasks
    ) {
      nextStatus = nextStatus === 'Approved' ? 'Submitted for Review' : 'Submitted for Review';
    }

    task.progressPercent = input.progressPercent;
    task.status = nextStatus;
    if (input.photoUrls.length > 0) {
      task.progressImages = [...task.progressImages, ...input.photoUrls];
    }

    task.progressHistory.unshift({
      id: `tp-${Date.now()}`,
      taskId: task.id,
      updatedBy: ctx.user.name,
      updatedAt: new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
      progressPercent: input.progressPercent,
      workCompletedSummary: input.workCompletedSummary,
      delayReason: input.delayReason,
      materialShortage: input.materialShortage,
      equipmentIssue: input.equipmentIssue,
      photoUrls: input.photoUrls,
    });

    appendAuditLog(
      db,
      ctx,
      'UPDATE_TASK_PROGRESS',
      'Task',
      task.id,
      `Updated "${task.title}" to ${input.progressPercent}% (${nextStatus})`
    );

    saveDb(db);
    return simulateLatency({ ...task });
  },
};
