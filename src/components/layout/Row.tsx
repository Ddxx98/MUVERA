import React from 'react';

export interface RowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  as?: React.ElementType;
  className?: string;
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  wrap?: boolean;
  align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
}

const gapMap = {
  none: 'gap-0',
  xs: 'gap-[clamp(0.25rem,0.8vw,0.5rem)]',
  sm: 'gap-[clamp(0.5rem,1.2vw,0.75rem)]',
  md: 'gap-[clamp(0.75rem,2vw,1.5rem)]',
  lg: 'gap-[clamp(1.25rem,3vw,2.25rem)]',
  xl: 'gap-[clamp(2rem,4vw,3.5rem)]',
};

const alignMap = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  baseline: 'items-baseline',
  stretch: 'items-stretch',
};

const justifyMap = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
};

/**
 * Row (Cluster): Horizontal flex layout with automatic wrapping and fluid gaps.
 */
export const Row: React.FC<RowProps> = ({
  children,
  as: Component = 'div',
  className = '',
  gap = 'md',
  wrap = true,
  align = 'center',
  justify = 'start',
  ...props
}) => {
  return (
    <Component
      className={`flex min-w-0 ${wrap ? 'flex-wrap' : 'flex-nowrap'} ${gapMap[gap]} ${alignMap[align]} ${justifyMap[justify]} ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
};
