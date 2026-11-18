import {
  Bell,
  Building2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FolderOpen,
  HardHat,
  HelpCircle,
  LayoutDashboard,
  MessageSquare,
  PackageCheck,
  PackageSearch,
  ShieldAlert,
  ShoppingCart,
  TrendingUp,
  UserCheck,
  UserCircle,
  Users,
} from 'lucide-react';
import type { PermissionKey } from '@/src/types/models';

export interface NavItemConfig {
  id: string;
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  requiredPermission?: PermissionKey;
}

export interface NavGroupConfig {
  groupLabel: string;
  items: NavItemConfig[];
}

export const SIDEBAR_NAV_GROUPS: NavGroupConfig[] = [
  {
    groupLabel: 'Workspace',
    items: [
      { id: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard },
      { id: 'site', label: 'My Site', path: '/site', icon: Building2, requiredPermission: 'view_assigned_site' },
      { id: 'crew', label: 'My Crew', path: '/crew', icon: Users, requiredPermission: 'view_assigned_crew' },
    ],
  },
  {
    groupLabel: 'Workforce Operations',
    items: [
      { id: 'attendance', label: 'Crew Attendance', path: '/attendance', icon: ClipboardCheck, requiredPermission: 'view_assigned_attendance' },
      { id: 'tasks', label: 'Daily Tasks', path: '/tasks', icon: ClipboardList, requiredPermission: 'allocate_daily_tasks' },
      { id: 'availability', label: 'Worker Availability', path: '/availability', icon: UserCheck, requiredPermission: 'view_assigned_crew' },
      { id: 'progress', label: 'Work Progress', path: '/progress', icon: TrendingUp },
    ],
  },
  {
    groupLabel: 'Materials & Purchases',
    items: [
      { id: 'purchases', label: 'Purchase Requests', path: '/purchases', icon: ShoppingCart, requiredPermission: 'submit_purchase_request' },
      { id: 'materials', label: 'Material Requirements', path: '/materials', icon: PackageSearch },
      { id: 'receipts', label: 'Material Receipts', path: '/receipts', icon: PackageCheck, requiredPermission: 'record_material_delivery' },
    ],
  },
  {
    groupLabel: 'Site Operations',
    items: [
      { id: 'daily-reports', label: 'Daily Site Report', path: '/daily-reports', icon: FileText, requiredPermission: 'submit_daily_report' },
      { id: 'safety', label: 'Safety & Incidents', path: '/safety', icon: ShieldAlert },
      { id: 'documents', label: 'Site Documents', path: '/documents', icon: FolderOpen },
    ],
  },
  {
    groupLabel: 'Communication',
    items: [
      { id: 'notifications', label: 'Notifications', path: '/notifications', icon: Bell },
      { id: 'messages', label: 'Messages', path: '/messages', icon: MessageSquare },
    ],
  },
  {
    groupLabel: 'Account',
    items: [
      { id: 'profile', label: 'My Profile', path: '/profile', icon: UserCircle },
      { id: 'support', label: 'Help & Support', path: '/support', icon: HelpCircle },
    ],
  },
];

export const MOBILE_BOTTOM_TABS = [
  { id: 'home', label: 'Home', path: '/', icon: LayoutDashboard },
  { id: 'crew', label: 'Crew', path: '/crew', icon: Users },
  { id: 'tasks', label: 'Tasks', path: '/tasks', icon: ClipboardList },
  { id: 'purchases', label: 'Purchases', path: '/purchases', icon: ShoppingCart },
];

export const APP_BRAND_ICON = HardHat;
