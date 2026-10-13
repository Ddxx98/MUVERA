import React from 'react';

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  as?: React.ElementType;
  className?: string;
  minItemWidth?: string; // e.g. '16rem', '18rem', '280px', '20rem'
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const gapMap = {
  none: 'gap-0',
  xs: 'gap-[clamp(0.5rem,1vw,0.75rem)]',
  sm: 'gap-[clamp(0.75rem,1.5vw,1rem)]',
  md: 'gap-[clamp(1rem,2vw,1.5rem)]',
  lg: 'gap-[clamp(1.5rem,2.5vw,2rem)]',
  xl: 'gap-[clamp(2rem,3.5vw,3rem)]',
};

/**
 * Grid: Intrinsic responsive CSS Grid that auto-fits without hardcoded breakpoint count waterfalls.
 * Uses repeat(auto-fit, minmax(min(100%, minItemWidth), 1fr)).
 */
export const Grid: React.FC<GridProps> = ({
  children,
  as: Component = 'div',
  className = '',
  minItemWidth = '16rem',
  gap = 'md',
  style,
  ...props
}) => {
  const dynamicStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minItemWidth}), 1fr))`,
    ...style,
  };

  return (
    <Component
      className={`w-full min-w-0 ${gapMap[gap]} ${className}`.trim()}
      style={dynamicStyle}
      {...props}
    >
      {children}
    </Component>
  );
};
