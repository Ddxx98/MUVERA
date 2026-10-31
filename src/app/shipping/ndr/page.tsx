'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function NdrForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [date, setDate] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/shipping/ndr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          reattemptDate: date,
          alternatePhone: phone,
          landmarkNotes: notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-400">
        <h2 className="font-semibold text-lg">Invalid or Missing Link</h2>
        <p className="mt-2 text-sm text-neutral-400">Please use the exact link sent to your registered email or SMS.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center text-emerald-400">
        <h2 className="font-semibold text-lg">Instructions Received!</h2>
        <p className="mt-2 text-sm text-neutral-300">
          We have updated the courier executive with your reattempt schedule and delivery notes.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
          Preferred Reattempt Date
        </label>
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white focus:border-neutral-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
          Alternate Contact Phone (Optional)
        </label>
        <input
          type="tel"
          placeholder="e.g. 9876543210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white focus:border-neutral-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
          Landmark or Delivery Instructions
        </label>
        <textarea
          rows={3}
          placeholder="e.g. Leave with security guard, call before arriving"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white focus:border-neutral-500 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-black hover:bg-neutral-200 transition-colors disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Confirm Reattempt Details'}
      </button>
    </form>
  );
}

export default function NdrPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-4">
      <head>
        <meta name="referrer" content="no-referrer" />
      </head>
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl">
        <h1 className="text-xl font-bold tracking-tight text-white mb-2">Delivery Reattempt Request</h1>
        <p className="text-sm text-neutral-400 mb-6">
          Our courier executive was unable to reach you. Please provide updated instructions for the next attempt.
        </p>
        <Suspense fallback={<div className="text-neutral-500 text-sm">Loading form...</div>}>
          <NdrForm />
        </Suspense>
      </div>
    </div>
  );
}
