'use client';

import React, { useState, useEffect } from 'react';
import { Coupon } from '@/lib/types';
import { formatPaise } from '@/lib/money';
import { Sparkles, Plus, Tag, Calendar, CheckCircle, Mail, Send, ExternalLink, AlertCircle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AdminMerchandisingPage() {
  const [activeTab, setActiveTab] = useState<'coupons' | 'campaigns'>('coupons');

  // Coupon State
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [value, setValue] = useState(10);
  const [minOrder, setMinOrder] = useState(999);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Brevo Campaign State
  const [campaignName, setCampaignName] = useState('Weekend Blitz Drop Exclusive');
  const [campaignSubject, setCampaignSubject] = useState('⚡ 60-Minute Streetwear Drop: 20% Off Your Next Haul');
  const [senderName, setSenderName] = useState('MUVERA Luxury Streetwear');
  const [senderEmail, setSenderEmail] = useState('support@muvera.club');
  const [campaignHtml, setCampaignHtml] = useState(
    `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0E0E10; color: #fff; padding: 32px; border-radius: 16px;">
  <h1 style="color: #FACC15; font-size: 28px; text-align: center; margin: 0;">MUVERA</h1>
  <p style="text-align: center; color: #A1A1AA; font-size: 13px; text-transform: uppercase;">60-Minute Luxury Fashion Commerce</p>
  <div style="background: #18181B; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #2E2E38;">
    <h2 style="font-size: 20px; color: #fff; margin-top: 0;">Midnight Blitz Drop is Live!</h2>
    <p style="color: #D1C6AB; font-size: 14px; line-height: 1.6;">Explore oversized silhouettes, heavy luxury hoodies, and limited statement drops ready for 60-minute express courier delivery.</p>
    <p style="color: #FACC15; font-size: 18px; font-weight: bold;">Use Code: FLASH20 for 20% OFF</p>
    <div style="text-align: center; margin-top: 24px;">
      <a href="https://muvera.club" style="background: #FACC15; color: #000; padding: 12px 28px; border-radius: 8px; font-weight: bold; text-decoration: none;">Shop The Drop</a>
    </div>
  </div>
  <p style="text-align: center; color: #71717A; font-size: 12px;">© 2026 MUVERA Luxury Streetwear. All rights reserved.</p>
</div>`
  );
  const [sendImmediately, setSendImmediately] = useState(false);
  const [isSendingCampaign, setIsSendingCampaign] = useState(false);
  const [campaignStatus, setCampaignStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const loadCoupons = async () => {
    try {
      const res = await fetch('/api/coupons');
      const data = await res.json();
      if (data.coupons) setCoupons(data.coupons);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const newCoupon: Coupon = {
      code: code.toUpperCase().trim(),
      discountType,
      value: discountType === 'flat' ? value * 100 : value,
      minOrderValuePaise: minOrder * 100,
      expiresAt: '2027-12-31T23:59:59Z',
      usageCount: 0,
      active: true,
    };

    await fetch('/api/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCoupon),
    });

    setFeedback(`Coupon "${newCoupon.code}" created and activated!`);
    setTimeout(() => setFeedback(''), 3000);
    setIsModalOpen(false);
    loadCoupons();
    setCode('');
  };

  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingCampaign(true);
    setCampaignStatus(null);

    try {
      const res = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          subject: campaignSubject,
          htmlContent: campaignHtml,
          senderName,
          senderEmail,
          sendNow: sendImmediately,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCampaignStatus({
          success: true,
          message: data.message || `Campaign successfully created! (ID: #${data.campaignId})`,
        });
      } else {
        setCampaignStatus({
          success: false,
          message: data.message || 'Failed to create campaign via Brevo API.',
        });
      }
    } catch (err: any) {
      setCampaignStatus({
        success: false,
        message: err.message || 'Network connection failed.',
      });
    } finally {
      setIsSendingCampaign(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Toast */}
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
            Merchandising &amp; Marketing Engine
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Manage promotional discount codes, blitz drops &amp; Brevo email campaigns
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-surface-card border border-surface-border rounded-xl p-1">
            <button
              onClick={() => setActiveTab('coupons')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'coupons'
                  ? 'bg-primary text-on-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Discount Coupons
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'campaigns'
                  ? 'bg-primary text-on-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Brevo Campaigns</span>
            </button>
          </div>

          {activeTab === 'coupons' && (
            <Button onClick={() => setIsModalOpen(true)} size="sm">
              <Plus className="w-4 h-4" />
              <span>Create Coupon</span>
            </Button>
          )}
        </div>
      </div>

      {/* TAB 1: Coupons */}
      {activeTab === 'coupons' && (
        <div className="rounded-2xl bg-surface-card border border-surface-border overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-surface-border text-text-muted font-bold uppercase tracking-wider bg-surface-raised/50">
                  <th className="p-4">Coupon Code</th>
                  <th className="p-4">Discount Type</th>
                  <th className="p-4">Savings Amount</th>
                  <th className="p-4">Min Cart Value</th>
                  <th className="p-4">Usage Count</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {coupons.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-text-muted">
                      <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="font-bold text-text-primary">No coupons created yet</p>
                      <p className="text-xs">Click "Create Coupon" above to launch a new discount code for your shoppers.</p>
                    </td>
                  </tr>
                ) : (
                  coupons.map((c) => (
                    <tr key={c.code} className="hover:bg-surface-raised/40 transition-colors">
                      <td className="p-4 font-mono font-black text-sm text-primary">{c.code}</td>
                      <td className="p-4 text-text-surface capitalize">{c.discountType}</td>
                      <td className="p-4 font-bold text-text-primary">
                        {c.discountType === 'percentage' ? `${c.value}% OFF` : `${formatPaise(c.value)} OFF`}
                      </td>
                      <td className="p-4 text-text-muted font-mono">{formatPaise(c.minOrderValuePaise)}</td>
                      <td className="p-4 font-mono font-bold text-text-primary">{c.usageCount} orders</td>
                      <td className="p-4">
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Brevo Email Campaigns */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          {/* Security & IP Alert Notice */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Brevo IP Authorization &amp; Sender Protection
                </h4>
                <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                  Brevo accounts require IP authorization for API calls. If you receive an unauthorized error, add your IP in your Brevo Security Dashboard.
                </p>
              </div>
            </div>
            <a
              href="https://app.brevo.com/security/authorised_ips"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface-border text-xs font-bold text-primary transition-colors flex-shrink-0"
            >
              <span>Manage Authorized IPs</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Campaign Form */}
          <div className="bg-surface-card border border-surface-border rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                <h3 className="font-headline font-bold text-base text-text-primary">
                  Compose Brevo Email Marketing Campaign
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                API v3 Connected
              </span>
            </div>

            {campaignStatus && (
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                  campaignStatus.success
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}
              >
                {campaignStatus.success ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">{campaignStatus.success ? 'Success!' : 'Campaign Notice'}</p>
                  <p className="mt-0.5 leading-relaxed opacity-90">{campaignStatus.message}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSendCampaign} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-text-muted mb-1 block">Campaign Internal Name *</label>
                  <input
                    type="text"
                    required
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g. FLASH_DROP_WEEKEND_01"
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-text-muted mb-1 block">Subject Line *</label>
                  <input
                    type="text"
                    required
                    value={campaignSubject}
                    onChange={(e) => setCampaignSubject(e.target.value)}
                    placeholder="Subject visible to customers"
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-text-muted mb-1 block">Sender Name</label>
                  <input
                    type="text"
                    required
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary"
                  />
                </div>

                <div>
                  <label className="font-bold text-text-muted mb-1 block">Verified Sender Email *</label>
                  <input
                    type="email"
                    required
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary"
                  />
                  <p className="text-[10px] text-text-muted mt-1">Must be an active/verified sender in your Brevo account.</p>
                </div>
              </div>

              <div>
                <label className="font-bold text-text-muted mb-1 block">Campaign HTML Content *</label>
                <textarea
                  required
                  rows={8}
                  value={campaignHtml}
                  onChange={(e) => setCampaignHtml(e.target.value)}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-text-primary font-mono text-xs leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendImmediately}
                    onChange={(e) => setSendImmediately(e.target.checked)}
                    className="rounded border-surface-border bg-surface-raised text-primary focus:ring-primary w-4 h-4"
                  />
                  <span className="font-bold text-text-primary">Dispatch Immediately to List (SendNow API)</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" disabled={isSendingCampaign} size="md">
                  <Send className="w-4 h-4" />
                  <span>{isSendingCampaign ? 'Sending to Brevo API...' : 'Create Campaign via Brevo'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Coupon Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface-card border border-surface-border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-surface-border">
              <h3 className="font-headline font-bold text-base text-text-primary">Create New Coupon</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-text-muted mb-1 block">Promo Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FLASH20"
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary uppercase font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-text-muted mb-1 block">Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-text-muted mb-1 block">Value *</label>
                  <input
                    type="number"
                    required
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-text-muted mb-1 block">Min Cart Value (₹) *</label>
                <input
                  type="number"
                  required
                  value={minOrder}
                  onChange={(e) => setMinOrder(Number(e.target.value))}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-2.5 text-text-primary font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" onClick={() => setIsModalOpen(false)} variant="outline" size="sm" fullWidth>
                  Cancel
                </Button>
                <Button type="submit" size="sm" fullWidth>
                  Create &amp; Activate
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
