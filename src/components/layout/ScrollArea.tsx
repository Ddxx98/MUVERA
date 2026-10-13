import React from 'react';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical' | 'both';
  hideScrollbar?: boolean;
  className?: string;
}

/**
 * ScrollArea: Strictly designates allowed horizontal or vertical scroll zones
 * (e.g., product rails, chip filters, data tables) while preventing document-level overflow.
 */
export const ScrollArea: React.FC<ScrollAreaProps> = ({
  children,
  orientation = 'horizontal',
  hideScrollbar = false,
  className = '',
  ...props
}) => {
  const overflowClass =
    orientation === 'horizontal'
      ? 'overflow-x-auto overflow-y-hidden'
      : orientation === 'vertical'
      ? 'overflow-y-auto overflow-x-hidden'
      : 'overflow-auto';

  const scrollbarClass = hideScrollbar ? 'no-scrollbar' : '';

  return (
    <div
      className={`w-full max-w-full ${overflowClass} ${scrollbarClass} overscroll-contain ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
};
