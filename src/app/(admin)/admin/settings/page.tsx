'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Upload,
  Image as ImageIcon,
  Eye,
  Zap,
  Timer,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

type TabKey = 'general' | 'hero' | 'whatsapp' | 'policies' | 'payments' | 'announcements';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettingsData>({
    businessName: 'MUVERA Luxury Streetwear',
    tagline: 'Luxury Fashion & Streetwear Commerce',
    supportEmail: 'support@muvera.club',
    supportPhone: '+91 93809 33170',
    whatsappNumber: '919380933170',
    freeShippingThresholdPaise: 99900,
    expressDeliveryFeePaise: 9900,
    holdExpiryMinutes: 15,
    returnWindowDays: 7,
    defaultLocationName: 'Indiranagar Dark Store Hub (Bengaluru)',
    defaultLocationPincode: '560038',
    businessUpiId: 'muvera.store@upi',
    businessUpiMerchantName: 'MUVERA Luxury Streetwear',
    topAnnouncementText: '⚡ FAST DISPATCH • Free Express Shipping above ₹999',
    topAnnouncementActive: true,
    blitzDropHeadline: 'MIDNIGHT QUICK-GLAM BLITZ DROPS',
    blitzDropSubheadline: 'Curated high-street statement pieces ready for express dispatch.',
    defaultTheme: 'dark',
    upiEnabled: true,
    codEnabled: true,
    razorpayEnabled: false,
    heroActive: true,
    heroBackgroundImage: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1600&auto=format&fit=crop&q=80',
    heroTagBadge: 'Blitz Drop 04',
    heroSecondaryBadge: 'Try & Buy Available',
    heroEyebrow: 'Instant Nightlife Glamour',
    heroTitleLine1: 'PARTY TONIGHT?',
    heroTitleLine2: 'EXPRESS STREETWEAR',
    heroSubtitle: 'Curated streetwear, satin club edits & statement kicks delivered straight to your door with express courier shipping.',
    heroCtaText: 'Explore Drops',
    heroCtaLink: '/products',
    heroDeliveryTicker: 'Dispatches today',
  });

  const [activeTab, setActiveTab] = useState<TabKey>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Cloudinary Hero Image Upload State
  const [uploadingHero, setUploadingHero] = useState(false);
  const [heroUploadError, setHeroUploadError] = useState('');
  const heroFileInputRef = useRef<HTMLInputElement>(null);

  const handleHeroImageUpload = async (file: File) => {
    setUploadingHero(true);
    setHeroUploadError('');
    try {
      const sigRes = await fetch('/api/admin/uploads/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: 'muvera/hero',
          adminSecret: 'muvera_admin_master_secret_2026',
        }),
      });
      const sig = await sigRes.json();
      if (!sig.success) throw new Error(sig.error || 'Signature generation failed');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', sig.apiKey);
      formData.append('timestamp', String(sig.timestamp));
      formData.append('signature', sig.signature);
      formData.append('folder', sig.folder);

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (uploadData.error) throw new Error(uploadData.error.message);
      setSettings((prev) => ({ ...prev, heroBackgroundImage: uploadData.secure_url }));
    } catch (err: any) {
      setHeroUploadError(err.message || 'Image upload failed');
    } finally {
      setUploadingHero(false);
    }
  };

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
          onClick={() => setActiveTab('hero')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'hero'
              ? 'bg-primary text-surface-base shadow-sm'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Hero Banner CMS</span>
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

        {/* Tab: Hero Banner CMS */}
        {activeTab === 'hero' && (
          <div className="space-y-6">
            {/* Live Interactive Preview Card */}
            <div className="p-6 rounded-3xl bg-surface-card border border-surface-border shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-surface-border">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  <span className="font-headline font-bold text-sm text-text-primary">
                    Live Storefront Preview
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      settings.heroActive !== false
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/10 text-red-400 border border-red-500/30'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        settings.heroActive !== false ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                      }`}
                    />
                    {settings.heroActive !== false ? 'Visible on Homepage' : 'Hidden on Storefront'}
                  </span>
                </div>
              </div>

              {/* Scaled Preview Frame */}
              <div className="relative w-full rounded-2xl overflow-hidden bg-surface-raised border border-surface-border shadow-2xl">
                <div className="relative h-[320px] sm:h-[400px] w-full flex flex-col justify-between p-5 sm:p-8">
                  {/* Background Image & Overlay */}
                  {settings.heroBackgroundImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={settings.heroBackgroundImage}
                      alt="Hero Background"
                      className="absolute inset-0 w-full h-full object-cover object-center"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-surface-raised flex items-center justify-center text-text-muted text-xs">
                      No Image Set
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-base via-surface-base/60 to-transparent pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-r from-surface-base/90 via-surface-base/40 to-transparent pointer-events-none" />

                  {/* Top Tag Badges */}
                  <div className="relative z-10 flex items-center justify-between w-full flex-wrap gap-2">
                    {settings.heroTagBadge && (
                      <div className="flex items-center gap-1.5 bg-secondary/90 backdrop-blur-md px-3 py-1 rounded-full shadow-md">
                        <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                        <span className="text-[10px] font-black uppercase text-white tracking-wider">
                          {settings.heroTagBadge}
                        </span>
                      </div>
                    )}
                    {settings.heroSecondaryBadge && (
                      <span className="bg-surface-base/80 backdrop-blur-md text-primary text-[10px] font-bold px-3 py-1 rounded-full border border-primary/30 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {settings.heroSecondaryBadge}
                      </span>
                    )}
                  </div>

                  {/* Headlines & CTA Preview */}
                  <div className="relative z-10 max-w-lg space-y-2 mt-auto">
                    {settings.heroEyebrow && (
                      <span className="text-[11px] font-headline font-black text-primary uppercase tracking-widest flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 fill-current text-primary" />
                        {settings.heroEyebrow}
                      </span>
                    )}
                    <h2 className="font-headline font-black text-2xl sm:text-3xl text-text-primary leading-tight drop-shadow-md">
                      {settings.heroTitleLine1 || 'PARTY TONIGHT?'}
                      <br />
                      <span className="text-primary">{settings.heroTitleLine2 || 'EXPRESS STREETWEAR'}</span>
                    </h2>
                    {settings.heroSubtitle && (
                      <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
                        {settings.heroSubtitle}
                      </p>
                    )}

                    <div className="flex items-center gap-3 pt-1">
                      <div className="bg-primary text-surface-base px-4 py-2 rounded-full font-headline font-black text-xs flex items-center gap-1.5 shadow-[0_4px_16px_rgba(250,204,21,0.3)]">
                        <span>{settings.heroCtaText || 'Explore Drops'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                      {settings.heroDeliveryTicker && (
                        <div className="flex items-center gap-1 text-[11px] text-text-muted">
                          <Timer className="w-3.5 h-3.5 text-primary" />
                          <span>{settings.heroDeliveryTicker}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hero CMS Configuration Controls */}
            <div className="p-6 rounded-3xl bg-surface-card border border-surface-border space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-3">
                <div>
                  <h3 className="font-headline font-bold text-base text-text-primary">
                    Hero Banner Settings &amp; Content
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Customize the storefront showcase banner, photography, headlines, and call-to-actions.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer bg-surface-raised px-3.5 py-2 rounded-xl border border-surface-border hover:border-primary/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={settings.heroActive !== false}
                    onChange={(e) => setSettings({ ...settings, heroActive: e.target.checked })}
                    className="accent-primary w-4 h-4 rounded"
                  />
                  <span className="text-xs font-bold text-text-primary">Enable Hero Banner</span>
                </label>
              </div>

              {/* Background Imagery */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-text-muted flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-primary" />
                  Hero Editorial Background Image
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                  <div className="sm:col-span-2 space-y-2">
                    <input
                      type="text"
                      value={settings.heroBackgroundImage || ''}
                      onChange={(e) => setSettings({ ...settings, heroBackgroundImage: e.target.value })}
                      placeholder="https://... or upload image"
                      className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        ref={heroFileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleHeroImageUpload(file);
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={uploadingHero}
                        onClick={() => heroFileInputRef.current?.click()}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        {uploadingHero ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>{uploadingHero ? 'Uploading to Cloudinary...' : 'Upload Image'}</span>
                      </Button>
                      <button
                        type="button"
                        onClick={() =>
                          setSettings({
                            ...settings,
                            heroBackgroundImage:
                              'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1600&auto=format&fit=crop&q=80',
                          })
                        }
                        className="text-[11px] font-bold text-text-muted hover:text-primary transition-colors underline"
                      >
                        Reset to Luxury Editorial Default
                      </button>
                    </div>
                    {heroUploadError && (
                      <p className="text-[11px] text-red-400 font-medium">{heroUploadError}</p>
                    )}
                  </div>

                  {/* Thumbnail */}
                  <div className="h-24 rounded-xl border border-surface-border overflow-hidden bg-surface-raised relative flex items-center justify-center">
                    {settings.heroBackgroundImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={settings.heroBackgroundImage}
                        alt="Thumbnail"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[11px] text-text-muted">No Image</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Badges and Eyebrow */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-surface-border">
                <div>
                  <label className="text-xs font-bold text-text-muted mb-1 block">
                    Eyebrow Tagline
                  </label>
                  <input
                    type="text"
                    value={settings.heroEyebrow || ''}
                    onChange={(e) => setSettings({ ...settings, heroEyebrow: e.target.value })}
                    placeholder="e.g. Instant Nightlife Glamour"
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary font-bold focus:outline-none focus:border-primary"
                  />
                  <span className="text-[10px] text-text-muted mt-1 block">
                    Small uppercase title with lightning icon.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-text-muted mb-1 block">
                    Primary Pill Badge (Flashing Dot)
                  </label>
                  <input
                    type="text"
                    value={settings.heroTagBadge || ''}
                    onChange={(e) => setSettings({ ...settings, heroTagBadge: e.target.value })}
                    placeholder="e.g. Blitz Drop 04"
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary font-bold focus:outline-none focus:border-primary"
                  />
                  <span className="text-[10px] text-text-muted mt-1 block">
                    Pill on top-left of banner.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-text-muted mb-1 block">
                    Secondary Pill Badge (Glass Sparkle)
                  </label>
                  <input
                    type="text"
                    value={settings.heroSecondaryBadge || ''}
                    onChange={(e) => setSettings({ ...settings, heroSecondaryBadge: e.target.value })}
                    placeholder="e.g. Try & Buy Available"
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary font-bold focus:outline-none focus:border-primary"
                  />
                  <span className="text-[10px] text-text-muted mt-1 block">
                    Pill on top-right of banner.
                  </span>
                </div>
              </div>

              {/* Main Headline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-surface-border">
                <div>
                  <label className="text-xs font-bold text-text-muted mb-1 block">
                    Headline Line 1 (White Headline) *
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.heroTitleLine1 || ''}
                    onChange={(e) => setSettings({ ...settings, heroTitleLine1: e.target.value })}
                    placeholder="e.g. PARTY TONIGHT?"
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary font-black uppercase focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-text-muted mb-1 block">
                    Headline Line 2 (Highlighted Gold) *
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.heroTitleLine2 || ''}
                    onChange={(e) => setSettings({ ...settings, heroTitleLine2: e.target.value })}
                    placeholder="e.g. EXPRESS STREETWEAR"
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-primary font-black uppercase focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Subtitle / Description */}
              <div className="pt-2 border-t border-surface-border">
                <label className="text-xs font-bold text-text-muted mb-1 block">
                  Editorial Subtitle / Copy
                </label>
                <textarea
                  rows={2}
                  value={settings.heroSubtitle || ''}
                  onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
                  placeholder="e.g. Curated streetwear, satin club edits & statement kicks delivered straight to your door before the pre-drinks end."
                  className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary font-medium focus:outline-none focus:border-primary"
                />
              </div>

              {/* Call to Action and Ticker */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-surface-border">
                <div>
                  <label className="text-xs font-bold text-text-muted mb-1 block">
                    Button Action Text
                  </label>
                  <input
                    type="text"
                    value={settings.heroCtaText || ''}
                    onChange={(e) => setSettings({ ...settings, heroCtaText: e.target.value })}
                    placeholder="e.g. Explore Drops"
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary font-bold focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-text-muted mb-1 block">
                    Button Target Link
                  </label>
                  <input
                    type="text"
                    value={settings.heroCtaLink || ''}
                    onChange={(e) => setSettings({ ...settings, heroCtaLink: e.target.value })}
                    placeholder="e.g. /products"
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-text-muted mb-1 block">
                    Delivery Timer Ticker Text
                  </label>
                  <input
                    type="text"
                    value={settings.heroDeliveryTicker || ''}
                    onChange={(e) => setSettings({ ...settings, heroDeliveryTicker: e.target.value })}
                    placeholder="e.g. Rider departs in 8m"
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary font-medium focus:outline-none focus:border-primary"
                  />
                </div>
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
                  Express Courier Delivery Fee (in ₹)
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
