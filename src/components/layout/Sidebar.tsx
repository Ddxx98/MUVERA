import React from 'react';

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: [React.ReactNode, React.ReactNode]; // Exactly two children: [Sidebar, Content]
  as?: React.ElementType;
  className?: string;
  sideWidth?: string; // Preferred sidebar width, e.g. '18rem', '22rem'
  contentMin?: string; // Minimum content percentage or size before stacking, e.g. '50%'
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  sidePosition?: 'left' | 'right';
  noStretch?: boolean;
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
 * Sidebar: Intrinsic 2-pane layout that breaks into a stack when content space is constrained.
 * Avoids per-device media queries by using flex-basis and flex-grow math.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  children,
  as: Component = 'div',
  className = '',
  sideWidth = 'clamp(16rem, 25%, 22rem)',
  contentMin = '50%',
  gap = 'md',
  sidePosition = 'left',
  noStretch = false,
  ...props
}) => {
  const [first, second] = children;
  const sidebarElement = sidePosition === 'left' ? first : second;
  const mainContentElement = sidePosition === 'left' ? second : first;

  return (
    <Component
      className={`flex flex-wrap ${noStretch ? 'items-start' : 'items-stretch'} ${gapMap[gap]} w-full min-w-0 ${className}`.trim()}
      {...props}
    >
      <div
        className="min-w-0"
        style={{
          flexBasis: sideWidth,
          flexGrow: 1,
        }}
      >
        {sidebarElement}
      </div>
      <div
        className="min-w-0"
        style={{
          flexBasis: 0,
          flexGrow: 999,
          minWidth: contentMin,
        }}
      >
        {mainContentElement}
      </div>
    </Component>
  );
};
