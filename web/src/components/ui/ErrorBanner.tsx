import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBannerProps {
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

/**
 * Error banner with optional retry button.
 * `compact` renders as an inline banner; default renders as a centered empty-state block.
 */
export default function ErrorBanner({
  message = 'Something went wrong. Please try again.',
  onRetry,
  compact = false,
}: ErrorBannerProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2.5 p-3.5 bg-danger/10 border border-danger/20 rounded-xl text-sm">
        <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0" />
        <span className="text-danger font-medium flex-1">{message}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 text-xs font-semibold text-danger hover:text-danger/80 px-2.5 py-1.5 rounded-lg border border-danger/20 hover:bg-danger/5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-danger" />
      </div>
      <div className="text-center space-y-1">
        <p className="font-semibold text-text-primary">Failed to load data</p>
        <p className="text-sm text-text-muted max-w-md">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 px-5 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      )}
    </div>
  );
}
