import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Eye, FileText, Search, Upload } from 'lucide-react';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { Button } from '@/src/components/ui/button';
import { ResponsiveModal } from '@/src/components/ui/dialog';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { communicationService } from '@/src/services/communicationService';
import type { SiteDocument } from '@/src/types/models';
import { toast } from 'sonner';

export function DocumentsPage() {
  const { ctx, site } = useAuthContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState('All');
  const [previewDoc, setPreviewDoc] = React.useState<SiteDocument | null>(null);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState('');
  const [newCategory, setNewCategory] = React.useState<SiteDocument['category']>('Daily Work Plans');
  const [newFileName, setNewFileName] = React.useState('');
  const [newSummary, setNewSummary] = React.useState('');

  const { data: docs = [] } = useQuery({
    queryKey: ['documents', ctx.companyId, ctx.siteId],
    queryFn: () => communicationService.listDocuments(ctx),
  });

  const uploadMutation = useMutation({
    mutationFn: () =>
      communicationService.uploadDocument(ctx, {
        title: newTitle,
        category: newCategory,
        fileName: newFileName || 'Site_Attachment_Nov18.pdf',
        summary: newSummary,
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(`Uploaded "${created.title}" to site repository.`);
      setUploadOpen(false);
      setNewTitle('');
      setNewFileName('');
      setNewSummary('');
    },
  });

  const filtered = docs.filter((d) => {
    const q = search.trim().toLowerCase();
    if (
      q &&
      !d.title.toLowerCase().includes(q) &&
      !d.fileName.toLowerCase().includes(q)
    ) {
      return false;
    }
    if (category !== 'All' && d.category !== category) return false;
    return true;
  });

  const handleSimulatedDownload = (doc: SiteDocument) => {
    const content = `BuildFlow Site Document Summary\nTitle: ${doc.title}\nFile: ${doc.fileName}\nVersion: ${doc.version}\nSite: ${site.name}\n\n${doc.summary}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.fileName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${doc.fileName} via private signed access.`);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Authorized Site Documents"
        metadata={[site.name, 'Private tenant-scoped storage · Supervisor permitted files only']}
        actions={
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="w-4 h-4" />
            Upload Attachment
          </Button>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search drawings, permits, safety SOPs..."
            className="w-full min-h-[40px] rounded-lg border border-slate-300 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          aria-label="Filter document category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 text-sm"
        >
          <option value="All">All Categories</option>
          <option value="Approved Drawings">Approved Drawings</option>
          <option value="Site Safety Instructions">Site Safety Instructions</option>
          <option value="Daily Work Plans">Daily Work Plans</option>
          <option value="Work Permits">Work Permits</option>
          <option value="Equipment Operating Instructions">Equipment Instructions</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.length === 0 ? (
          <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-[#64748B]">
            No authorized documents match your filter.
          </div>
        ) : (
          filtered.map((doc) => (
            <div
              key={doc.id}
              className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between gap-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#2563EB]">
                    <FileText className="w-4 h-4 shrink-0" />
                    <span>{doc.category}</span>
                  </div>
                  <span className="font-mono-num text-xs text-[#64748B]">
                    {doc.version} · {doc.fileSizeLabel}
                  </span>
                </div>
                <div className="text-sm font-semibold text-[#101F35]">
                  {doc.title}
                </div>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  {doc.summary}
                </p>
              </div>

              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                <span className="text-[#64748B] truncate">{doc.fileName}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewDoc(doc)}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSimulatedDownload(doc)}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <ResponsiveModal
        open={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.title || 'Document Preview'}
        subtitle={previewDoc ? `${previewDoc.fileName} · ${previewDoc.version} · ${previewDoc.uploadedBy}` : ''}
      >
        {previewDoc && (
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <div className="text-xs font-semibold text-[#64748B]">
                Scoped Signed Access Summary
              </div>
              <p className="text-[#172B4D]">{previewDoc.summary}</p>
              <div className="text-xs font-mono-num text-[#64748B]">
                Uploaded: {previewDoc.uploadedAt} · Size: {previewDoc.fileSizeLabel}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPreviewDoc(null)}>
                Close
              </Button>
              <Button onClick={() => handleSimulatedDownload(previewDoc)}>
                <Download className="w-4 h-4" />
                Download File
              </Button>
            </div>
          </div>
        )}
      </ResponsiveModal>

      <ResponsiveModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload Operational Attachment"
        subtitle={`Scoped to ${site.name}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newTitle.trim() || !newSummary.trim()) {
              toast.error('Please enter title and summary.');
              return;
            }
            uploadMutation.mutate();
          }}
          className="space-y-3.5"
        >
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Document Title
            </label>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g., North Grid Pour Checklist"
              className="w-full min-h-[40px] rounded-lg border border-slate-300 px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Category
            </label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as SiteDocument['category'])}
              className="w-full min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="Daily Work Plans">Daily Work Plans</option>
              <option value="Site Safety Instructions">Site Safety Instructions</option>
              <option value="Work Permits">Work Permits</option>
              <option value="Site Notices">Site Notices</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Select File
            </label>
            <input
              type="file"
              onChange={(e) => setNewFileName(e.target.files?.[0]?.name || '')}
              className="w-full text-xs text-[#64748B]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#101F35] mb-1">
              Summary / Notes
            </label>
            <textarea
              rows={2}
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
            </Button>
          </div>
        </form>
      </ResponsiveModal>
    </div>
  );
}
