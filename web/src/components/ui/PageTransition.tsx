import type { ReactNode } from 'react';

/**
 * Wraps page content with a consistent fade-in entrance animation.
 * Applied at the layout level so every route gets it automatically.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
