import React from 'react';

export interface SwitcherProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  as?: React.ElementType;
  className?: string;
  threshold?: string; // Container threshold before switching, e.g. '30rem', '48rem'
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  limit?: number;
}

const gapMap = {
  none: 'gap-0',
  xs: 'gap-[clamp(0.25rem,0.8vw,0.5rem)]',
  sm: 'gap-[clamp(0.5rem,1.2vw,0.75rem)]',
  md: 'gap-[clamp(0.75rem,2vw,1.5rem)]',
  lg: 'gap-[clamp(1.25rem,3vw,2.25rem)]',
  xl: 'gap-[clamp(2rem,4vw,3.5rem)]',
};

/**
 * Switcher: Automatically switches between a horizontal row and vertical stack
 * based on whether total space is above or below the configured threshold.
 */
export const Switcher: React.FC<SwitcherProps> = ({
  children,
  as: Component = 'div',
  className = '',
  threshold = '38rem',
  gap = 'md',
  limit = 4,
  ...props
}) => {
  return (
    <Component
      className={`flex flex-wrap w-full min-w-0 ${gapMap[gap]} ${className}`.trim()}
      style={
        {
          '--switcher-threshold': threshold,
        } as React.CSSProperties
      }
      {...props}
    >
      {React.Children.map(children, (child) => (
        <div
          className="min-w-0"
          style={{
            flexGrow: 1,
            flexBasis: `calc((var(--switcher-threshold) - 100%) * 999)`,
          }}
        >
          {child}
        </div>
      ))}
    </Component>
  );
};
