import React from 'react';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  as?: React.ElementType;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  noPadding?: boolean;
}

const sizeMap = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-[96rem]',
};

/**
 * Container: Centered responsive wrapper using max-inline-size and fluid horizontal insets.
 * Guarantees zero document overflow (no 100vw).
 */
export const Container: React.FC<ContainerProps> = ({
  children,
  as: Component = 'div',
  className = '',
  size = 'xl',
  noPadding = false,
  style,
  ...props
}) => {
  const paddingClass = noPadding ? '' : 'px-[clamp(1rem,3.5vw,2.5rem)]';
  const maxWidthClass = sizeMap[size] || sizeMap.xl;

  return (
    <Component
      className={`w-full mx-auto ${maxWidthClass} ${paddingClass} ${className}`.trim()}
      style={style}
      {...props}
    >
      {children}
    </Component>
  );
};
