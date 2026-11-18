import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SyncQueueItem } from '@/src/types/models';

interface AppStoreState {
  activeCompanyId: string;
  activeUserId: string;
  activeProjectId: string;
  activeSiteId: string;
  sidebarCollapsed: boolean;
  mobileDrawerOpen: boolean;
  offlineMode: boolean;
  syncQueue: SyncQueueItem[];
  quickActionModal:
    | null
    | 'attendance_exception'
    | 'assign_task'
    | 'add_worker'
    | 'purchase_request'
    | 'material_receipt'
    | 'daily_report'
    | 'safety_incident';
  adminPolicyDrawerOpen: boolean;
  setContext: (payload: {
    companyId: string;
    userId: string;
    projectId: string;
    siteId: string;
  }) => void;
  setProjectAndSite: (projectId: string, siteId: string) => void;
  toggleSidebar: () => void;
  setMobileDrawerOpen: (open: boolean) => void;
  setOfflineMode: (offline: boolean) => void;
  setQuickActionModal: (modal: AppStoreState['quickActionModal']) => void;
  setAdminPolicyDrawerOpen: (open: boolean) => void;
  enqueueSyncAction: (
    item: Omit<SyncQueueItem, 'id' | 'createdAtClient' | 'status'>
  ) => SyncQueueItem;
  markSyncItemStatus: (
    id: string,
    status: SyncQueueItem['status'],
    extra?: { errorMessage?: string; serverReceivedAt?: string }
  ) => void;
  clearSyncedItems: () => void;
}

export const useAppStore = create<AppStoreState>()(
  persist(
    (set, get) => ({
      activeCompanyId: 'comp-medium',
      activeUserId: 'user-suresh',
      activeProjectId: 'proj-gv',
      activeSiteId: 'site-gv-tower-a',
      sidebarCollapsed: false,
      mobileDrawerOpen: false,
      offlineMode: false,
      syncQueue: [],
      quickActionModal: null,
      adminPolicyDrawerOpen: false,

      setContext: (payload) =>
        set({
          activeCompanyId: payload.companyId,
          activeUserId: payload.userId,
          activeProjectId: payload.projectId,
          activeSiteId: payload.siteId,
        }),

      setProjectAndSite: (projectId, siteId) =>
        set({ activeProjectId: projectId, activeSiteId: siteId }),

      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setMobileDrawerOpen: (open) => set({ mobileDrawerOpen: open }),
      setOfflineMode: (offline) => set({ offlineMode: offline }),
      setQuickActionModal: (modal) => set({ quickActionModal: modal }),
      setAdminPolicyDrawerOpen: (open) => set({ adminPolicyDrawerOpen: open }),

      enqueueSyncAction: (item) => {
        const existing = get().syncQueue.find(
          (q) => q.idempotencyKey === item.idempotencyKey && q.status !== 'Failed'
        );
        if (existing) return existing;
        const created: SyncQueueItem = {
          ...item,
          id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          createdAtClient: new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          status: 'Queued Offline',
        };
        set((s) => ({ syncQueue: [created, ...s.syncQueue] }));
        return created;
      },

      markSyncItemStatus: (id, status, extra) =>
        set((s) => ({
          syncQueue: s.syncQueue.map((item) =>
            item.id === id ? { ...item, status, ...extra } : item
          ),
        })),

      clearSyncedItems: () =>
        set((s) => ({
          syncQueue: s.syncQueue.filter((item) => item.status !== 'Synced'),
        })),
    }),
    {
      name: 'buildflow_app_store_v1',
      partialize: (state) => ({
        activeCompanyId: state.activeCompanyId,
        activeUserId: state.activeUserId,
        activeProjectId: state.activeProjectId,
        activeSiteId: state.activeSiteId,
        sidebarCollapsed: state.sidebarCollapsed,
        offlineMode: state.offlineMode,
        syncQueue: state.syncQueue,
      }),
    }
  )
);
