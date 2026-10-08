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
  Layers,
  Plus,
  Trash2,
  Edit3,
  X,
} from 'lucide-react';
import { Category } from '@/lib/types';
import Link from 'next/link';

type TabKey = 'general' | 'hero' | 'categories' | 'whatsapp' | 'policies' | 'payments' | 'announcements';

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

  // Categories CMS State
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState<{ id?: string; name: string; slug: string; image: string; description: string }>({
    name: '',
    slug: '',
    image: '',
    description: '',
  });
  const [savingCategory, setSavingCategory] = useState(false);
  const [uploadingCategoryImage, setUploadingCategoryImage] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  const categoryFileInputRef = useRef<HTMLInputElement>(null);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAddCategory = () => {
    setCategoryForm({ name: '', slug: '', image: '', description: '' });
    setCategoryError('');
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setCategoryForm({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      image: cat.image || '',
      description: cat.description || '',
    });
    setCategoryError('');
    setIsCategoryModalOpen(true);
  };

  const handleCategoryImageUpload = async (file: File) => {
    setUploadingCategoryImage(true);
    setCategoryError('');
    try {
      const sigRes = await fetch('/api/admin/uploads/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: 'muvera/categories',
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
      setCategoryForm((prev) => ({ ...prev, image: uploadData.secure_url }));
    } catch (err: any) {
      setCategoryError(err.message || 'Image upload failed');
    } finally {
      setUploadingCategoryImage(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      setCategoryError('Category name is required');
      return;
    }
    setSavingCategory(true);
    setCategoryError('');
    try {
      const isEditing = !!categoryForm.id;
      const res = await fetch('/api/categories', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save category');

      setIsCategoryModalOpen(false);
      await fetchCategories();
      setStatusMessage({ type: 'success', text: `Category "${categoryForm.name}" ${isEditing ? 'updated' : 'created'} successfully!` });
    } catch (err: any) {
      setCategoryError(err.message || 'Failed to save category');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!confirm(`Are you sure you want to delete category "${cat.name}"? Products under this category will retain their category name.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/categories?id=${encodeURIComponent(cat.id || cat.slug)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete category');

      await fetchCategories();
      setStatusMessage({ type: 'success', text: `Category "${cat.name}" deleted successfully.` });
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    }
  };

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

        {activeTab !== 'categories' ? (
          <Button
            onClick={handleSave}
            disabled={saving}
            size="md"
            className="flex items-center gap-2 shadow-gold-glow"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Publishing...' : 'Save & Publish Live'}</span>
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleOpenAddCategory}
            size="md"
            className="flex items-center gap-2 shadow-gold-glow"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Category</span>
          </Button>
        )}
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
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'categories'
              ? 'bg-primary text-surface-base shadow-sm'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Categories CMS</span>
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

        {/* Tab: Categories CMS */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-surface-card border border-surface-border space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-4">
                <div>
                  <h2 className="font-headline font-bold text-base text-text-primary">
                    Storefront Apparel Categories CMS
                  </h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Manage categories displayed across the homepage, navigation rails, catalog filters, and product editor.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleOpenAddCategory}
                  size="sm"
                  className="flex items-center gap-1.5 shadow-gold-glow self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add New Category</span>
                </Button>
              </div>

              {loadingCategories ? (
                <div className="py-12 text-center text-text-muted text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  <span>Loading categories from database...</span>
                </div>
              ) : categories.length === 0 ? (
                <div className="py-12 text-center text-text-muted text-xs space-y-3">
                  <Layers className="w-8 h-8 text-primary/40 mx-auto" />
                  <p className="font-bold text-text-primary">No categories created yet.</p>
                  <Button type="button" onClick={handleOpenAddCategory} size="sm">
                    Create Your First Category
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((cat) => (
                    <div
                      key={cat.id || cat.slug}
                      className="group relative rounded-2xl bg-surface-raised border border-surface-border hover:border-primary/40 overflow-hidden flex flex-col transition-all shadow-md"
                    >
                      {/* Cover Photo */}
                      <div className="relative h-32 w-full bg-surface-card overflow-hidden">
                        {cat.image ? (
                          <img
                            src={cat.image}
                            alt={cat.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-surface-base/60 text-text-muted">
                            <ImageIcon className="w-8 h-8 opacity-30 text-primary" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-surface-raised via-transparent to-transparent" />
                        <span className="absolute top-2 right-2 text-[10px] font-mono font-bold bg-surface-base/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-surface-border text-text-muted">
                          slug: {cat.slug}
                        </span>
                      </div>

                      {/* Info & Details */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-headline font-bold text-sm text-text-primary group-hover:text-primary transition-colors">
                              {cat.name}
                            </h3>
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                              {cat.count ?? 0} Fits
                            </span>
                          </div>
                          {cat.description && (
                            <p className="text-xs text-text-muted line-clamp-2 mt-1.5 leading-relaxed">
                              {cat.description}
                            </p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="pt-3 border-t border-surface-border/60 flex items-center justify-between gap-2">
                          <Link
                            href={`/products?category=${cat.slug}`}
                            target="_blank"
                            className="text-[11px] font-bold text-text-muted hover:text-primary flex items-center gap-1 transition-colors"
                          >
                            <span>Live View</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditCategory(cat)}
                              className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-surface-card transition-colors"
                              title="Edit Category"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat)}
                              className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Delete Category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Category Add/Edit Modal */}
            {isCategoryModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                  <div className="p-4 border-b border-surface-border flex items-center justify-between">
                    <h3 className="font-headline font-bold text-base text-text-primary">
                      {categoryForm.id ? 'Edit Category' : 'Create New Category'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(false)}
                      className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-5 space-y-4 overflow-y-auto">
                    {categoryError && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
                        {categoryError}
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-bold text-text-muted mb-1 block">Category Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Club Jackets, Oversized Tees"
                        value={categoryForm.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCategoryForm((prev) => ({
                            ...prev,
                            name: val,
                            slug: prev.id ? prev.slug : val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
                          }));
                        }}
                        className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary font-bold focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-text-muted mb-1 block">Slug (URL identifier)</label>
                      <input
                        type="text"
                        placeholder="e.g. club-jackets"
                        value={categoryForm.slug}
                        onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                        className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary font-mono focus:outline-none focus:border-primary"
                      />
                      <span className="text-[10px] text-text-muted mt-1 block">
                        Used in URL: /products?category={categoryForm.slug || 'category-slug'}
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-text-muted mb-1 block">Cover Image</label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          placeholder="https://... or upload below"
                          value={categoryForm.image}
                          onChange={(e) => setCategoryForm({ ...categoryForm, image: e.target.value })}
                          className="flex-1 bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary focus:outline-none focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => categoryFileInputRef.current?.click()}
                          disabled={uploadingCategoryImage}
                          className="px-4 py-2 bg-surface-raised hover:bg-surface-border border border-surface-border rounded-xl text-xs font-bold text-text-primary flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          {uploadingCategoryImage ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                          ) : (
                            <Upload className="w-4 h-4 text-primary" />
                          )}
                          <span>{uploadingCategoryImage ? 'Uploading...' : 'Upload'}</span>
                        </button>
                        <input
                          type="file"
                          ref={categoryFileInputRef}
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleCategoryImageUpload(e.target.files[0]);
                            }
                          }}
                        />
                      </div>
                      {categoryForm.image && (
                        <div className="relative h-28 w-full rounded-xl overflow-hidden border border-surface-border bg-surface-base mt-2">
                          <img
                            src={categoryForm.image}
                            alt="Category Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-bold text-text-muted mb-1 block">Description</label>
                      <textarea
                        rows={3}
                        placeholder="Short tagline or curation details for this category..."
                        value={categoryForm.description}
                        onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                        className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-xs text-text-primary focus:outline-none focus:border-primary resize-none"
                      />
                    </div>
                  </div>

                  <div className="p-4 border-t border-surface-border flex items-center justify-end gap-2 bg-surface-raised/40">
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-text-muted hover:text-text-primary transition-colors"
                    >
                      Cancel
                    </button>
                    <Button
                      type="button"
                      onClick={handleSaveCategory}
                      disabled={savingCategory || uploadingCategoryImage}
                      size="sm"
                      className="shadow-gold-glow flex items-center gap-1.5"
                    >
                      {savingCategory ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>{savingCategory ? 'Saving...' : 'Save Category'}</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
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
        {activeTab !== 'categories' && (
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
        )}
      </form>
    </div>
  );
}
