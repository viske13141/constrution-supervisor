export type CompanySize = 'small' | 'medium' | 'large';

export type AppRole = 'site_manager_hybrid' | 'supervisor' | 'site_manager';

export type PermissionKey =
  | 'view_assigned_crew'
  | 'view_assigned_site'
  | 'view_assigned_attendance'
  | 'record_attendance_exceptions'
  | 'verify_attendance_directly'
  | 'allocate_daily_tasks'
  | 'update_task_progress'
  | 'approve_completed_tasks'
  | 'submit_purchase_request'
  | 'approve_own_purchase'
  | 'record_material_delivery'
  | 'verify_inventory_receipt'
  | 'submit_daily_report'
  | 'review_daily_reports'
  | 'edit_submitted_records'
  | 'view_worker_wages'
  | 'view_worker_contact'
  | 'manage_crew_reassignment'
  | 'close_critical_safety'
  | 'export_reports'
  | 'upload_site_documents';

export interface CompanyPolicy {
  companyId: string;
  useSeparateSupervisors: boolean;
  siteManagersPerformSupervisorDuties: boolean;
  requireAttendanceApproval: boolean;
  requirePurchaseApproval: boolean;
  allowSupervisorSelfPurchaseApproval: boolean;
  allowSupervisorEditSubmitted: boolean;
  allowSupervisorViewWages: boolean;
  allowSupervisorVerifyInventory: boolean;
  enableGpsCapture: boolean;
  approvalChain: Array<'Site Manager' | 'Procurement' | 'Finance'>;
}

export interface Company {
  id: string;
  name: string;
  size: CompanySize;
  code: string;
  policy: CompanyPolicy;
}

export interface Project {
  id: string;
  companyId: string;
  name: string;
  code: string;
  progressPercent: number;
  status: 'Active' | 'On Hold' | 'Completed';
}

export interface Site {
  id: string;
  companyId: string;
  projectId: string;
  name: string;
  zoneCode: string;
  address: string;
  siteManagerId: string;
  siteManagerName: string;
  siteManagerPhone: string;
  workingHours: string;
  shiftTiming: string;
  operationalStatus: 'Operational' | 'Restricted' | 'Weather Hold';
  safetyBriefing: string;
  demoCoordinatesLabel: string;
  isDemoData: boolean;
  overviewImageUrl?: string;
}

export interface Department {
  id: string;
  companyId: string;
  name: string;
}

export interface Designation {
  id: string;
  companyId: string;
  title: string;
  skillTier: 'Skilled' | 'Unskilled' | 'Semi-Skilled' | 'Staff';
}

export interface User {
  id: string;
  companyId: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  emergencyContact: string;
  role: AppRole;
  designation: string;
  departmentName: string;
  avatarUrl?: string;
  assignedProjectIds: string[];
  assignedSiteIds: string[];
  assignedCrewIds: string[];
  effectivePermissions: Record<PermissionKey, boolean>;
}

export interface SupervisorAssignment {
  id: string;
  companyId: string;
  projectId: string;
  siteId: string;
  supervisorId: string;
  crewId: string;
  departmentId: string;
  assignedFrom: string;
  active: boolean;
}

export interface Crew {
  id: string;
  companyId: string;
  projectId: string;
  siteId: string;
  supervisorId: string;
  name: string;
  tradeFocus: string;
}

export interface CrewMember {
  id: string;
  companyId: string;
  crewId: string;
  workerId: string;
  assignedAt: string;
  assignedBy: string;
  status: 'Active' | 'Pending Approval' | 'Transferred';
}

export type WorkerCategory =
  | 'Mason'
  | 'Helper'
  | 'Carpenter'
  | 'Electrician'
  | 'Plumber'
  | 'Welder'
  | 'Painter'
  | 'Steel Fixer'
  | 'Machine Operator'
  | 'Driver'
  | 'General Labour';

export type WorkerAttendanceStatus =
  | 'Present'
  | 'Absent'
  | 'Late'
  | 'On Leave'
  | 'Not Checked In'
  | 'Missing Checkout';

export type WorkerAvailabilityStatus =
  | 'Available'
  | 'Currently Working'
  | 'Assigned to Another Task'
  | 'On Leave'
  | 'Absent'
  | 'Temporarily Unavailable';

export interface Worker {
  id: string;
  companyId: string;
  projectId: string;
  siteId: string;
  crewId: string;
  supervisorId: string;
  employeeId: string;
  name: string;
  designation: WorkerCategory;
  skillCategory: 'Skilled' | 'Unskilled';
  employmentType: 'Company Payroll' | 'Contractor';
  contractorName?: string;
  phone: string;
  dailyWageInr: number;
  photoUrl?: string;
  attendanceStatus: WorkerAttendanceStatus;
  availabilityStatus: WorkerAvailabilityStatus;
  currentTaskId?: string;
  currentTaskTitle?: string;
  joinedDate: string;
  workHistory: Array<{
    date: string;
    taskTitle: string;
    siteName: string;
    hoursWorked: number;
    status: string;
  }>;
  documents: Array<{
    id: string;
    title: string;
    type: string;
    verified: boolean;
    restricted: boolean;
  }>;
}

export interface AttendanceException {
  id: string;
  companyId: string;
  attendanceId: string;
  workerId: string;
  originalStatus: WorkerAttendanceStatus;
  requestedStatus: WorkerAttendanceStatus;
  reason: string;
  remarks: string;
  submittedBy: string;
  submittedAt: string;
  approvalStatus: 'Verified Directly' | 'Pending Site Manager Approval' | 'Approved' | 'Rejected';
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface Attendance {
  id: string;
  companyId: string;
  projectId: string;
  siteId: string;
  crewId: string;
  workerId: string;
  workerName: string;
  employeeId: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInPhotoStatus: 'Captured' | 'Missing' | 'Unavailable';
  gpsVerificationStatus: 'Verified In-Zone' | 'Outside Geofence' | 'GPS Unavailable' | 'Pending';
  geofenceStatus: 'Inside Site' | 'Boundary' | 'Outside' | 'Unknown';
  status: WorkerAttendanceStatus;
  originalStatus: WorkerAttendanceStatus;
  pendingReview: boolean;
  exceptionReason?: string;
  exceptions: AttendanceException[];
}

export type TaskStatus =
  | 'Draft'
  | 'Assigned'
  | 'Accepted'
  | 'In Progress'
  | 'Blocked'
  | 'Completed'
  | 'Submitted for Review'
  | 'Approved'
  | 'Rejected / Rework Required';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface TaskAssignment {
  id: string;
  taskId: string;
  workerId: string;
  workerName: string;
  designation: string;
  assignedAt: string;
}

export interface TaskProgress {
  id: string;
  taskId: string;
  updatedBy: string;
  updatedAt: string;
  progressPercent: number;
  workCompletedSummary: string;
  delayReason?: string;
  materialShortage?: string;
  equipmentIssue?: string;
  photoUrls: string[];
}

export interface Task {
  id: string;
  companyId: string;
  projectId: string;
  siteId: string;
  crewId: string;
  supervisorId: string;
  title: string;
  description: string;
  workZone: string;
  workCategory: string;
  priority: TaskPriority;
  status: TaskStatus;
  startDate: string;
  dueDate: string;
  plannedHours: number;
  progressPercent: number;
  completedUnitsText?: string;
  remainingUnitsText?: string;
  requiredMaterials: string[];
  instructions: string;
  beforeImages: string[];
  progressImages: string[];
  completionImages: string[];
  supervisorRemarks?: string;
  siteManagerComments?: string;
  assignments: TaskAssignment[];
  progressHistory: TaskProgress[];
}

export interface PurchaseRequestItem {
  id: string;
  materialCategory: string;
  materialName: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
  estimatedTotal: number;
}

export interface PurchaseAttachment {
  id: string;
  fileName: string;
  fileType: string;
  sizeBytes: number;
  previewUrl?: string;
}

export type PurchaseStatus =
  | 'Draft'
  | 'Submitted'
  | 'Pending Site Manager Review'
  | 'Pending Procurement'
  | 'Pending Finance Approval'
  | 'Approved'
  | 'Rejected'
  | 'Ordered'
  | 'Partially Delivered'
  | 'Delivered'
  | 'Receipt Verification Pending'
  | 'Closed';

export interface ApprovalRecord {
  id: string;
  companyId: string;
  entityType: 'PurchaseRequest' | 'DailySiteReport' | 'Task' | 'AttendanceException';
  entityId: string;
  stage: string;
  decision: 'Submitted' | 'Approved' | 'Rejected' | 'Correction Requested';
  actorId: string;
  actorName: string;
  remarks?: string;
  timestamp: string;
}

export interface ApprovalWorkflow {
  id: string;
  companyId: string;
  entityType: 'PurchaseRequest';
  stages: string[];
}

export interface PurchaseRequest {
  id: string;
  requestCode: string;
  companyId: string;
  projectId: string;
  siteId: string;
  workZone: string;
  requestedById: string;
  requestedByName: string;
  requestDate: string;
  requiredDeliveryDate: string;
  supplierPreference?: string;
  reason: string;
  priority: 'Standard' | 'Urgent' | 'Critical';
  remarks?: string;
  status: PurchaseStatus;
  currentApprover: string;
  items: PurchaseRequestItem[];
  totalEstimatedAmount: number;
  attachments: PurchaseAttachment[];
  approvalHistory: ApprovalRecord[];
}

export type MaterialDeliveryStatus =
  | 'Awaiting Delivery'
  | 'Partially Received'
  | 'Fully Received'
  | 'Damaged'
  | 'Disputed'
  | 'Pending Verification';

export interface MaterialReceipt {
  id: string;
  companyId: string;
  projectId: string;
  siteId: string;
  purchaseRequestId: string;
  purchaseRequestCode: string;
  purchaseOrderCode: string;
  supplier: string;
  materialName: string;
  unit: string;
  orderedQuantity: number;
  deliveredQuantity: number;
  receivedQuantity: number;
  damagedQuantity: number;
  shortQuantity: number;
  remainingQuantity: number;
  deliveryDate: string;
  status: MaterialDeliveryStatus;
  remarks?: string;
  challanFileName?: string;
  photoUrls: string[];
  gpsCaptureInfo?: {
    captured: boolean;
    accuracyMeters?: number;
    capturedAt?: string;
    note: string;
  };
  inventoryPosted: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface MaterialRequirement {
  id: string;
  companyId: string;
  projectId: string;
  siteId: string;
  materialCategory: string;
  materialName: string;
  unit: string;
  requiredQty: number;
  onSiteQty: number;
  allocatedTaskTitle: string;
  neededByDate: string;
  estimatedUnitPrice: number;
}

export type SafetyCategory =
  | 'Worker Injury'
  | 'Unsafe Working Condition'
  | 'Missing PPE'
  | 'Equipment Hazard'
  | 'Electrical Hazard'
  | 'Fire Risk'
  | 'Near Miss'
  | 'Other Site Incident';

export type SafetySeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type SafetyStatus = 'Reported' | 'Under Review' | 'Action Required' | 'Resolved' | 'Closed';

export interface SafetyIncident {
  id: string;
  incidentCode: string;
  companyId: string;
  projectId: string;
  siteId: string;
  workZone: string;
  category: SafetyCategory;
  occurredAt: string;
  personInvolved?: string;
  description: string;
  severity: SafetySeverity;
  immediateActionTaken: string;
  witnessInfo?: string;
  photoUrls: string[];
  status: SafetyStatus;
  reportedById: string;
  reportedByName: string;
  requiresSiteManagerClose: boolean;
  siteManagerNote?: string;
}

export interface DailySiteReport {
  id: string;
  companyId: string;
  projectId: string;
  siteId: string;
  supervisorId: string;
  supervisorName: string;
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
  status: 'Draft' | 'Submitted' | 'Accepted' | 'Correction Requested';
  submittedAt?: string;
  siteManagerFeedback?: string;
}

export interface SiteDocument {
  id: string;
  companyId: string;
  projectId: string;
  siteId: string;
  title: string;
  category:
    | 'Site Safety Instructions'
    | 'Daily Work Plans'
    | 'Approved Drawings'
    | 'Work Permits'
    | 'Construction Guidelines'
    | 'Site Notices'
    | 'Equipment Operating Instructions';
  fileName: string;
  fileSizeLabel: string;
  uploadedBy: string;
  uploadedAt: string;
  version: string;
  accessLevel: 'Supervisor Permitted' | 'Restricted';
  summary: string;
}

export interface Notification {
  id: string;
  companyId: string;
  projectId: string;
  siteId: string;
  targetUserId: string;
  category:
    | 'Task'
    | 'Purchase'
    | 'Material'
    | 'Attendance'
    | 'Announcement'
    | 'Safety'
    | 'DailyReport';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  actionRoute: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface SiteMessage {
  id: string;
  companyId: string;
  projectId: string;
  siteId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  type: 'Announcement' | 'Instruction' | 'Reply' | 'Escalation';
  subject: string;
  body: string;
  timestamp: string;
  acknowledgedByIds: string[];
}

export interface AuditLog {
  id: string;
  companyId: string;
  actorId: string;
  actorName: string;
  actorRole: AppRole;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  timestamp: string;
}

export interface SyncQueueItem {
  id: string;
  idempotencyKey: string;
  actionType:
    | 'ATTENDANCE_EXCEPTION'
    | 'TASK_PROGRESS'
    | 'PURCHASE_REQUEST'
    | 'MATERIAL_RECEIPT'
    | 'DAILY_REPORT'
    | 'SAFETY_INCIDENT';
  title: string;
  payloadSummary: string;
  createdAtClient: string;
  status: 'Queued Offline' | 'Syncing' | 'Failed' | 'Synced';
  errorMessage?: string;
  serverReceivedAt?: string;
  executePayload: Record<string, unknown>;
}
