import * as React from 'react';
import { Phone, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { StatusIndicator } from '@/src/components/shared/StatusIndicator';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { useAppStore } from '@/src/store/useAppStore';
import { toast } from 'sonner';

export function SupportPage() {
  const { site, offlineMode, runSyncQueue } = useAuthContext();
  const { syncQueue, clearSyncedItems } = useAppStore();
  const [ticketSubject, setTicketSubject] = React.useState('');
  const [ticketDetails, setTicketDetails] = React.useState('');

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDetails.trim()) {
      toast.error('Please describe your issue before submitting.');
      return;
    }
    toast.success('Support request logged with BuildFlow Field Helpdesk.');
    setTicketSubject('');
    setTicketDetails('');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Help, Offline Sync Queue & Field Support"
        metadata={[site.name, 'Field operations assistance and synchronization status']}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <Card className="lg:col-span-7">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Offline Action Synchronization Queue</CardTitle>
              <p className="text-xs text-[#64748B]">
                Drafts and actions saved during weak site connectivity wait here until server confirmation.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={clearSyncedItems}>
                <Trash2 className="w-3.5 h-3.5" />
                Clear Synced
              </Button>
              <Button size="sm" disabled={offlineMode} onClick={runSyncQueue}>
                <RefreshCw className="w-3.5 h-3.5" />
                Sync Now
              </Button>
            </div>
          </CardHeader>
          <div className="divide-y divide-slate-100">
            {syncQueue.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#64748B]">
                No offline queued actions. Toggle "Offline Mode" in the top bar to test weak-signal field queuing.
              </div>
            ) : (
              syncQueue.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 sm:px-5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-[#101F35] truncate">
                      {item.title}
                    </div>
                    <div className="text-[#64748B]">
                      {item.payloadSummary} · Client time: <span className="font-mono-num">{item.createdAtClient}</span>
                      {item.serverReceivedAt ? ` · Server confirmed: ${item.serverReceivedAt}` : ''}
                    </div>
                  </div>
                  <StatusIndicator
                    label={item.status}
                    tone={
                      item.status === 'Synced'
                        ? 'success'
                        : item.status === 'Failed'
                        ? 'danger'
                        : 'warning'
                    }
                  />
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="lg:col-span-5 space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Site Emergency & Escalation Contacts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#101F35]">{site.siteManagerName}</div>
                  <div className="text-xs text-[#64748B]">Assigned Site Manager</div>
                </div>
                <a
                  href={`tel:${site.siteManagerPhone}`}
                  className="inline-flex items-center gap-1.5 font-mono-num text-xs font-semibold text-[#2563EB]"
                >
                  <Phone className="w-3.5 h-3.5" /> {site.siteManagerPhone}
                </a>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#101F35]">EHS Site Safety Desk</div>
                  <div className="text-xs text-[#64748B]">24x7 Incident Hotline</div>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-mono-num font-semibold text-[#DC2626]">
                  <ShieldCheck className="w-3.5 h-3.5" /> Ext. 108 / Emergency
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Report Application Issue</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitTicket} className="space-y-3">
                <input
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="Issue summary (e.g., Crew sync or camera upload)"
                  className="w-full min-h-[40px] rounded-lg border border-slate-300 px-3 text-sm"
                />
                <textarea
                  rows={3}
                  value={ticketDetails}
                  onChange={(e) => setTicketDetails(e.target.value)}
                  placeholder="Describe device, site zone, and steps..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <Button type="submit" size="sm" className="w-full">
                  Submit Support Request
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
