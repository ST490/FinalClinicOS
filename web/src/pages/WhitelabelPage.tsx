import { useState } from 'react';
import { Palette, Eye, ArrowUpRight, Check, Sparkles, Sliders, Globe } from 'lucide-react';

const CLINICS = [
  {
    name: 'Downtown Specialty Clinic',
    theme: 'teal',
    colorHex: '#0d9488',
    headline: 'Modern Specialist Care, Tailored to You',
    subheadline: 'Apex clinical specialists utilizing state-of-the-art diagnostic pathways and patient care systems.',
  },
  {
    name: 'Westside Family Practice',
    theme: 'indigo',
    colorHex: '#4f46e5',
    headline: 'Compassionate Care for the Whole Family',
    subheadline: 'Providing comprehensive pediatric, family wellness, and preventive care models across NYC.',
  },
  {
    name: 'Northside Urgent Care',
    theme: 'rose',
    colorHex: '#e11d48',
    headline: 'Rapid Medical Attention When It Matters Most',
    subheadline: 'Walk-ins welcome. Certified primary responders and triage physicians standing by 24/7.',
  },
  {
    name: 'East Valley Health',
    theme: 'emerald',
    colorHex: '#059669',
    headline: 'Natural Wellness & Integrative Primary Care',
    subheadline: 'Synthesizing wellness therapies with clinical evidence to establish health spans.',
  },
];

export default function WhitelabelPage() {
  const [selectedClinic, setSelectedClinic] = useState(CLINICS[0]);
  const [customHeadline, setCustomHeadline] = useState(selectedClinic.headline);
  const [customSubheadline, setCustomSubheadline] = useState(selectedClinic.subheadline);
  const [activeTheme, setActiveTheme] = useState(selectedClinic.theme);

  const handleClinicChange = (name: string) => {
    const found = CLINICS.find(c => c.name === name);
    if (found) {
      setSelectedClinic(found);
      setCustomHeadline(found.headline);
      setCustomSubheadline(found.subheadline);
      setActiveTheme(found.theme);
    }
  };

  // Get accent color class
  const getAccentBg = (themeName: string) => {
    switch (themeName) {
      case 'indigo': return 'bg-indigo-600 hover:bg-indigo-700 text-white';
      case 'rose': return 'bg-rose-600 hover:bg-rose-700 text-white';
      case 'emerald': return 'bg-emerald-600 hover:bg-emerald-700 text-white';
      default: return 'bg-teal-600 hover:bg-teal-700 text-white';
    }
  };

  const getAccentText = (themeName: string) => {
    switch (themeName) {
      case 'indigo': return 'text-indigo-600';
      case 'rose': return 'text-rose-600';
      case 'emerald': return 'text-emerald-600';
      default: return 'text-teal-600';
    }
  };

  const getAccentBorder = (themeName: string) => {
    switch (themeName) {
      case 'indigo': return 'border-indigo-500/20';
      case 'rose': return 'border-rose-500/20';
      case 'emerald': return 'border-emerald-500/20';
      default: return 'border-teal-500/20';
    }
  };

  // Simulate launch public URL
  const publicUrl = `/public-landing?clinic=${encodeURIComponent(selectedClinic.name)}&headline=${encodeURIComponent(customHeadline)}&subheadline=${encodeURIComponent(customSubheadline)}&theme=${activeTheme}`;

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary-600" />
            White-Label Patient Portals
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Configure customized patient-facing landing templates, typography, and clinic color accents dynamically.
          </p>
        </div>
        
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-sm cursor-pointer ${getAccentBg(activeTheme)}`}
        >
          <Globe className="w-4 h-4" />
          Preview Live Patient Site
          <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Editor & Preview Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        
        {/* Editor Settings: 2/5 width */}
        <div className="xl:col-span-2 bg-surface-card rounded-xl border border-border p-5 shadow-sm space-y-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-wider pb-3 border-b border-border-light">
            <Sliders className="w-4 h-4 text-primary-600" /> Branding Configurator
          </div>

          {/* Select Clinic Node */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary block">Active Tenant Node</label>
            <select
              value={selectedClinic.name}
              onChange={(e) => handleClinicChange(e.target.value)}
              className="w-full text-xs border border-border rounded-lg px-2.5 py-2.5 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none border-slate-200"
            >
              {CLINICS.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
            <p className="text-[10px] text-text-muted">Branding overrides apply dynamically to this clinic branch parameters.</p>
          </div>

          {/* Color Accent Toggles */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary block">Branding Accent Color</label>
            <div className="flex gap-3">
              {['teal', 'indigo', 'rose', 'emerald'].map((t) => {
                const colors: Record<string, string> = {
                  teal: 'bg-teal-600',
                  indigo: 'bg-indigo-600',
                  rose: 'bg-rose-600',
                  emerald: 'bg-emerald-600',
                };
                return (
                  <button
                    key={t}
                    onClick={() => setActiveTheme(t)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-105 border-2 cursor-pointer ${
                      activeTheme === t ? 'border-text-primary ring-2 ring-primary-500/20' : 'border-transparent'
                    } ${colors[t]}`}
                  >
                    {activeTheme === t && <Check className="w-4 h-4 text-white font-bold" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Banner Copy Overrides */}
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary block">Custom Hero Headline</label>
              <input
                type="text"
                value={customHeadline}
                onChange={(e) => setCustomHeadline(e.target.value)}
                placeholder="Clinic Slogan..."
                className="w-full text-xs border border-border rounded-lg px-2.5 py-2.5 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary block">Custom Description Copy</label>
              <textarea
                value={customSubheadline}
                onChange={(e) => setCustomSubheadline(e.target.value)}
                rows={3}
                placeholder="Provide a detailed clinic banner summary..."
                className="w-full text-xs border border-border rounded-lg px-2.5 py-2.5 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none border-slate-200 leading-relaxed resize-none"
              />
            </div>
          </div>

          {/* Action notice */}
          <div className="p-3.5 bg-primary-50 border border-primary-100 rounded-lg flex gap-2">
            <Sparkles className="w-4 h-4 text-primary-600 shrink-0 mt-0.5 animate-pulse" />
            <p className="text-[10px] text-primary-800 leading-relaxed font-light">
              White-label configurations serialize into client states. Any patient visiting the public link sees custom layouts, matching logos, and accent themes instantly.
            </p>
          </div>
        </div>

        {/* Real-time Interactive Preview: 3/5 width */}
        <div className="xl:col-span-3 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col shadow-lg">
          
          {/* Mock Browser Header */}
          <div className="bg-slate-950 px-4 py-2 flex items-center justify-between border-b border-slate-800">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
            </div>
            <div className="text-[10px] font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-10 py-1 rounded select-none w-[60%] text-center truncate">
              clinicos.io/p/{selectedClinic.name.toLowerCase().replace(/ /g, '-')}
            </div>
            <span className="text-[9px] font-bold text-slate-500 select-none flex items-center gap-0.5">
              <Eye className="w-3 h-3" /> Live Preview
            </span>
          </div>

          {/* Preview Container: Renders simulated patient landing page */}
          <div className="flex-1 bg-white p-6 overflow-y-auto max-h-[460px] space-y-8 select-none">
            
            {/* Nav Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-white font-black text-xs ${
                  activeTheme === 'indigo' ? 'bg-indigo-600' :
                  activeTheme === 'rose' ? 'bg-rose-600' :
                  activeTheme === 'emerald' ? 'bg-emerald-600' :
                  'bg-teal-600'
                }`}>
                  c
                </div>
                <span className="font-extrabold text-xs text-slate-900 truncate max-w-[150px]">{selectedClinic.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer">Find Doctors</span>
                <button className={`text-[9px] font-bold px-3 py-1.5 rounded-md cursor-pointer ${
                  activeTheme === 'indigo' ? 'bg-indigo-50 text-indigo-700' :
                  activeTheme === 'rose' ? 'bg-rose-50 text-rose-700' :
                  activeTheme === 'emerald' ? 'bg-emerald-50 text-emerald-700' :
                  'bg-teal-50 text-teal-700'
                }`}>
                  Patient Login
                </button>
              </div>
            </div>

            {/* Banner Section */}
            <div className="text-center space-y-3.5 max-w-lg mx-auto py-4">
              <div className={`mx-auto w-fit text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${getAccentBorder(activeTheme)} ${getAccentText(activeTheme)} bg-white shadow-sm`}>
                Official Patient Portal
              </div>
              <h2 className="text-lg font-black text-slate-900 leading-snug tracking-tight">
                {customHeadline || 'Modern Specialist Care, Tailored to You'}
              </h2>
              <p className="text-[11px] text-slate-500 leading-relaxed font-light">
                {customSubheadline || 'Apex clinical specialists utilizing state-of-the-art diagnostic pathways.'}
              </p>

              {/* Action Buttons */}
              <div className="flex justify-center gap-3 pt-2">
                <button className={`text-[10px] font-bold px-4 py-2 rounded-lg shadow-sm cursor-pointer ${getAccentBg(activeTheme)}`}>
                  Book Appointment
                </button>
                <button className="text-[10px] font-bold px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer">
                  Learn More
                </button>
              </div>
            </div>

            {/* Features Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 border border-slate-100 rounded-lg text-center space-y-1">
                <span className={`text-[9px] font-extrabold ${getAccentText(activeTheme)}`}>01. Care Team</span>
                <p className="font-bold text-[10px] text-slate-800">Expert Doctors</p>
                <p className="text-[8px] text-slate-500">Board-certified personnel</p>
              </div>
              <div className="p-3 border border-slate-100 rounded-lg text-center space-y-1">
                <span className={`text-[9px] font-extrabold ${getAccentText(activeTheme)}`}>02. Scheduling</span>
                <p className="font-bold text-[10px] text-slate-800">Easy Booking</p>
                <p className="text-[8px] text-slate-500">Secure digital reservations</p>
              </div>
              <div className="p-3 border border-slate-100 rounded-lg text-center space-y-1">
                <span className={`text-[9px] font-extrabold ${getAccentText(activeTheme)}`}>03. Messaging</span>
                <p className="font-bold text-[10px] text-slate-800">Direct Contact</p>
                <p className="text-[8px] text-slate-500">WhatsApp notifications</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
