import { AttendanceExceptionModal } from '@/src/components/modals/AttendanceExceptionModal';
import { TaskCreateModal } from '@/src/components/modals/TaskCreateModal';
import { AddWorkerModal } from '@/src/components/modals/AddWorkerModal';
import { PurchaseRequestModal } from '@/src/components/modals/PurchaseRequestModal';
import { MaterialReceiptModal } from '@/src/components/modals/MaterialReceiptModal';
import { DailyReportModal } from '@/src/components/modals/DailyReportModal';
import { SafetyIncidentModal } from '@/src/components/modals/SafetyIncidentModal';
import { useAppStore } from '@/src/store/useAppStore';

export function QuickActionController() {
  const { quickActionModal, setQuickActionModal } = useAppStore();
  const close = () => setQuickActionModal(null);

  return (
    <>
      <AttendanceExceptionModal
        open={quickActionModal === 'attendance_exception'}
        onClose={close}
      />
      <TaskCreateModal
        open={quickActionModal === 'assign_task'}
        onClose={close}
      />
      <AddWorkerModal
        open={quickActionModal === 'add_worker'}
        onClose={close}
      />
      <PurchaseRequestModal
        open={quickActionModal === 'purchase_request'}
        onClose={close}
      />
      <MaterialReceiptModal
        open={quickActionModal === 'material_receipt'}
        onClose={close}
      />
      <DailyReportModal
        open={quickActionModal === 'daily_report'}
        onClose={close}
      />
      <SafetyIncidentModal
        open={quickActionModal === 'safety_incident'}
        onClose={close}
      />
    </>
  );
}
