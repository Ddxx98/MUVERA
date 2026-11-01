'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store-context';
import {
  getCurrentUserAction,
  logoutAction,
  saveAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
} from '@/modules/auth/actions';
import { UserProfile, UserAddress } from '@/modules/auth/types';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  User,
  Package,
  Heart,
  MapPin,
  ShieldCheck,
  Crown,
  ChevronRight,
  LogOut,
  SlidersHorizontal,
  ArrowRight,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AccountPage() {
  const router = useRouter();
  const { wishlist } = useStore();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Address Modal State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<UserAddress>({
    fullName: '',
    phone: '',
    street: '',
    apartment: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    isDefault: false,
  });
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const current = await getCurrentUserAction();
        setUser(current);
      } catch (err) {
        console.error('Failed to load user session:', err);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  const handleLogout = async () => {
    await logoutAction();
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  const handleOpenAddModal = () => {
    setEditingAddressId(null);
    setAddressForm({
      fullName: user?.name || '',
      phone: user?.phone || '',
      street: '',
      apartment: '',
      landmark: '',
      city: '',
      state: '',
      pincode: '',
      isDefault: !user?.addresses || user.addresses.length === 0,
    });
    setAddressError(null);
    setIsAddressModalOpen(true);
  };

  const handleOpenEditModal = (addr: UserAddress) => {
    setEditingAddressId(addr.id || null);
    setAddressForm({
      id: addr.id,
      fullName: addr.fullName,
      phone: addr.phone,
      street: addr.street,
      apartment: addr.apartment || '',
      landmark: addr.landmark || '',
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      isDefault: Boolean(addr.isDefault),
    });
    setAddressError(null);
    setIsAddressModalOpen(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError(null);

    const cleanName = addressForm.fullName.trim();
    const cleanPhone = addressForm.phone.replace(/\D/g, '').slice(-10);
    const cleanStreet = addressForm.street.trim();
    const cleanCity = addressForm.city.trim();
    const cleanState = addressForm.state.trim() || 'Karnataka';
    const cleanPincode = addressForm.pincode.trim();

    if (!cleanName || !cleanPhone || !cleanStreet || !cleanCity || !cleanPincode) {
      setAddressError('Please fill in all mandatory address fields (*).');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setAddressError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (!/^\d{6}$/.test(cleanPincode)) {
      setAddressError('Please enter a valid 6-digit postal pincode.');
      return;
    }

    setIsSavingAddress(true);

    try {
      const payload: UserAddress = {
        id: editingAddressId || undefined,
        fullName: cleanName,
        phone: cleanPhone,
        street: cleanStreet,
        apartment: addressForm.apartment?.trim() || undefined,
        landmark: addressForm.landmark?.trim() || undefined,
        city: cleanCity,
        state: cleanState,
        pincode: cleanPincode,
        isDefault: addressForm.isDefault,
      };

      const res = await saveAddressAction(payload, payload.isDefault);
      if (!res.ok || !res.data) {
        throw new Error(res.error || 'Failed to save address.');
      }

      setUser((prev) => (prev ? { ...prev, addresses: res.data!.addresses } : null));
      setIsAddressModalOpen(false);
    } catch (err: any) {
      setAddressError(err.message || 'Failed to save address.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId?: string) => {
    if (!addressId) return;
    if (!confirm('Are you sure you want to delete this delivery address?')) return;

    setDeletingId(addressId);
    try {
      const res = await deleteAddressAction(addressId);
      if (res.ok && res.data) {
        setUser((prev) => (prev ? { ...prev, addresses: res.data!.addresses } : null));
      }
    } catch (err) {
      console.error('Failed to delete address:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefaultAddress = async (addressId?: string) => {
    if (!addressId) return;
    try {
      const res = await setDefaultAddressAction(addressId);
      if (res.ok && res.data) {
        setUser((prev) => (prev ? { ...prev, addresses: res.data!.addresses } : null));
      }
    } catch (err) {
      console.error('Failed to set default address:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-text-muted">
        Loading VIP account profile...
      </div>
    );
  }

  // Guest State: Not logged in
  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 space-y-6 text-center">
        <div className="p-8 rounded-3xl bg-surface-card border border-surface-border shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 mx-auto flex items-center justify-center text-primary">
            <User className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h1 className="font-headline font-black text-2xl text-text-primary">Sign in to MUVERA</h1>
            <p className="text-xs text-text-muted">
              Unlock express delivery tracking, saved fits, and exclusive member perks.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button onClick={() => router.push('/login')} size="lg" fullWidth>
              Sign In
            </Button>
            <Button onClick={() => router.push('/signup')} variant="outline" size="lg" fullWidth>
              Create Account
            </Button>
          </div>

          <div className="pt-4 border-t border-surface-border flex items-center justify-center gap-2">
            <ThemeToggle showLabel />
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Profile Overview Card */}
      <div className="p-6 rounded-3xl bg-surface-card border border-surface-border shadow-xl flex flex-col sm:flex-row items-center gap-6 justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center font-headline font-black text-2xl text-surface-base shadow-gold-glow">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <h1 className="font-headline font-black text-xl text-text-primary">{user.name}</h1>
              {isAdmin && (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                  Admin
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted font-mono">{user.email}</p>
            {user.phone && <p className="text-xs text-text-muted font-mono">{user.phone}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isAdmin && (
            <Link
              href="/admin/orders"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-surface-raised border border-surface-border hover:border-primary text-xs font-bold transition-all text-text-primary"
            >
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              <span>Admin Console</span>
            </Link>
          )}
          <Button onClick={handleLogout} variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
            <LogOut className="w-4 h-4 mr-1.5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/account/orders"
          className="p-5 rounded-2xl bg-surface-card border border-surface-border hover:border-primary/50 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-sm text-text-primary group-hover:text-primary transition-colors">
                My Orders
              </h3>
              <p className="text-[11px] text-text-muted">Live courier tracking</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Link
          href="/wishlist"
          className="p-5 rounded-2xl bg-surface-card border border-surface-border hover:border-primary/50 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-sm text-text-primary group-hover:text-pink-400 transition-colors">
                Saved Fits
              </h3>
              <p className="text-[11px] text-text-muted">{wishlist.length} item{wishlist.length === 1 ? '' : 's'} in bag</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-pink-400 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <div className="p-5 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-sm text-text-primary">VIP Member Status</h3>
              <p className="text-[11px] text-text-muted">{user.loyaltyTier || 'Club Member'} • Express SLA</p>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Addresses Section */}
      <div className="p-6 rounded-3xl bg-surface-card border border-surface-border space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-surface-border flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="font-headline font-bold text-base text-text-primary">Saved Delivery Addresses</h2>
          </div>
          <Button onClick={handleOpenAddModal} size="sm" className="text-xs font-bold flex items-center gap-1.5 shadow-gold-glow">
            <Plus className="w-4 h-4" />
            <span>Add New Address</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {user.addresses && user.addresses.length > 0 ? (
            user.addresses.map((addr, idx) => (
              <div
                key={addr.id || idx}
                className={`p-5 rounded-2xl bg-surface-raised border transition-all space-y-3 relative ${
                  addr.isDefault
                    ? 'border-primary/80 shadow-gold-glow/20'
                    : 'border-surface-border hover:border-surface-bright'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                      <span>{addr.fullName}</span>
                      {addr.isDefault && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                          DEFAULT
                        </span>
                      )}
                    </h4>
                    <p className="text-xs font-mono text-text-muted mt-0.5">{addr.phone}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(addr)}
                      className="p-1.5 text-text-muted hover:text-primary rounded-lg hover:bg-surface-card transition-colors"
                      title="Edit Address"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(addr.id)}
                      disabled={deletingId === addr.id}
                      className="p-1.5 text-text-muted hover:text-red-400 rounded-lg hover:bg-surface-card transition-colors disabled:opacity-50"
                      title="Delete Address"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-text-muted leading-relaxed">
                  {addr.street}
                  {addr.apartment ? `, ${addr.apartment}` : ''}
                  {addr.landmark ? `, Near ${addr.landmark}` : ''}
                  <br />
                  {addr.city}, {addr.state} - <strong className="font-mono text-text-primary">{addr.pincode}</strong>
                </p>

                {!addr.isDefault && (
                  <div className="pt-2 border-t border-surface-border/50">
                    <button
                      type="button"
                      onClick={() => handleSetDefaultAddress(addr.id)}
                      className="text-[11px] font-bold text-text-muted hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <Star className="w-3.5 h-3.5" />
                      <span>Set as Default Address</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-2 p-8 text-center text-xs text-text-muted border border-dashed border-surface-border rounded-2xl space-y-3">
              <MapPin className="w-8 h-8 text-text-muted mx-auto opacity-50" />
              <p>No addresses saved yet. Add your home or office address for fast 1-click checkout.</p>
              <Button onClick={handleOpenAddModal} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1.5" />
                <span>Add Your First Address</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Address Modal */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-surface-card border border-surface-border rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsAddressModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-text-muted hover:text-text-primary transition-colors rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="font-headline font-bold text-lg text-text-primary flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <span>{editingAddressId ? 'Edit Delivery Address' : 'Add New Delivery Address'}</span>
              </h3>
              <p className="text-xs text-text-muted">
                Your addresses are securely stored for instant selection during checkout.
              </p>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-text-muted mb-1 block">Recipient Name *</label>
                  <input
                    type="text"
                    required
                    value={addressForm.fullName}
                    onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                    placeholder="Full name"
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-text-primary focus:outline-none focus:border-primary font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-text-muted mb-1 block">10-Digit Mobile *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value.replace(/\D/g, '') })}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-text-primary focus:outline-none focus:border-primary font-mono font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-text-muted mb-1 block">Street Address *</label>
                  <input
                    type="text"
                    required
                    value={addressForm.street}
                    onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                    placeholder="Flat/House No, Building, Street"
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-text-primary focus:outline-none focus:border-primary font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-text-muted mb-1 block">Apartment / Suite (Optional)</label>
                  <input
                    type="text"
                    value={addressForm.apartment || ''}
                    onChange={(e) => setAddressForm({ ...addressForm, apartment: e.target.value })}
                    placeholder="e.g. Tower B, Flat 402"
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-text-primary focus:outline-none focus:border-primary font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-text-muted mb-1 block">Landmark (Optional)</label>
                  <input
                    type="text"
                    value={addressForm.landmark || ''}
                    onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                    placeholder="e.g. Near Metro Station"
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-text-primary focus:outline-none focus:border-primary font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-text-muted mb-1 block">City *</label>
                  <input
                    type="text"
                    required
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    placeholder="e.g. Bengaluru"
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-text-primary focus:outline-none focus:border-primary font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-text-muted mb-1 block">State *</label>
                  <input
                    type="text"
                    required
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    placeholder="e.g. Karnataka"
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-text-primary focus:outline-none focus:border-primary font-medium"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-text-muted mb-1 block">Postal Pincode *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={addressForm.pincode}
                    onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value.replace(/\D/g, '') })}
                    placeholder="6-digit pincode"
                    className="w-full bg-surface-raised border border-surface-border rounded-xl p-3 text-text-primary focus:outline-none focus:border-primary font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="defaultAddressCheckbox"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                  className="rounded accent-primary w-4 h-4 cursor-pointer"
                />
                <label htmlFor="defaultAddressCheckbox" className="text-xs text-text-primary font-bold cursor-pointer">
                  Set as my default delivery address
                </label>
              </div>

              {addressError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
                  {addressError}
                </div>
              )}

              <div className="flex items-center gap-3 pt-3 border-t border-surface-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddressModalOpen(false)}
                  fullWidth
                  className="py-3 font-bold text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingAddress}
                  fullWidth
                  className="py-3 font-bold text-xs shadow-gold-glow"
                >
                  {isSavingAddress ? 'Saving...' : editingAddressId ? 'Update Address' : 'Save Address'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
