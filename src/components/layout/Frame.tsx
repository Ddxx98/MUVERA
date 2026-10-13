import React from 'react';

export interface FrameProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  ratio?: '1/1' | '4/3' | '3/2' | '16/9' | '4/5' | '21/9' | string;
  className?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
}

/**
 * Frame: Fluid aspect-ratio container ensuring media never overflows or causes layout shift.
 */
export const Frame: React.FC<FrameProps> = ({
  children,
  ratio = '1/1',
  className = '',
  objectFit = 'cover',
  style,
  ...props
}) => {
  return (
    <div
      className={`relative w-full overflow-hidden isolate ${className}`.trim()}
      style={{
        aspectRatio: ratio,
        ...style,
      }}
      {...props}
    >
      <div
        className={`w-full h-full [&>img]:w-full [&>img]:h-full [&>img]:object-${objectFit} [&>video]:w-full [&>video]:h-full [&>video]:object-${objectFit}`}
      >
        {children}
      </div>
    </div>
  );
};
