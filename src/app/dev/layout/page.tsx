'use client';

import React, { useState } from 'react';
import {
  Container,
  Stack,
  Row,
  Grid,
  Sidebar,
  Switcher,
  Frame,
  ScrollArea,
  ResponsiveTable,
  Sheet,
} from '@/components/layout';

export default function LayoutDevPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [previewWidth, setPreviewWidth] = useState<'100%' | '360px' | '768px' | '1024px' | '1440px'>('100%');

  const sampleTableData = [
    { id: 'ORD-101', customer: 'Aarav Sharma', total: '₹2,499', status: 'Delivered' },
    { id: 'ORD-102', customer: 'Priya Verma', total: '₹1,249', status: 'Processing' },
    { id: 'ORD-103', customer: 'Rohan Mehta', total: '₹5,890', status: 'Shipped' },
  ];

  const tableColumns = [
    { key: 'id', header: 'Order ID' },
    { key: 'customer', header: 'Customer' },
    { key: 'total', header: 'Total Amount', align: 'right' as const },
    {
      key: 'status',
      header: 'Status',
      align: 'center' as const,
      render: (item: any) => (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/40">
          {item.status}
        </span>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-surface-base text-text-primary py-8 transition-all">
      {/* Viewport Width Toolbar */}
      <div className="sticky top-0 z-40 bg-surface/90 backdrop-blur border-b border-surface-border px-4 py-3 mb-8">
        <Container size="full">
          <Row justify="between" align="center" gap="sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Fluid Layout Primitive Sandbox
            </span>
            <Row gap="xs" align="center">
              <span className="text-xs text-text-muted">Simulate Viewport:</span>
              {(['100%', '360px', '768px', '1024px', '1440px'] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => setPreviewWidth(w)}
                  className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                    previewWidth === w
                      ? 'bg-primary text-black font-semibold'
                      : 'bg-surface-raised border border-surface-border text-text-muted hover:text-white'
                  }`}
                >
                  {w}
                </button>
              ))}
            </Row>
          </Row>
        </Container>
      </div>

      {/* Frame wrapper for simulated preview width */}
      <div
        className="mx-auto transition-all duration-300"
        style={{
          width: previewWidth,
          maxWidth: '100%',
        }}
      >
        <Container>
          <Stack gap="xl">
            {/* 1. Typography & Container */}
            <div className="p-6 rounded-2xl bg-surface-card border border-surface-border">
              <Stack gap="sm">
                <span className="text-xs font-semibold uppercase text-primary">
                  1. Container & Fluid Typography
                </span>
                <h1 className="text-fluid-h1 font-bold">Fluid Heading Level 1 (clamp)</h1>
                <h2 className="text-fluid-h2 font-semibold">Fluid Heading Level 2 (clamp)</h2>
                <h3 className="text-fluid-h3 font-medium">Fluid Heading Level 3 (clamp)</h3>
                <p className="text-fluid-body text-text-muted">
                  This text scales fluidly using CSS clamp without sudden breakpoint snapping.
                  It avoids hardcoded pixel sizes and adapts gracefully across all viewports.
                </p>
              </Stack>
            </div>

            {/* 2. Intrinsic Grid Primitive */}
            <div className="p-6 rounded-2xl bg-surface-card border border-surface-border">
              <Stack gap="md">
                <span className="text-xs font-semibold uppercase text-primary">
                  2. Grid Primitive (Intrinsic auto-fit minmax)
                </span>
                <Grid minItemWidth="14rem" gap="sm">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl bg-surface-raised border border-surface-border text-center"
                    >
                      <span className="font-semibold text-sm">Product Card {i}</span>
                      <p className="text-xs text-text-muted mt-1">Reflows without fixed cols</p>
                    </div>
                  ))}
                </Grid>
              </Stack>
            </div>

            {/* 3. Sidebar Primitive */}
            <div className="p-6 rounded-2xl bg-surface-card border border-surface-border">
              <Stack gap="md">
                <span className="text-xs font-semibold uppercase text-primary">
                  3. Sidebar Primitive (Collapses intrinsically below threshold)
                </span>
                <Sidebar sideWidth="16rem" contentMin="55%" gap="md">
                  <div className="p-4 rounded-xl bg-surface-raised border border-surface-border">
                    <h4 className="font-semibold text-sm mb-2">Filters Sidebar</h4>
                    <ul className="text-xs text-text-muted space-y-1">
                      <li>• Category: Ethnic Wear</li>
                      <li>• Price: Under ₹2,000</li>
                      <li>• Availability: In Stock</li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-raised border border-surface-border">
                    <h4 className="font-semibold text-sm mb-2">Main Product Listing Content</h4>
                    <p className="text-xs text-text-muted">
                      When parent width drops below the threshold, this main panel smoothly stacks below the sidebar without media query break points.
                    </p>
                  </div>
                </Sidebar>
              </Stack>
            </div>

            {/* 4. Switcher Primitive */}
            <div className="p-6 rounded-2xl bg-surface-card border border-surface-border">
              <Stack gap="md">
                <span className="text-xs font-semibold uppercase text-primary">
                  4. Switcher Primitive (Auto row-to-stack transition)
                </span>
                <Switcher threshold="32rem" gap="sm">
                  <div className="p-3 rounded-lg bg-surface-raised border border-surface-border text-center text-xs">
                    Step 1: Address
                  </div>
                  <div className="p-3 rounded-lg bg-surface-raised border border-surface-border text-center text-xs">
                    Step 2: Shipping
                  </div>
                  <div className="p-3 rounded-lg bg-surface-raised border border-surface-border text-center text-xs">
                    Step 3: UPI Payment
                  </div>
                </Switcher>
              </Stack>
            </div>

            {/* 5. Frame & ScrollArea */}
            <div className="p-6 rounded-2xl bg-surface-card border border-surface-border">
              <Stack gap="md">
                <span className="text-xs font-semibold uppercase text-primary">
                  5. Frame & ScrollArea (Controlled Overflow & Aspect Ratio)
                </span>
                <ScrollArea orientation="horizontal" className="pb-2">
                  <Row gap="sm" wrap={false} className="w-max">
                    {['1/1', '4/3', '16/9', '4/5'].map((ratio) => (
                      <div key={ratio} className="w-36 flex-shrink-0">
                        <Frame ratio={ratio} className="rounded-lg bg-surface-raised border border-surface-border flex items-center justify-center">
                          <div className="w-full h-full flex items-center justify-center bg-surface-bright/20 text-xs text-text-muted font-mono">
                            {ratio}
                          </div>
                        </Frame>
                        <span className="text-[10px] text-text-muted block text-center mt-1">Aspect {ratio}</span>
                      </div>
                    ))}
                  </Row>
                </ScrollArea>
              </Stack>
            </div>

            {/* 6. ResponsiveTable */}
            <div className="p-6 rounded-2xl bg-surface-card border border-surface-border">
              <Stack gap="md">
                <span className="text-xs font-semibold uppercase text-primary">
                  6. ResponsiveTable (Reflows to mobile cards on narrow screens)
                </span>
                <ResponsiveTable
                  columns={tableColumns}
                  data={sampleTableData}
                  keyExtractor={(item) => item.id}
                />
              </Stack>
            </div>

            {/* 7. Sheet Modal & Touch Targets */}
            <div className="p-6 rounded-2xl bg-surface-card border border-surface-border">
              <Stack gap="md">
                <span className="text-xs font-semibold uppercase text-primary">
                  7. Sheet (Mobile 90dvh Drawer / Desktop Dialog) & Touch Target
                </span>
                <Row gap="md" align="center">
                  <button
                    onClick={() => setSheetOpen(true)}
                    className="touch-target px-5 rounded-xl bg-primary text-black font-semibold text-sm hover:bg-primary-hover transition-colors"
                  >
                    Open Adaptive Sheet
                  </button>
                  <span className="text-xs text-text-muted">
                    Meets touch target standard (&ge; 44px height/width)
                  </span>
                </Row>
              </Stack>
            </div>
          </Stack>
        </Container>
      </div>

      <Sheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Adaptive Sheet Demo"
        footer={
          <Row justify="end" gap="sm">
            <button
              onClick={() => setSheetOpen(false)}
              className="touch-target px-4 py-2 rounded-lg bg-primary text-black font-semibold text-xs"
            >
              Confirm
            </button>
          </Row>
        }
      >
        <Stack gap="sm">
          <p className="text-sm">
            On viewports &lt; 768px, this renders as an anchored bottom sheet with a maximum height of 90dvh and safe-area padding.
          </p>
          <p className="text-sm">
            On viewports &ge; 768px, it reflows seamlessly into a centered dialog box with maximum bounds.
          </p>
        </Stack>
      </Sheet>
    </div>
  );
}
