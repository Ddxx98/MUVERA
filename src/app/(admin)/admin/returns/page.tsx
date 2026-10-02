'use client';

import React, { useState, useEffect } from 'react';
import { ReturnRequest } from '@/lib/types';
import { formatPaise } from '@/lib/money';
import { RotateCcw, CheckCircle, AlertTriangle, ShieldCheck, RefreshCw, PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AdminReturnsPage() {
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [inspectionDecision, setInspectionDecision] = useState<'restock' | 'damaged'>('restock');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadReturns = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/returns');
      const data = await res.json();
      if (data.returns) {
        setReturns(data.returns);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, []);

  const handleInspect = (ret: ReturnRequest) => {
    setSelectedReturn(ret);
    setIsModalOpen(true);
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn) return;

    setProcessing(true);
    try {
      const res = await fetch('/api/returns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedReturn.id || selectedReturn.returnNo,
          status: 'closed',
          inspectionDecision: inspectionDecision === 'restock' ? 'restock' : 'damaged_write_off',
        }),
      });

      if (res.ok) {
        setFeedback(
          `Return #${selectedReturn.returnNo} approved! Item ${inspectionDecision === 'restock' ? 'restocked to available inventory' : 'marked as damaged'}. UPI Refund of ${formatPaise(selectedReturn.refundAmountPaise)} completed.`
        );
        setTimeout(() => setFeedback(''), 5000);
        await loadReturns();
      } else {
        setFeedback('Failed to update return status');
      }
    } catch {
      setFeedback('Error processing return request');
    } finally {
      setProcessing(false);
      setIsModalOpen(false);
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline font-black text-2xl sm:text-3xl text-text-primary">
            Returns &amp; Instant Refunds Desk
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Inspect returned garments, trigger automated restock &amp; process idempotent UPI refunds
          </p>
        </div>

        <button
          onClick={loadReturns}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-surface-border text-xs font-bold text-text-muted hover:text-text-primary hover:bg-surface-raised transition-all w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Returns Queue */}
      <div className="rounded-2xl bg-surface-card border border-surface-border overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
            <p className="text-xs text-text-muted">Loading returns queue from MongoDB Atlas...</p>
          </div>
        ) : returns.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <PackageOpen className="w-12 h-12 text-text-muted mx-auto opacity-40" />
            <div>
              <p className="text-sm font-bold text-text-primary">No return requests pending</p>
              <p className="text-xs text-text-muted mt-0.5">
                When customers submit return requests from order tracking, they will appear here for inspection.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-surface-border text-text-muted font-bold uppercase tracking-wider bg-surface-raised/50">
                  <th className="p-4">Return ID</th>
                  <th className="p-4">Order Reference</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Item &amp; Reason</th>
                  <th className="p-4">Refund Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {returns.map((ret) => (
                  <tr key={ret.id || ret.returnNo} className="hover:bg-surface-raised/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-text-primary">#{ret.returnNo}</td>
                    <td className="p-4 text-text-muted">#{ret.orderNo}</td>
                    <td className="p-4 font-mono text-text-primary">{ret.customerPhone}</td>
                    <td className="p-4">
                      <p className="font-bold text-text-primary">
                        {ret.items[0]?.productName} ({ret.items[0]?.size})
                      </p>
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
                        <span className="text-[11px] text-emerald-400 font-bold flex items-center justify-end gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Closed</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QC & Refund Modal */}
      {isModalOpen && selectedReturn && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div>
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Return Quality Control &amp; Instant Refund</span>
              </div>
              <h2 className="font-headline font-black text-xl text-text-primary mt-1">
                Inspect Return #{selectedReturn.returnNo}
              </h2>
              <p className="text-xs text-text-muted">Order #{selectedReturn.orderNo} • Customer {selectedReturn.customerPhone}</p>
            </div>

            <div className="p-4 rounded-xl bg-surface-raised border border-surface-border space-y-2 text-xs">
              <p className="text-text-muted">Item Details:</p>
              <p className="font-bold text-text-primary">{selectedReturn.items[0]?.productName}</p>
              <p className="text-[11px] text-text-muted">Size: {selectedReturn.items[0]?.size}</p>
              <p className="text-[11px] text-amber-400/90 font-medium">Customer Reason: {selectedReturn.items[0]?.reason}</p>
            </div>

            <form onSubmit={handleProcessRefund} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-text-muted uppercase">Physical Garment Inspection</label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setInspectionDecision('restock')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all text-left space-y-1 ${
                      inspectionDecision === 'restock'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-surface-border bg-surface-raised text-text-muted hover:border-surface-border/80'
                    }`}
                  >
                    <p className="font-black text-sm">Pass &amp; Restock</p>
                    <p className="text-[10px] opacity-75">Tags intact, unworn, pristine</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInspectionDecision('damaged')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all text-left space-y-1 ${
                      inspectionDecision === 'damaged'
                        ? 'border-red-500 bg-red-500/10 text-red-400'
                        : 'border-surface-border bg-surface-raised text-text-muted hover:border-surface-border/80'
                    }`}
                  >
                    <p className="font-black text-sm">Damaged / Flawed</p>
                    <p className="text-[10px] opacity-75">Write off, do not restock</p>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-1">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-text-muted">Instant Refund Amount:</span>
                  <span className="text-primary font-mono font-black text-base">
                    {formatPaise(selectedReturn.refundAmountPaise)}
                  </span>
                </div>
                <p className="text-[10px] text-text-muted">Disburses to customer UPI ({selectedReturn.customerPhone}@upi) via Indiranagar Settlement Node</p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={processing}>
                  {processing ? 'Processing...' : 'Confirm & Refund'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
