import * as React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  Menu,
  RefreshCw,
  SlidersHorizontal,
  Wifi,
  X,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/src/lib/utils';
import {
  APP_BRAND_ICON,
  MOBILE_BOTTOM_TABS,
  SIDEBAR_NAV_GROUPS,
} from '@/src/components/layout/navConfig';
import { PolicySimulatorModal } from '@/src/components/layout/PolicySimulatorModal';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { communicationService } from '@/src/services/communicationService';
import { useAppStore } from '@/src/store/useAppStore';

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    ctx,
    company,
    user,
    project,
    site,
    companyProjects,
    projectSites,
    offlineMode,
    runSyncQueue,
  } = useAuthContext();
  const {
    sidebarCollapsed,
    toggleSidebar,
    mobileDrawerOpen,
    setMobileDrawerOpen,
    setOfflineMode,
    syncQueue,
    setProjectAndSite,
    adminPolicyDrawerOpen,
    setAdminPolicyDrawerOpen,
  } = useAppStore();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', ctx.companyId, ctx.siteId, ctx.user.id],
    queryFn: () => communicationService.listNotifications(ctx),
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  const queuedCount = syncQueue.filter(
    (q) => q.status === 'Queued Offline' || q.status === 'Failed'
  ).length;

  React.useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname, setMobileDrawerOpen]);

  const BrandIcon = APP_BRAND_ICON;

  const visibleGroups = SIDEBAR_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        !item.requiredPermission ||
        user.effectivePermissions[item.requiredPermission]
    ),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F5F7FA] text-[#172B4D]">
      {/* Desktop Left Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-[#101F35] text-slate-200 shrink-0 transition-[width] duration-200 border-r border-[#1E3354]',
          sidebarCollapsed ? 'w-[72px]' : 'w-[264px]'
        )}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#F59E0B] text-[#101F35] flex items-center justify-center shrink-0">
              <BrandIcon className="w-4 h-4" />
            </div>
            {!sidebarCollapsed && (
              <span className="text-base font-bold tracking-tight text-white truncate">
                BuildFlow
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="w-8 h-8 flex items-center justify-center rounded-md text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-5" aria-label="Primary sidebar">
          {visibleGroups.map((group) => (
            <div key={group.groupLabel}>
              {!sidebarCollapsed && (
                <div className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-wider text-slate-400">
                  {group.groupLabel}
                </div>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const showBadge =
                    item.id === 'notifications' && unreadCount > 0;
                  return (
                    <li key={item.id}>
                      <NavLink
                        to={item.path}
                        end={item.path === '/'}
                        title={sidebarCollapsed ? item.label : undefined}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-[#2563EB] text-white'
                              : 'text-slate-300 hover:bg-white/8 hover:text-white',
                            sidebarCollapsed && 'justify-center px-2'
                          )
                        }
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {!sidebarCollapsed && (
                          <span className="truncate flex-1">{item.label}</span>
                        )}
                        {!sidebarCollapsed && showBadge && (
                          <span className="font-mono-num text-[11px] font-semibold bg-[#F59E0B] text-[#101F35] rounded px-1.5 py-0.5 leading-none">
                            {unreadCount}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {!sidebarCollapsed && (
          <div className="p-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setAdminPolicyDrawerOpen(true)}
              className="w-full flex items-center justify-between gap-2 rounded-lg bg-white/8 hover:bg-white/12 px-3 py-2 text-left text-xs text-slate-200 transition-colors cursor-pointer"
            >
              <div className="min-w-0">
                <div className="font-semibold text-white truncate">
                  {company.name}
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  Switch Company / Policy
                </div>
              </div>
              <SlidersHorizontal className="w-4 h-4 text-[#F59E0B] shrink-0" />
            </button>
          </div>
        )}
      </aside>

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar: Mobile compact (52px) & Desktop (56px) */}
        <header className="sticky top-0 z-30 h-[52px] lg:h-14 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden min-h-[44px] min-w-[44px] -ml-1.5 flex items-center justify-center rounded-lg text-[#101F35] hover:bg-slate-100 cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex lg:hidden items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-md bg-[#101F35] text-[#F59E0B] flex items-center justify-center shrink-0">
                <BrandIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#101F35] truncate leading-tight">
                  {site.name}
                </div>
                <div className="text-[11px] text-[#64748B] truncate leading-tight">
                  {project.name}
                </div>
              </div>
            </div>

            {/* Desktop Project & Site Selector */}
            <div className="hidden lg:flex items-center gap-2 min-w-0">
              <Building2 className="w-4 h-4 text-[#64748B] shrink-0" />
              <select
                aria-label="Select project and site"
                value={`${project.id}::${site.id}`}
                onChange={(e) => {
                  const [pId, sId] = e.target.value.split('::');
                  if (pId && sId) setProjectAndSite(pId, sId);
                }}
                className="text-sm font-medium text-[#101F35] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2563EB] max-w-[360px] truncate cursor-pointer"
              >
                {companyProjects.map((p) =>
                  projectSites
                    .filter((s) => s.projectId === p.id)
                    .map((s) => (
                      <option key={s.id} value={`${p.id}::${s.id}`}>
                        {p.name} — {s.name}
                      </option>
                    ))
                )}
              </select>
              <span className="text-xs text-[#64748B] whitespace-nowrap">
                · Sample Demo Workspace
              </span>
            </div>
          </div>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Offline Mode Toggle & Sync */}
            <button
              type="button"
              onClick={() => setOfflineMode(!offlineMode)}
              title="Toggle simulated field offline mode"
              className={cn(
                'min-h-[36px] inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0',
                offlineMode
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              )}
            >
              {offlineMode ? (
                <CloudOff className="w-3.5 h-3.5 text-[#F59E0B]" />
              ) : (
                <Wifi className="w-3.5 h-3.5 text-[#16A34A]" />
              )}
              <span className="hidden sm:inline">
                {offlineMode ? 'Offline Mode' : 'Online'}
              </span>
            </button>

            {queuedCount > 0 && (
              <button
                type="button"
                onClick={runSyncQueue}
                className="min-h-[36px] inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] text-white px-2.5 py-1 text-xs font-medium hover:bg-[#1D4ED8] cursor-pointer whitespace-nowrap shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="font-mono-num">Sync ({queuedCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setAdminPolicyDrawerOpen(true)}
              title="Switch Company Size / Role Policy"
              className="hidden sm:inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-[#172B4D] hover:bg-slate-50 cursor-pointer whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Role & Policy</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/notifications')}
              aria-label={`Notifications (${unreadCount} unread)`}
              className="relative min-h-[44px] min-w-[44px] lg:min-h-[38px] lg:min-w-[38px] flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 cursor-pointer shrink-0"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded bg-[#DC2626] text-white font-mono-num text-[10px] font-semibold flex items-center justify-center leading-none">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="hidden md:flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
            >
              <div className="w-7 h-7 rounded-md bg-[#101F35] text-white text-xs font-semibold flex items-center justify-center shrink-0">
                {user.name
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)}
              </div>
              <div className="text-left leading-tight">
                <div className="text-xs font-semibold text-[#101F35] whitespace-nowrap">
                  {user.name}
                </div>
                <div className="text-[11px] text-[#64748B] whitespace-nowrap">
                  {user.role === 'site_manager_hybrid'
                    ? 'Site Manager + Supervisor'
                    : user.role === 'site_manager'
                    ? 'Site Manager'
                    : 'Supervisor'}
                </div>
              </div>
            </button>
          </div>
        </header>

        {/* Offline Queue Status Strip (when offline or items pending) */}
        {(offlineMode || queuedCount > 0) && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2">
            <span>
              {offlineMode
                ? 'Offline field mode active: New submissions save locally as queued drafts and wait for server confirmation.'
                : `${queuedCount} offline record(s) waiting for server synchronization.`}
            </span>
            {!offlineMode && queuedCount > 0 && (
              <button
                type="button"
                onClick={runSyncQueue}
                className="font-semibold text-[#2563EB] hover:underline cursor-pointer"
              >
                Synchronize now
              </button>
            )}
          </div>
        )}

        {/* Main Workspace Viewport */}
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-20 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Fixed Bottom Tab Navigation (56px height) */}
      <nav
        aria-label="Mobile bottom navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-14 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-5 items-center pb-safe"
      >
        {MOBILE_BOTTOM_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.id}
              to={tab.path}
              end={tab.path === '/'}
              className={({ isActive }) =>
                cn(
                  'h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                  isActive ? 'text-[#2563EB]' : 'text-[#64748B]'
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-[#64748B] cursor-pointer"
        >
          <Menu className="w-5 h-5" />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile Slide-out Navigation Drawer */}
      {mobileDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex bg-[#101F35]/60 backdrop-blur-[2px]"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div
            className="w-[84%] max-w-[320px] bg-[#101F35] text-slate-200 h-full flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-14 flex items-center justify-between px-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#F59E0B] text-[#101F35] flex items-center justify-center">
                  <BrandIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">BuildFlow</div>
                  <div className="text-[11px] text-slate-300 truncate max-w-[170px]">
                    {company.name}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close navigation menu"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-white/10 space-y-2">
              <label className="block text-[11px] text-slate-400">
                Active Project & Site
              </label>
              <select
                value={`${project.id}::${site.id}`}
                onChange={(e) => {
                  const [pId, sId] = e.target.value.split('::');
                  if (pId && sId) setProjectAndSite(pId, sId);
                }}
                className="w-full text-xs font-medium bg-[#182B47] text-white border border-white/15 rounded-lg px-2.5 py-2"
              >
                {companyProjects.map((p) =>
                  projectSites
                    .filter((s) => s.projectId === p.id)
                    .map((s) => (
                      <option key={s.id} value={`${p.id}::${s.id}`}>
                        {p.name} — {s.name}
                      </option>
                    ))
                )}
              </select>
            </div>

            <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
              {visibleGroups.map((group) => (
                <div key={group.groupLabel}>
                  <div className="px-2 pb-1 text-[11px] font-semibold tracking-wider text-slate-400">
                    {group.groupLabel}
                  </div>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.id}>
                          <NavLink
                            to={item.path}
                            end={item.path === '/'}
                            className={({ isActive }) =>
                              cn(
                                'min-h-[44px] flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                                isActive
                                  ? 'bg-[#2563EB] text-white'
                                  : 'text-slate-200 hover:bg-white/10'
                              )
                            }
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span>{item.label}</span>
                          </NavLink>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>

            <div className="p-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  setAdminPolicyDrawerOpen(true);
                }}
                className="w-full min-h-[44px] flex items-center justify-between gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white cursor-pointer"
              >
                <span>Company Context & Policy</span>
                <SlidersHorizontal className="w-4 h-4 text-[#F59E0B]" />
              </button>
            </div>
          </div>
        </div>
      )}

      <PolicySimulatorModal
        open={adminPolicyDrawerOpen}
        onClose={() => setAdminPolicyDrawerOpen(false)}
      />
    </div>
  );
}
