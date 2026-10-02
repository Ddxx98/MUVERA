'use client';

import React, { useState, useEffect } from 'react';
import { InventoryItem, StockMovement } from '@/lib/types';
import { inventoryService } from '@/modules/inventory/service';
import {
  Boxes,
  Plus,
  Minus,
  RefreshCw,
  AlertTriangle,
  History,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AdminInventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(5);
  const [adjustReason, setAdjustReason] = useState<'receiving' | 'damage' | 'correction'>('receiving');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const loadData = async () => {
    try {
      const res = await fetch('/api/inventory');
      const data = await res.json();
      if (data.inventory) setInventory(data.inventory);
      if (data.movements) setMovements(data.movements);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdjust = (item: InventoryItem) => {
    setSelectedItem(item);
    setAdjustQty(5);
    setAdjustReason('receiving');
    setIsModalOpen(true);
  };

  const handleExecuteAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      const delta = adjustReason === 'damage' ? -Math.abs(adjustQty) : Math.abs(adjustQty);

      await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: selectedItem.variantId,
          sku: selectedItem.sku,
          locationId: selectedItem.locationId,
          quantityDelta: delta,
          reason: adjustReason,
          actor: 'Operations Admin',
        }),
      });

      setFeedbackMessage(`Adjusted ${selectedItem.sku} (${delta > 0 ? `+${delta}` : delta} units)`);
      setTimeout(() => setFeedbackMessage(''), 3000);
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredInventory = inventory.filter((item) =>
    item.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Toast Alert */}
      {feedbackMessage && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-500 text-surface-base px-4 py-2.5 rounded-full font-headline font-bold text-xs shadow-2xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline font-black text-2xl sm:text-3xl text-text-primary">
            Real-Time Inventory Engine
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Strict transactional invariants • Dark store stock allocations • Zero-oversell protection
          </p>
        </div>

        <button
          onClick={loadData}
          className="bg-surface-card hover:bg-surface-raised border border-surface-border text-xs font-bold text-text-primary px-4 py-2 rounded-full flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-primary" />
          <span>Sync Stock</span>
        </button>
      </div>

      {/* Search & Invariants Banner */}
      <div className="p-4 rounded-2xl bg-surface-card border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by SKU (e.g. MUV-SAT, SNI-ACD, PUM-SLP)..."
          className="bg-surface-raised border border-surface-border rounded-xl px-4 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary max-w-sm w-full font-mono"
        />

        <div className="flex items-center gap-2 text-xs text-text-muted">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Formula Invariant: Available = OnHand - Reserved</span>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="rounded-2xl bg-surface-card border border-surface-border overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-surface-border text-text-muted font-bold uppercase tracking-wider bg-surface-raised/50">
                <th className="p-4">SKU / Identifier</th>
                <th className="p-4">Location</th>
                <th className="p-4 text-center">On Hand</th>
                <th className="p-4 text-center">Reserved</th>
                <th className="p-4 text-center">Available</th>
                <th className="p-4">Stock Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filteredInventory.map((item) => {
                const isLow = item.available <= item.lowStockThreshold && item.available > 0;
                const isOut = item.available <= 0;

                return (
                  <tr key={item.sku} className="hover:bg-surface-raised/40 transition-colors">
                    <td className="p-4 font-mono font-bold text-text-primary">{item.sku}</td>
                    <td className="p-4 text-text-muted">Indiranagar Dark Store Hub</td>
                    <td className="p-4 text-center font-mono font-bold text-text-primary">{item.onHand}</td>
                    <td className="p-4 text-center font-mono text-amber-400 font-bold">
                      {item.reserved}
                    </td>
                    <td className="p-4 text-center font-mono font-black text-sm text-primary">
                      {item.available}
                    </td>
                    <td className="p-4">
                      {isOut ? (
                        <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                          Out of Stock
                        </span>
                      ) : isLow ? (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 animate-pulse">
                          Low Stock ({item.available})
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Optimal
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <Button onClick={() => handleOpenAdjust(item)} variant="outline" size="sm">
                        Adjust Stock
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Movement Audit Log Section */}
      <div className="p-6 rounded-2xl bg-surface-card border border-surface-border space-y-4 shadow-xl">
        <div className="flex items-center gap-2 pb-2 border-b border-surface-border">
          <History className="w-5 h-5 text-primary" />
          <h2 className="font-headline font-bold text-base text-text-primary">Stock Movement Audit Log</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-surface-border text-text-muted font-bold uppercase tracking-wider">
                <th className="py-2.5">Timestamp</th>
                <th className="py-2.5">SKU</th>
                <th className="py-2.5">Movement Type</th>
                <th className="py-2.5 text-center">Delta</th>
                <th className="py-2.5">Actor / Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border text-text-surface">
              {movements.slice(0, 8).map((m) => (
                <tr key={m.id}>
                  <td className="py-2.5 text-text-muted font-mono text-[11px]">
                    {new Date(m.createdAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="py-2.5 font-mono font-bold text-text-primary">{m.sku}</td>
                  <td className="py-2.5">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-surface-raised border border-surface-border">
                      {m.type}
                    </span>
                  </td>
                  <td className="py-2.5 text-center font-mono font-bold">
                    <span className={m.quantityDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {m.quantityDelta >= 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                    </span>
                  </td>
                  <td className="py-2.5 text-text-muted">{m.actor} ({m.referenceId})</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Stock Adjustment Modal */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface-card border border-surface-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-surface-border">
              <div>
                <h3 className="font-headline font-bold text-base text-text-primary">Manual Stock Adjustment</h3>
                <p className="text-xs text-text-muted font-mono">{selectedItem.sku}</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteAdjustment} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-text-muted mb-1 block">Audit Reason *</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value as any)}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary focus:outline-none focus:border-primary"
                >
                  <option value="receiving">Receiving (New supplier stock intake)</option>
                  <option value="damage">Damage (Damaged item write-off)</option>
                  <option value="correction">Correction (Cycle count audit reconciliation)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-text-muted mb-1 block">Units Quantity *</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary font-mono font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <div className="p-3 rounded-xl bg-surface-raised border border-surface-border text-text-muted text-[11px] leading-relaxed">
                Current On Hand: <strong className="text-text-primary">{selectedItem.onHand}</strong> | Reserved: <strong className="text-amber-400">{selectedItem.reserved}</strong>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" onClick={() => setIsModalOpen(false)} variant="outline" size="sm" fullWidth>
                  Cancel
                </Button>
                <Button type="submit" size="sm" fullWidth>
                  Apply Adjustment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
