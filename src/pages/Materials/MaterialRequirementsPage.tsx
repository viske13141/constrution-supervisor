import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart } from 'lucide-react';
import { PageHeader } from '@/src/components/shared/PageHeader';
import { Button } from '@/src/components/ui/button';
import { StatusIndicator } from '@/src/components/shared/StatusIndicator';
import { PurchaseRequestModal } from '@/src/components/modals/PurchaseRequestModal';
import { useAuthContext } from '@/src/hooks/useAuthContext';
import { materialService } from '@/src/services/materialService';

export function MaterialRequirementsPage() {
  const { ctx, site } = useAuthContext();
  const [prefill, setPrefill] = React.useState<{
    materialCategory: string;
    materialName: string;
    quantity: number;
    unit: string;
    estimatedUnitPrice: number;
  } | null>(null);

  const { data: requirements = [] } = useQuery({
    queryKey: ['material-requirements', ctx.companyId, ctx.siteId],
    queryFn: () => materialService.listRequirements(ctx),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Material Requirements & Site Buffer"
        metadata={[site.name, 'Task-linked material demand vs. current on-site stock']}
      />

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs text-[#64748B]">
                <th className="py-3 px-4 font-semibold">Material</th>
                <th className="py-3 px-3 font-semibold">Linked Task</th>
                <th className="py-3 px-3 font-semibold text-right">Required</th>
                <th className="py-3 px-3 font-semibold text-right">On-Site</th>
                <th className="py-3 px-3 font-semibold text-right">Shortfall</th>
                <th className="py-3 px-3 font-semibold">Needed By</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requirements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-sm text-[#64748B]">
                    No material requirements scheduled for this site.
                  </td>
                </tr>
              ) : (
                requirements.map((m) => {
                  const shortfall = Math.max(0, m.requiredQty - m.onSiteQty);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#101F35]">
                          {m.materialName}
                        </div>
                        <div className="text-xs text-[#64748B]">
                          {m.materialCategory}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs text-[#172B4D]">
                        {m.allocatedTaskTitle}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num">
                        {m.requiredQty} {m.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num">
                        {m.onSiteQty} {m.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num">
                        {shortfall > 0 ? (
                          <StatusIndicator label={`${shortfall} ${m.unit}`} tone="danger" />
                        ) : (
                          <StatusIndicator label="Sufficient" tone="success" />
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono-num text-xs">
                        {m.neededByDate}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {shortfall > 0 ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setPrefill({
                                materialCategory: m.materialCategory,
                                materialName: m.materialName,
                                quantity: shortfall,
                                unit: m.unit,
                                estimatedUnitPrice: m.estimatedUnitPrice,
                              })
                            }
                          >
                            <ShoppingCart className="w-3.5 h-3.5 text-[#2563EB]" />
                            Request Shortfall
                          </Button>
                        ) : (
                          <span className="text-xs text-[#64748B]">In Stock</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PurchaseRequestModal
        open={Boolean(prefill)}
        onClose={() => setPrefill(null)}
        prefillItem={prefill || undefined}
      />
    </div>
  );
}
