'use client';

import React, { useState, useEffect } from 'react';
import { saveSettingsAction, getSettingsAction } from '@/modules/settings/actions';
import { SiteSettingsData } from '@/modules/settings/types';
import { Button } from '@/components/ui/Button';
import {
  SlidersHorizontal,
  Building2,
  PhoneCall,
  Truck,
  CreditCard,
  Megaphone,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Save,
} from 'lucide-react';

type TabKey = 'general' | 'whatsapp' | 'policies' | 'payments' | 'announcements';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettingsData>({
    businessName: 'MUVERA Luxury Streetwear',
    tagline: '60-Minute Luxury Fashion & Streetwear Commerce',
    supportEmail: 'support@muvera.club',
    supportPhone: '+91 93809 33170',
    whatsappNumber: '919380933170',
    freeShippingThresholdPaise: 99900,
    expressDeliveryFeePaise: 9900,
    holdExpiryMinutes: 15,
    returnWindowDays: 7,
    defaultLocationName: 'Indiranagar Quick-Glam Dark Store Hub (Bengaluru)',
    defaultLocationPincode: '560038',
    businessUpiId: 'muvera.store@upi',
    businessUpiMerchantName: 'MUVERA Luxury Streetwear',
    topAnnouncementText: '⚡ EXPRESS 60-MINUTES • Dark Stores in Bengaluru • Free Express Shipping above ₹999',
    topAnnouncementActive: true,
    blitzDropHeadline: 'MIDNIGHT QUICK-GLAM BLITZ DROPS',
    blitzDropSubheadline: 'Curated high-street statement pieces ready for dispatch in 60 minutes.',
    defaultTheme: 'dark',
    upiEnabled: true,
    codEnabled: true,
    razorpayEnabled: false,
  });

  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await getSettingsAction();
        if (res.ok) {
          setSettings(res.data);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      const res = await saveSettingsAction(settings);
      if (res.ok) {
        setSettings(res.data);
        setStatusMessage({
          type: 'success',
          text: '✅ Website variables successfully saved to MongoDB and published live!',
        });
      } else {
        setStatusMessage({ type: 'error', text: res.error.message });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-text-muted">Loading live website variables...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-6 h-6 text-primary" />
            <h1 className="font-headline font-black text-2xl text-text-primary">
              Site Settings &amp; Live CMS Variables
            </h1>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Configure every variable across the entire platform in real time with MongoDB persistence.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          size="md"
          className="flex items-center gap-2 shadow-gold-glow"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? 'Publishing...' : 'Save & Publish Live'}</span>
        </Button>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold border transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 p-1.5 rounded-2xl bg-surface-card border border-surface-border no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'general'
              ? 'bg-primary text-surface-base shadow-sm'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Brand &amp; Identity</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('whatsapp')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'whatsapp'
              ? 'bg-primary text-surface-base shadow-sm'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <PhoneCall className="w-4 h-4" />
          <span>WhatsApp &amp; Operations</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('policies')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'policies'
              ? 'bg-primary text-surface-base shadow-sm'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Commerce &amp; Policies</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'payments'
              ? 'bg-primary text-surface-base shadow-sm'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payments &amp; UPI</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('announcements')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'announcements'
              ? 'bg-primary text-surface-base shadow-sm'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Announcements &amp; CMS</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Tab 1: General & Brand */}
        {activeTab === 'general' && (
          <div className="p-6 rounded-3xl bg-surface-card border border-surface-border space-y-4 shadow-xl">
            <h2 className="font-headline font-bold text-base text-text-primary border-b border-surface-border pb-2">
              Brand Identity &amp; Support Contact
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-text-muted mb-1 block">Brand / Business Name *</label>
                <input
                  type="text"
                  required
                  value={settings.businessName}
                  onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-text-muted mb-1 block">Brand Tagline</label>
                <input
                  type="text"
                  value={settings.tagline}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary font-medium focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-text-muted mb-1 block">Customer Support Email</label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary font-medium focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-text-muted mb-1 block">Customer Support Phone / Helpline</label>
                <input
                  type="text"
                  value={settings.supportPhone}
                  onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary font-medium focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: WhatsApp & Operations */}
        {activeTab === 'whatsapp' && (
          <div className="p-6 rounded-3xl bg-surface-card border border-surface-border space-y-4 shadow-xl">
            <h2 className="font-headline font-bold text-base text-text-primary border-b border-surface-border pb-2">
              WhatsApp Order Gateway &amp; Hub Logistics
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-text-muted mb-1 block">
                  WhatsApp Business Number (with country code, e.g. 919380933170) *
                </label>
                <input
                  type="text"
                  required
                  value={settings.whatsappNumber}
                  onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value.replace(/\D/g, '') })}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary font-mono font-bold focus:outline-none focus:border-primary"
                />
                <p className="text-[11px] text-text-muted mt-1">
                  All customer 1-click WhatsApp order bookings will open this number with pre-formatted receipts.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-text-muted mb-1 block">
                  Default Quick-Commerce Dark Store Hub
                </label>
                <input
                  type="text"
                  value={settings.defaultLocationName}
                  onChange={(e) => setSettings({ ...settings, defaultLocationName: e.target.value })}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-text-muted mb-1 block">
                  Primary Dark Store Pincode
                </label>
                <input
                  type="text"
                  value={settings.defaultLocationPincode}
                  onChange={(e) => setSettings({ ...settings, defaultLocationPincode: e.target.value })}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary font-mono font-bold focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Commerce & Policies */}
        {activeTab === 'policies' && (
          <div className="p-6 rounded-3xl bg-surface-card border border-surface-border space-y-4 shadow-xl">
            <h2 className="font-headline font-bold text-base text-text-primary border-b border-surface-border pb-2">
              Commerce, Shipping &amp; Stock Policies
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-text-muted mb-1 block">
                  Free Express Shipping Threshold (in ₹)
                </label>
                <div className="flex items-center bg-surface-raised border border-surface-border rounded-xl px-3 py-2.5">
                  <span className="text-xs font-bold text-primary mr-2">₹</span>
                  <input
                    type="number"
                    min={0}
                    value={settings.freeShippingThresholdPaise / 100}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        freeShippingThresholdPaise: Math.round(Number(e.target.value) * 100),
                      })
                    }
                    className="w-full bg-transparent text-xs text-text-primary font-bold focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-text-muted mt-1">Orders above this amount get free express delivery.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-text-muted mb-1 block">
                  Express 60-Minute Delivery Fee (in ₹)
                </label>
                <div className="flex items-center bg-surface-raised border border-surface-border rounded-xl px-3 py-2.5">
                  <span className="text-xs font-bold text-primary mr-2">₹</span>
                  <input
                    type="number"
                    min={0}
                    value={settings.expressDeliveryFeePaise / 100}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        expressDeliveryFeePaise: Math.round(Number(e.target.value) * 100),
                      })
                    }
                    className="w-full bg-transparent text-xs text-text-primary font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-text-muted mb-1 block">
                  Stock Reservation Hold Duration (Minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={settings.holdExpiryMinutes}
                  onChange={(e) => setSettings({ ...settings, holdExpiryMinutes: Number(e.target.value) })}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary font-bold focus:outline-none focus:border-primary"
                />
                <p className="text-[11px] text-text-muted mt-1">Time inventory is held at checkout before automated background release.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-text-muted mb-1 block">
                  Customer Return Window (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={settings.returnWindowDays}
                  onChange={(e) => setSettings({ ...settings, returnWindowDays: Number(e.target.value) })}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary font-bold focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Payments & UPI */}
        {activeTab === 'payments' && (
          <div className="p-6 rounded-3xl bg-surface-card border border-surface-border space-y-4 shadow-xl">
            <h2 className="font-headline font-bold text-base text-text-primary border-b border-surface-border pb-2">
              Payments &amp; Direct UPI Banking Gateway
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-text-muted mb-1 block">
                  Business Official UPI VPA / ID (e.g. muvera.store@upi) *
                </label>
                <input
                  type="text"
                  required
                  value={settings.businessUpiId}
                  onChange={(e) => setSettings({ ...settings, businessUpiId: e.target.value })}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary font-mono font-bold focus:outline-none focus:border-primary"
                />
                <p className="text-[11px] text-text-muted mt-1">
                  Dynamic on-screen QR codes in checkout will encode this UPI address.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-text-muted mb-1 block">
                  UPI Registered Merchant Name
                </label>
                <input
                  type="text"
                  value={settings.businessUpiMerchantName}
                  onChange={(e) => setSettings({ ...settings, businessUpiMerchantName: e.target.value })}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary font-bold focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-surface-border space-y-3">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Enabled Payment Channels</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 p-3 rounded-xl bg-surface-raised border border-surface-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.upiEnabled}
                    onChange={(e) => setSettings({ ...settings, upiEnabled: e.target.checked })}
                    className="accent-primary w-4 h-4"
                  />
                  <span className="text-xs font-bold text-text-primary">Instant UPI &amp; QR Scan</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl bg-surface-raised border border-surface-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.codEnabled}
                    onChange={(e) => setSettings({ ...settings, codEnabled: e.target.checked })}
                    className="accent-primary w-4 h-4"
                  />
                  <span className="text-xs font-bold text-text-primary">Cash on Delivery (COD)</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl bg-surface-raised border border-surface-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.razorpayEnabled}
                    onChange={(e) => setSettings({ ...settings, razorpayEnabled: e.target.checked })}
                    className="accent-primary w-4 h-4"
                  />
                  <span className="text-xs font-bold text-text-primary">Online Gateway (Razorpay)</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Announcements & CMS */}
        {activeTab === 'announcements' && (
          <div className="p-6 rounded-3xl bg-surface-card border border-surface-border space-y-4 shadow-xl">
            <h2 className="font-headline font-bold text-base text-text-primary border-b border-surface-border pb-2">
              Storefront Banners &amp; Editorial Marketing
            </h2>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-text-muted">Top Marquee Announcement Banner Text</label>
                  <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.topAnnouncementActive}
                      onChange={(e) => setSettings({ ...settings, topAnnouncementActive: e.target.checked })}
                      className="accent-primary w-3.5 h-3.5"
                    />
                    <span>Active on Storefront</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={settings.topAnnouncementText}
                  onChange={(e) => setSettings({ ...settings, topAnnouncementText: e.target.value })}
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary font-medium focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-text-muted mb-1 block">Blitz Drop Section Headline</label>
                  <input
                    type="text"
                    value={settings.blitzDropHeadline}
                    onChange={(e) => setSettings({ ...settings, blitzDropHeadline: e.target.value })}
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary font-bold focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-text-muted mb-1 block">Blitz Drop Section Subheadline</label>
                  <input
                    type="text"
                    value={settings.blitzDropSubheadline}
                    onChange={(e) => setSettings({ ...settings, blitzDropSubheadline: e.target.value })}
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary font-medium focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Save Bar */}
        <div className="p-4 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between shadow-lg">
          <p className="text-xs text-text-muted">
            All variables are validated and saved directly to the database. Changes reflect instantly.
          </p>
          <Button
            type="submit"
            disabled={saving}
            size="md"
            className="flex items-center gap-2 shadow-gold-glow"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Publishing...' : 'Save & Publish Live'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
