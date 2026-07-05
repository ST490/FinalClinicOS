import { useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';

export default function PlaceholderPage() {
  const location = useLocation();
  const pageName = location.pathname.slice(1).replace(/[-/]/g, ' ') || 'Page';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
        <Construction className="w-8 h-8 text-primary-500" />
      </div>
      <h1 className="text-xl font-bold text-text-primary capitalize mb-2">{pageName}</h1>
      <p className="text-sm text-text-secondary text-center max-w-md">
        This page is part of the ClinicOS dashboard shell. Content and functionality will be implemented in the next phase.
      </p>
      <div className="mt-6 px-4 py-2 rounded-lg bg-primary-50 text-primary-700 text-xs font-medium">
        Shell Mode — No API Connected
      </div>
    </div>
  );
}
