import { useEffect, useCallback, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface AnimatedModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Max-width preset for the modal panel. */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const SIZE_CLASSES: Record<string, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-6xl',
};

/**
 * Animated modal with backdrop fade + content scale/fade.
 * Plays a reverse animation on close before unmounting.
 *
 * Replaces the raw `<ModalPortal><div className="fixed inset-0 ...">` pattern
 * used across the codebase.
 */
export default function AnimatedModal({ open, onClose, children, size = 'lg' }: AnimatedModalProps) {
  const [phase, setPhase] = useState<'closed' | 'entering' | 'open' | 'exiting'>('closed');

  // ── Sync phase with open prop ──
  useEffect(() => {
    if (open && (phase === 'closed' || phase === 'exiting')) {
      setPhase('entering');
      // After enter animation completes
      const t = setTimeout(() => setPhase('open'), 250);
      return () => clearTimeout(t);
    }
    if (!open && (phase === 'open' || phase === 'entering')) {
      setPhase('exiting');
      const t = setTimeout(() => setPhase('closed'), 150);
      return () => clearTimeout(t);
    }
  }, [open, phase]);

  // ── Escape key ──
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (phase !== 'closed') {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll while modal is open
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [phase, handleKeyDown]);

  if (phase === 'closed') return null;

  const isExiting = phase === 'exiting';

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center pt-12 px-4 pb-12 overflow-y-auto ${
        isExiting ? 'animate-backdrop-out' : 'animate-backdrop-in'
      }`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative w-full ${SIZE_CLASSES[size]} bg-surface-card rounded-2xl border border-border shadow-2xl ${
          isExiting ? 'animate-modal-out' : 'animate-modal-in'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
