import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Send } from 'lucide-react';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { StatusIndicator } from '@/src/components/shared/StatusIndicator';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { communicationService } from '@/src/services/communicationService';
import { toast } from 'sonner';

export function MessagesPage() {
  const { ctx, user, site } = useAuthContext();
  const queryClient = useQueryClient();
  const [msgType, setMsgType] = React.useState<'Reply' | 'Escalation'>('Reply');
  const [subject, setSubject] = React.useState('');
  const [body, setBody] = React.useState('');

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', ctx.companyId, ctx.siteId],
    queryFn: () => communicationService.listMessages(ctx),
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      communicationService.sendMessage(ctx, {
        type: msgType,
        subject,
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Operational message sent to site channel.');
      setSubject('');
      setBody('');
    },
  });

  const ackMutation = useMutation({
    mutationFn: (id: string) => communicationService.acknowledgeMessage(ctx, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Acknowledged site update.');
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      toast.error('Enter subject and message details.');
      return;
    }
    sendMutation.mutate();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Site Manager Updates & Communication"
        metadata={[site.name, `Site Manager: ${site.siteManagerName}`, 'Scoped to authorized site leadership only']}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 space-y-3">
          {messages.map((m) => {
            const acked = m.acknowledgedByIds.includes(user.id);
            return (
              <div
                key={m.id}
                className="rounded-xl border border-slate-200 bg-white p-4 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#101F35]">
                      {m.senderName}
                    </span>
                    <span className="text-xs text-[#64748B]">({m.senderRole})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusIndicator
                      label={m.type}
                      tone={m.type === 'Escalation' ? 'danger' : 'info'}
                    />
                    <span className="text-xs font-mono-num text-[#64748B]">
                      {m.timestamp}
                    </span>
                  </div>
                </div>

                <div className="text-sm font-semibold text-[#101F35]">
                  {m.subject}
                </div>
                <p className="text-sm text-[#172B4D] leading-relaxed">{m.body}</p>

                <div className="pt-1">
                  {acked ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#16A34A]">
                      <Check className="w-3.5 h-3.5" /> Acknowledged
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => ackMutation.mutate(m.id)}
                    >
                      Acknowledge
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Send Update or Escalate Site Issue</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#101F35] mb-1">
                  Communication Type
                </label>
                <select
                  value={msgType}
                  onChange={(e) => setMsgType(e.target.value as 'Reply' | 'Escalation')}
                  className="w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="Reply">Operational Update / Reply</option>
                  <option value="Escalation">Escalate Site Issue to Site Manager</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#101F35] mb-1">
                  Subject
                </label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Additional 4 masons needed for tomorrow"
                  className="w-full min-h-[40px] rounded-lg border border-slate-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#101F35] mb-1">
                  Message
                </label>
                <textarea
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Provide zone details, crew impact, or urgent request..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={sendMutation.isPending}
              >
                <Send className="w-4 h-4" />
                {sendMutation.isPending ? 'Sending...' : 'Send to Site Manager Channel'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
