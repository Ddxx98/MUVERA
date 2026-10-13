import React from 'react';

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  as?: React.ElementType;
  className?: string;
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between';
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
  stretch: 'items-stretch',
};

const justifyMap = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
};

/**
 * Stack: Vertical flex layout using fluid token gaps and intrinsic zero-min-width.
 */
export const Stack: React.FC<StackProps> = ({
  children,
  as: Component = 'div',
  className = '',
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  ...props
}) => {
  return (
    <Component
      className={`flex flex-col min-w-0 ${gapMap[gap]} ${alignMap[align]} ${justifyMap[justify]} ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
};
