'use client';

import React, { useState } from 'react';
import { X, Ruler, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSize?: string;
}

interface MeasurementRow {
  label: string;
  description: string;
  s_in: number;
  s_str: string;
  m_in: number;
  m_str: string;
  l_in: number;
  l_str: string;
  xl_in: number;
  xl_str: string;
  xxl_in: number;
  xxl_str: string;
}

const MEASUREMENTS: MeasurementRow[] = [
  {
    label: 'Chest (Pit-to-Pit)',
    description: 'Measured flat across garment from underarm seam to underarm seam',
    s_in: 20,
    s_str: '20"',
    m_in: 21,
    m_str: '21"',
    l_in: 22,
    l_str: '22"',
    xl_in: 23,
    xl_str: '23"',
    xxl_in: 24,
    xxl_str: '24"',
  },
  {
    label: 'Bottom Sweep',
    description: 'Measured flat across bottom hem opening',
    s_in: 20,
    s_str: '20"',
    m_in: 21,
    m_str: '21"',
    l_in: 22,
    l_str: '22"',
    xl_in: 23,
    xl_str: '23"',
    xxl_in: 24,
    xxl_str: '24"',
  },
  {
    label: 'Shoulder',
    description: 'Shoulder seam to shoulder seam across the back',
    s_in: 16.5,
    s_str: '16 ½"',
    m_in: 17.5,
    m_str: '17 ½"',
    l_in: 18.5,
    l_str: '18 ½"',
    xl_in: 19.5,
    xl_str: '19 ½"',
    xxl_in: 20.5,
    xxl_str: '20 ½"',
  },
  {
    label: 'Length (HSP)',
    description: 'High Shoulder Point down to the bottom hem',
    s_in: 25.5,
    s_str: '25 ½"',
    m_in: 26.5,
    m_str: '26 ½"',
    l_in: 27.5,
    l_str: '27 ½"',
    xl_in: 28.5,
    xl_str: '28 ½"',
    xxl_in: 29.5,
    xxl_str: '29 ½"',
  },
  {
    label: 'Armhole',
    description: 'Measured along the curvature of the armhole seam',
    s_in: 8.5,
    s_str: '8 ½"',
    m_in: 9,
    m_str: '9"',
    l_in: 9.5,
    l_str: '9 ½"',
    xl_in: 10,
    xl_str: '10"',
    xxl_in: 10.5,
    xxl_str: '10 ½"',
  },
  {
    label: 'Sleeve Length',
    description: 'From top shoulder seam down to cuff hem',
    s_in: 7.5,
    s_str: '7 ½"',
    m_in: 8,
    m_str: '8"',
    l_in: 8.5,
    l_str: '8 ½"',
    xl_in: 9,
    xl_str: '9"',
    xxl_in: 9.5,
    xxl_str: '9 ½"',
  },
  {
    label: 'Sleeve Opening',
    description: 'Flat width of the sleeve cuff opening',
    s_in: 6,
    s_str: '6"',
    m_in: 6.5,
    m_str: '6 ½"',
    l_in: 7,
    l_str: '7"',
    xl_in: 7.5,
    xl_str: '7 ½"',
    xxl_in: 8,
    xxl_str: '8"',
  },
];

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;

export function SizeGuideModal({ isOpen, onClose, selectedSize }: SizeGuideModalProps) {
  const [unit, setUnit] = useState<'in' | 'cm'>('in');

  if (!isOpen) return null;

  const formatValue = (inches: number, fractionStr: string) => {
    if (unit === 'cm') {
      const cmVal = (inches * 2.54).toFixed(1);
      return `${cmVal} cm`;
    }
    return fractionStr;
  };

  const normalizedSelected = (selectedSize || '').trim().toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-surface-card border border-surface-border rounded-2xl max-w-xl w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <Ruler className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-base sm:text-lg text-text-primary">
                Size &amp; Fit Guide
              </h3>
              <p className="text-[11px] text-text-muted">
                Official MUVERA Streetwear Measurement Matrix
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
            aria-label="Close Size Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Unit Toggle and Notice */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-surface-raised/70 p-3 rounded-xl border border-surface-border">
          <div className="text-[11px] text-text-muted leading-tight">
            <span>Dimensions are flat garment measurements.</span>
            <span className="block sm:inline sm:ml-1 text-text-primary font-semibold">
              Double flat width for full chest circumference.
            </span>
          </div>

          {/* Inches / CM Switcher */}
          <div className="inline-flex items-center bg-surface-card border border-surface-border rounded-lg p-0.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setUnit('in')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                unit === 'in'
                  ? 'bg-primary text-surface-base shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Inches (in)
            </button>
            <button
              type="button"
              onClick={() => setUnit('cm')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                unit === 'cm'
                  ? 'bg-primary text-surface-base shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              CM (cm)
            </button>
          </div>
        </div>

        {/* Measurement Table */}
        <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface-raised/30">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-border bg-surface-card text-text-muted font-bold text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3 min-w-[7rem]">Measurement</th>
                {SIZES.map((sz) => {
                  const isCurrent = normalizedSelected === sz;
                  return (
                    <th
                      key={sz}
                      className={`py-2.5 px-3 text-center min-w-[3.5rem] transition-colors ${
                        isCurrent
                          ? 'bg-primary/20 text-primary border-x border-primary/30 font-black'
                          : 'text-text-primary'
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <span>{sz}</span>
                        {isCurrent && (
                          <span className="text-[9px] uppercase tracking-tighter text-primary font-bold">
                            Selected
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border text-text-primary">
              {MEASUREMENTS.map((row) => (
                <tr key={row.label} className="hover:bg-surface-raised/50 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-text-primary">
                    <span className="block">{row.label}</span>
                    <span className="block text-[10px] font-normal text-text-muted leading-tight mt-0.5">
                      {row.description}
                    </span>
                  </td>
                  <td
                    className={`py-2.5 px-3 text-center font-mono ${
                      normalizedSelected === 'S'
                        ? 'bg-primary/10 text-primary font-bold border-x border-primary/20'
                        : ''
                    }`}
                  >
                    {formatValue(row.s_in, row.s_str)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-center font-mono ${
                      normalizedSelected === 'M'
                        ? 'bg-primary/10 text-primary font-bold border-x border-primary/20'
                        : ''
                    }`}
                  >
                    {formatValue(row.m_in, row.m_str)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-center font-mono ${
                      normalizedSelected === 'L'
                        ? 'bg-primary/10 text-primary font-bold border-x border-primary/20'
                        : ''
                    }`}
                  >
                    {formatValue(row.l_in, row.l_str)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-center font-mono ${
                      normalizedSelected === 'XL'
                        ? 'bg-primary/10 text-primary font-bold border-x border-primary/20'
                        : ''
                    }`}
                  >
                    {formatValue(row.xl_in, row.xl_str)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-center font-mono ${
                      normalizedSelected === 'XXL' || normalizedSelected === '2XL'
                        ? 'bg-primary/10 text-primary font-bold border-x border-primary/20'
                        : ''
                    }`}
                  >
                    {formatValue(row.xxl_in, row.xxl_str)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Measuring Tips Box */}
        <div className="p-3 bg-surface-card rounded-xl border border-surface-border flex items-start gap-2.5 text-[11px] text-text-muted">
          <HelpCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-text-primary block">Fit Recommendation:</span>
            <p>
              MUVERA fits are engineered with an intentional luxury streetwear drop-shoulder boxy cut.
              For an oversized streetwear silhouette, select your true size. For a regular standard fit, choose one size down.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <Button onClick={onClose} variant="primary" size="sm" fullWidth>
          Got It
        </Button>
      </div>
    </div>
  );
}
