import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AppShell } from '@/src/components/layout/AppShell';
import { QuickActionController } from '@/src/components/modals/QuickActionController';
import { DashboardPage } from '@/src/pages/Dashboard/DashboardPage';
import { MySitePage } from '@/src/pages/MySite/MySitePage';
import { MyCrewPage } from '@/src/pages/MyCrew/MyCrewPage';
import { AttendancePage } from '@/src/pages/Attendance/AttendancePage';
import { TasksPage } from '@/src/pages/Tasks/TasksPage';
import { AvailabilityPage } from '@/src/pages/Availability/AvailabilityPage';
import { WorkProgressPage } from '@/src/pages/WorkProgress/WorkProgressPage';
import { PurchasesPage } from '@/src/pages/Purchases/PurchasesPage';
import { MaterialRequirementsPage } from '@/src/pages/Materials/MaterialRequirementsPage';
import { MaterialReceiptsPage } from '@/src/pages/MaterialReceipts/MaterialReceiptsPage';
import { DailyReportsPage } from '@/src/pages/DailyReports/DailyReportsPage';
import { SafetyPage } from '@/src/pages/Safety/SafetyPage';
import { DocumentsPage } from '@/src/pages/Documents/DocumentsPage';
import { NotificationsPage } from '@/src/pages/Notifications/NotificationsPage';
import { MessagesPage } from '@/src/pages/Messages/MessagesPage';
import { ProfilePage } from '@/src/pages/Profile/ProfilePage';
import { SupportPage } from '@/src/pages/Support/SupportPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/site" element={<MySitePage />} />
            <Route path="/crew" element={<MyCrewPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/availability" element={<AvailabilityPage />} />
            <Route path="/progress" element={<WorkProgressPage />} />
            <Route path="/purchases" element={<PurchasesPage />} />
            <Route path="/materials" element={<MaterialRequirementsPage />} />
            <Route path="/receipts" element={<MaterialReceiptsPage />} />
            <Route path="/daily-reports" element={<DailyReportsPage />} />
            <Route path="/safety" element={<SafetyPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
        <QuickActionController />
        <Toaster position="top-right" richColors closeButton />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
