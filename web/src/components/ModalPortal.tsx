import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

/**
 * Renders children into document.body via a React portal.
 * Use this to break modals out of parent overflow-hidden containers.
 */
export default function ModalPortal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}
