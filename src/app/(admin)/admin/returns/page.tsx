'use client';

import React, { useState } from 'react';
import { ReturnRequest } from '@/lib/types';
import { formatPaise } from '@/lib/money';
import { RotateCcw, CheckCircle, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([
    {
      id: 'ret_101',
      returnNo: 'RET-101',
      orderId: 'ord_muv_9401',
      orderNo: 'MUV-9401',
      customerPhone: '9845012345',
      items: [
        {
          variantId: 'var_muv_01_m',
          productName: 'Nocturne Heavyweight Satin Bomber',
          size: 'M',
          quantity: 1,
          reason: 'Size too tight around shoulders',
        },
      ],
      resolutionPreference: 'upi_refund',
      status: 'received',
      refundAmountPaise: 350910,
      createdAt: '2026-10-02T14:15:00Z',
    },
  ]);

  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [inspectionDecision, setInspectionDecision] = useState<'restock' | 'damaged'>('restock');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleInspect = (ret: ReturnRequest) => {
    setSelectedReturn(ret);
    setIsModalOpen(true);
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn) return;

    setFeedback(
      `Return #${selectedReturn.returnNo} approved! Item ${inspectionDecision === 'restock' ? 'restocked to available inventory' : 'marked as damaged'}. UPI Refund of ${formatPaise(selectedReturn.refundAmountPaise)} initiated.`
    );
    setTimeout(() => setFeedback(''), 4000);

    setReturns((prev) =>
      prev.map((r) => (r.id === selectedReturn.id ? { ...r, status: 'closed' } : r))
    );
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Toast Alert */}
      {feedback && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-500 text-surface-base px-4 py-2.5 rounded-full font-headline font-bold text-xs shadow-2xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="font-headline font-black text-2xl sm:text-3xl text-text-primary">
          Returns &amp; Instant Refunds Desk
        </h1>
        <p className="text-xs text-text-muted mt-0.5">
          Inspect returned garments, trigger automated restock &amp; process idempotent UPI refunds
        </p>
      </div>

      {/* Returns Queue */}
      <div className="rounded-2xl bg-surface-card border border-surface-border overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-surface-border text-text-muted font-bold uppercase tracking-wider bg-surface-raised/50">
                <th className="p-4">Return ID</th>
                <th className="p-4">Order Reference</th>
                <th className="p-4">Item &amp; Reason</th>
                <th className="p-4">Refund Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {returns.map((ret) => (
                <tr key={ret.id} className="hover:bg-surface-raised/40 transition-colors">
                  <td className="p-4 font-mono font-bold text-text-primary">#{ret.returnNo}</td>
                  <td className="p-4 text-text-muted">#{ret.orderNo}</td>
                  <td className="p-4">
                    <p className="font-bold text-text-primary">{ret.items[0]?.productName} ({ret.items[0]?.size})</p>
                    <p className="text-[11px] text-text-muted">{ret.items[0]?.reason}</p>
                  </td>
                  <td className="p-4 font-mono font-black text-primary text-sm">
                    {formatPaise(ret.refundAmountPaise)}
                  </td>
                  <td className="p-4">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        ret.status === 'closed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse'
                      }`}
                    >
                      {ret.status === 'closed' ? 'Refund Completed' : 'Awaiting Inspection'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {ret.status !== 'closed' ? (
                      <Button onClick={() => handleInspect(ret)} size="sm">
                        Inspect &amp; Refund
                      </Button>
                    ) : (
                      <span className="text-text-muted font-bold text-xs">Closed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspection Modal */}
      {isModalOpen && selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface-card border border-surface-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-surface-border">
              <h3 className="font-headline font-bold text-base text-text-primary">
                Inspect Return #{selectedReturn.returnNo}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProcessRefund} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-surface-raised border border-surface-border space-y-1">
                <p className="font-bold text-text-primary">{selectedReturn.items[0]?.productName}</p>
                <p className="text-text-muted">Customer Reason: {selectedReturn.items[0]?.reason}</p>
                <p className="text-primary font-mono font-bold">
                  Refund Due: {formatPaise(selectedReturn.refundAmountPaise)}
                </p>
              </div>

              <div>
                <label className="font-bold text-text-muted mb-1 block">Physical Condition &amp; Action *</label>
                <select
                  value={inspectionDecision}
                  onChange={(e) => setInspectionDecision(e.target.value as any)}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary"
                >
                  <option value="restock">Pristine with tags intact (Restock to Available Stock)</option>
                  <option value="damaged">Damaged / Stained / Washed (Write-off damage movement)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" onClick={() => setIsModalOpen(false)} variant="outline" size="sm" fullWidth>
                  Cancel
                </Button>
                <Button type="submit" size="sm" fullWidth>
                  Trigger Instant UPI Refund
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
