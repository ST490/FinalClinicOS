import { useState, useEffect } from 'react';
import { Palette, Eye, ArrowUpRight, Check, Sparkles, Sliders, Globe, Upload, Image as ImageIcon, Trash2, Plus, Megaphone, Phone, MapPin, Clock, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { staffApi, type StaffMember } from '../lib/staff';
import { authApi } from '../lib/auth';
import {
  emptyConfig, getWhitelabel, saveWhitelabel, readImageAsDataUrl, DEMO_CONFIG,
  type WhitelabelConfig, type WLTheme,
} from '../lib/whitelabel';

const THEMES: WLTheme[] = ['teal', 'indigo', 'rose', 'emerald'];

// ponytail: map the front-end theme token to the backend accentColor hex so
// the public landing page (which reads Clinic.accentColor) matches the editor.
const THEME_HEX: Record<WLTheme, string> = {
  teal: '#14b8a6',
  indigo: '#6366f1',
  rose: '#f43f5e',
  emerald: '#10b981',
};

const themeClasses: Record<WLTheme, { text: string; bg: string; bgLight: string; border: string; fill: string }> = {
  teal: { text: 'text-teal-600', bg: 'bg-teal-600 hover:bg-teal-700 text-white', bgLight: 'bg-teal-50 text-teal-700 border-teal-100', border: 'border-teal-500/20', fill: 'bg-teal-600' },
  indigo: { text: 'text-indigo-600', bg: 'bg-indigo-600 hover:bg-indigo-700 text-white', bgLight: 'bg-indigo-50 text-indigo-700 border-indigo-100', border: 'border-indigo-500/20', fill: 'bg-indigo-600' },
  rose: { text: 'text-rose-600', bg: 'bg-rose-600 hover:bg-rose-700 text-white', bgLight: 'bg-rose-50 text-rose-700 border-rose-100', border: 'border-rose-500/20', fill: 'bg-rose-600' },
  emerald: { text: 'text-emerald-600', bg: 'bg-emerald-600 hover:bg-emerald-700 text-white', bgLight: 'bg-emerald-50 text-emerald-700 border-emerald-100', border: 'border-emerald-500/20', fill: 'bg-emerald-600' },
};

export default function WhitelabelPage() {
  const { clinics } = useAuth();
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [config, setConfig] = useState<WhitelabelConfig | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (clinics.length && !selectedClinicId) setSelectedClinicId(clinics[0].id);
  }, [clinics, selectedClinicId]);

  useEffect(() => {
    if (!selectedClinicId) return;
    setConfig(getWhitelabel(selectedClinicId) || emptyConfig(selectedClinicId));
    let active = true;
    setStaffLoading(true);
    staffApi.list({ clinicId: selectedClinicId })
      .then(s => { if (active) setStaffList(s); })
      .catch(() => {})
      .finally(() => { if (active) setStaffLoading(false); });
    return () => { active = false; };
  }, [selectedClinicId]);

  if (!config) {
    return <div className="text-sm text-text-secondary p-8">Loading clinic branding…</div>;
  }

  const clinicName = clinics.find(c => c.id === selectedClinicId)?.name ?? 'Clinic';
  const update = (patch: Partial<WhitelabelConfig>) => setConfig(c => (c ? { ...c, ...patch } : c));
  const updateMotion = (patch: Partial<WhitelabelConfig['motionBanner']>) =>
    setConfig(c => (c ? { ...c, motionBanner: { ...c.motionBanner, ...patch } } : c));
  const updateContact = (patch: Partial<WhitelabelConfig['contact']>) =>
    setConfig(c => (c ? { ...c, contact: { ...c.contact, ...patch } } : c));

  const onImage = (field: 'logo' | 'banner' | 'building') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await readImageAsDataUrl(file);
    update(field === 'logo' ? { logo: url } : field === 'banner' ? { banner: url } : { building: url });
    e.target.value = '';
  };

  const doctorCandidates = (() => {
    const docs = staffList.filter(s => s.clinicRoles.some(r => r.clinicId === selectedClinicId && r.role === 'DOCTOR'));
    return docs.length ? docs : staffList;
  })();

  const toggleDoctor = (s: StaffMember) => {
    const exists = config.doctors.some(d => d.id === s.id);
    if (exists) update({ doctors: config.doctors.filter(d => d.id !== s.id) });
    else update({ doctors: [...config.doctors, { id: s.id, name: s.name, specialty: '', photo: undefined }] });
  };
  const setDoctorPhoto = (id: string, url: string) =>
    update({ doctors: config.doctors.map(d => (d.id === id ? { ...d, photo: url } : d)) });
  const setDoctorSpecialty = (id: string, val: string) =>
    update({ doctors: config.doctors.map(d => (d.id === id ? { ...d, specialty: val } : d)) });

  const addService = () => update({ services: [...config.services, ''] });
  const setService = (i: number, val: string) =>
    update({ services: config.services.map((s, idx) => (idx === i ? val : s)) });
  const removeService = (i: number) =>
    update({ services: config.services.filter((_, idx) => idx !== i) });

  const handleSave = async () => {
    saveWhitelabel(config);
    // Persist logo/banner/accent to the backend so PublicLandingPage reads a
    // single source of truth across devices, not just this browser's localStorage.
    try {
      await authApi.updateClinicBranding(selectedClinicId, {
        logoUrl: config.logo,
        bannerUrl: config.banner,
        accentColor: THEME_HEX[config.theme],
      });
    } catch {
      // Branding persistence is best-effort; localStorage already saved locally.
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const preview = demoMode ? { ...emptyConfig(selectedClinicId), ...DEMO_CONFIG } : config;
  const t = themeClasses[preview.theme];
  const publicUrl = `/public-landing?clinic=${encodeURIComponent(selectedClinicId)}`;

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
            Customize the patient-facing landing page for this clinic branch.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary cursor-pointer select-none">
            <input type="checkbox" checked={demoMode} onChange={e => setDemoMode(e.target.checked)} className="accent-primary-600" />
            Demo showcase
          </label>
          <button
            onClick={handleSave}
            className="flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-all shadow-sm cursor-pointer"
          >
            <Check className="w-4 h-4" /> {saved ? 'Saved!' : 'Save Branding'}
          </button>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer"
            className={`flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-lg transition-all shadow-sm cursor-pointer ${t.bg}`}>
            <Globe className="w-4 h-4" /> Preview Live <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Editor */}
        <div className="xl:col-span-2 bg-surface-card rounded-xl border border-border p-5 shadow-sm space-y-5 max-h-[900px] overflow-y-auto" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-wider pb-3 border-b border-border-light">
            <Sliders className="w-4 h-4 text-primary-600" /> Branding Configurator
          </div>

          {/* Prescription letterhead note — composed from logo + contact below */}
          <div className="rounded-xl border border-border-light bg-surface p-3 space-y-1">
            <p className="text-[10px] font-semibold text-text-secondary flex items-center gap-1.5"><UserRound className="w-3.5 h-3.5" /> Prescription Letterhead</p>
            <p className="text-[10px] text-text-muted leading-relaxed">Printed prescriptions use the <span className="font-semibold">Logo</span> and <span className="font-semibold">Contact &amp; Hours</span> fields below as the letterhead, plus the clinic and prescribing doctor's name. No extra upload needed.</p>
          </div>

          {/* Clinic selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary block">Active Tenant Node</label>
            <select
              value={selectedClinicId}
              onChange={e => setSelectedClinicId(e.target.value)}
              className="w-full text-xs border border-border rounded-lg px-2.5 py-2.5 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 outline-none"
            >
              {clinics.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary block">Branding Accent Color</label>
            <div className="flex gap-3">
              {THEMES.map(th => (
                <button key={th} onClick={() => update({ theme: th })}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-105 border-2 cursor-pointer ${config.theme === th ? 'border-text-primary ring-2 ring-primary-500/20' : 'border-transparent'} ${themeClasses[th].fill}`}>
                  {config.theme === th && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Image uploads */}
          <ImageField label="Logo" value={config.logo} onUpload={onImage('logo')} onClear={() => update({ logo: undefined })} />
          <ImageField label="Hero Banner" value={config.banner} onUpload={onImage('banner')} onClear={() => update({ banner: undefined })} />
          <ImageField label="Building Photo" value={config.building} onUpload={onImage('building')} onClear={() => update({ building: undefined })} />

          {/* Hero copy */}
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary block">Custom Hero Headline</label>
              <input type="text" value={config.headline} onChange={e => update({ headline: e.target.value })}
                placeholder="Clinic Slogan..." className="w-full text-xs border border-border rounded-lg px-2.5 py-2.5 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary block">Custom Description Copy</label>
              <textarea value={config.subheadline} onChange={e => update({ subheadline: e.target.value })} rows={3}
                placeholder="Clinic banner summary..." className="w-full text-xs border border-border rounded-lg px-2.5 py-2.5 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 outline-none resize-none" />
            </div>
          </div>

          {/* Motion banner */}
          <div className="space-y-2 pt-1 border-t border-border-light">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5"><Megaphone className="w-3.5 h-3.5" /> Announcement / Offer Banner</label>
              <label className="flex items-center gap-1.5 text-[10px] font-semibold text-text-secondary cursor-pointer select-none">
                <input type="checkbox" checked={config.motionBanner.enabled} onChange={e => updateMotion({ enabled: e.target.checked })} className="accent-primary-600" /> On
              </label>
            </div>
            {config.motionBanner.enabled && (
              <div className="space-y-2">
                <input type="text" value={config.motionBanner.title} onChange={e => updateMotion({ title: e.target.value })} placeholder="Banner title (e.g. Seasonal Campaign)"
                  className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 outline-none" />
                <input type="text" value={config.motionBanner.message} onChange={e => updateMotion({ message: e.target.value })} placeholder="Message"
                  className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 outline-none" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={config.motionBanner.ctaLabel} onChange={e => updateMotion({ ctaLabel: e.target.value })} placeholder="CTA label" className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 outline-none" />
                  <input type="text" value={config.motionBanner.ctaUrl} onChange={e => updateMotion({ ctaUrl: e.target.value })} placeholder="CTA link (#contact)" className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 outline-none" />
                </div>
              </div>
            )}
          </div>

          {/* Doctors */}
          <div className="space-y-2 pt-1 border-t border-border-light">
            <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5"><UserRound className="w-3.5 h-3.5" /> Featured Doctors (from staff)</label>
            {staffLoading ? <p className="text-[10px] text-text-muted">Loading staff…</p> : (
              <div className="flex flex-wrap gap-1.5">
                {doctorCandidates.map(s => {
                  const on = config.doctors.some(d => d.id === s.id);
                  return (
                    <button key={s.id} onClick={() => toggleDoctor(s)}
                      className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-full border transition-colors cursor-pointer ${on ? `${t.bgLight} border` : 'border-border text-text-secondary hover:border-primary-300'}`}>
                      {on ? <Check className="w-3 h-3 inline mr-1" /> : null}{s.name}
                    </button>
                  );
                })}
              </div>
            )}
            {config.doctors.length > 0 && (
              <div className="space-y-2">
                {config.doctors.map(d => (
                  <div key={d.id} className="flex items-center gap-2 p-2 border border-border rounded-lg">
                    <img src={d.photo || 'https://via.placeholder.com/64'} alt={d.name} className="w-9 h-9 rounded-full object-cover border border-border" />
                    <div className="flex-1 space-y-1">
                      <p className="text-[10px] font-bold text-text-primary">{d.name}</p>
                      <input type="text" value={d.specialty} onChange={e => setDoctorSpecialty(d.id, e.target.value)} placeholder="Specialty" className="w-full text-[10px] border border-border rounded px-2 py-1 bg-surface text-text-primary outline-none focus:ring-1 focus:ring-primary-500/20" />
                    </div>
                    <label className="text-[9px] font-semibold text-primary-600 cursor-pointer underline">photo
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setDoctorPhoto(d.id, await readImageAsDataUrl(f)); e.target.value = ''; }} />
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contact + hours */}
          <div className="space-y-2 pt-1 border-t border-border-light">
            <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Contact & Hours</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" value={config.contact.phone} onChange={e => updateContact({ phone: e.target.value })} placeholder="Phone" className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 outline-none" />
              <input type="text" value={config.contact.email} onChange={e => updateContact({ email: e.target.value })} placeholder="Email" className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 outline-none" />
            </div>
            <input type="text" value={config.contact.address} onChange={e => updateContact({ address: e.target.value })} placeholder="Address" className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 outline-none" />
            <textarea value={config.contact.hours} onChange={e => updateContact({ hours: e.target.value })} rows={2} placeholder="Hours (one per line)" className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 outline-none resize-none" />
          </div>

          {/* About */}
          <div className="space-y-1.5 pt-1 border-t border-border-light">
            <label className="text-xs font-semibold text-text-secondary block">About / Mission</label>
            <textarea value={config.about} onChange={e => update({ about: e.target.value })} rows={3} placeholder="Short clinic about text..." className="w-full text-xs border border-border rounded-lg px-2.5 py-2.5 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 outline-none resize-none" />
          </div>

          {/* Services */}
          <div className="space-y-2 pt-1 border-t border-border-light">
            <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Services</label>
            {config.services.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input type="text" value={s} onChange={e => setService(i, e.target.value)} placeholder="Service name" className="flex-1 text-xs border border-border rounded-lg px-2.5 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 outline-none" />
                <button onClick={() => removeService(i)} className="text-danger hover:text-danger/80 p-1 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            <button onClick={addService} className="flex items-center gap-1 text-[10px] font-semibold text-primary-600 hover:text-primary-700 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Add service</button>
          </div>
        </div>

        {/* Preview */}
        <div className="xl:col-span-3 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col shadow-lg">
          <div className="bg-slate-950 px-4 py-2 flex items-center justify-between border-b border-slate-800">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" /><span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" /><span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
            </div>
            <div className="text-[10px] font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-10 py-1 rounded select-none w-[60%] text-center truncate">
              careme.io/p/{clinicName.toLowerCase().replace(/ /g, '-')}
            </div>
            <span className="text-[9px] font-bold text-slate-500 select-none flex items-center gap-0.5"><Eye className="w-3 h-3" /> Live Preview</span>
          </div>

          <div className="flex-1 bg-white overflow-y-auto max-h-[840px] select-none">
            {/* Nav */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                {preview.logo ? (
                  <img src={preview.logo} alt="" className="w-7 h-7 rounded-lg object-cover" />
                ) : (
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-xs ${t.fill}`}>c</div>
                )}
                <span className="font-extrabold text-xs text-slate-900 truncate max-w-[150px]">{clinicName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-600">Find Doctors</span>
                <button className={`text-[9px] font-bold px-3 py-1.5 rounded-md ${t.bgLight}`}>Patient Login</button>
              </div>
            </div>

            {/* Motion banner */}
            {preview.motionBanner.enabled && (
              <div className={`flex items-center gap-2 px-6 py-2 ${t.fill} text-white text-[10px] font-semibold animate-pulse`}>
                <Megaphone className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{preview.motionBanner.title} — {preview.motionBanner.message}</span>
                {preview.motionBanner.ctaLabel && <span className="underline shrink-0 ml-auto">{preview.motionBanner.ctaLabel}</span>}
              </div>
            )}

            {/* Hero / banner */}
            {preview.banner ? (
              <div className="relative">
                <img src={preview.banner} alt="" className="w-full h-44 object-cover" />
                <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-center px-6 space-y-2">
                  <h2 className="text-lg font-black text-white leading-snug drop-shadow">{preview.headline || 'Your Headline'}</h2>
                  <p className="text-[11px] text-white/90 font-light drop-shadow">{preview.subheadline}</p>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-3 max-w-lg mx-auto py-8 px-6">
                <h2 className="text-lg font-black text-slate-900">{preview.headline || 'Your Headline'}</h2>
                <p className="text-[11px] text-slate-500 font-light">{preview.subheadline}</p>
              </div>
            )}

            {/* Building photo */}
            {preview.building && (
              <div className="px-6 pt-6">
                <img src={preview.building} alt="Clinic building" className="w-full h-40 object-cover rounded-xl border border-slate-100" />
              </div>
            )}

            {/* Doctors */}
            {preview.doctors.length > 0 && (
              <div className="px-6 py-6 space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900">Our Physicians</h3>
                <div className="grid grid-cols-2 gap-3">
                  {preview.doctors.map(d => (
                    <div key={d.id} className="flex items-center gap-3 p-3 border border-slate-100 rounded-lg">
                      <img src={d.photo || 'https://via.placeholder.com/64'} alt={d.name} className="w-10 h-10 rounded-full object-cover border border-slate-100" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-slate-900 truncate">{d.name}</p>
                        <p className="text-[9px] text-slate-500 uppercase truncate">{d.specialty || 'Specialist'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Services */}
            {preview.services.filter(Boolean).length > 0 && (
              <div className="px-6 py-4 space-y-3">
                <h3 className="text-sm font-extrabold text-slate-900">Services</h3>
                <div className="grid grid-cols-2 gap-2">
                  {preview.services.filter(Boolean).map((s, i) => (
                    <div key={i} className="p-2.5 border border-slate-100 rounded-lg text-[10px] font-semibold text-slate-700">{s}</div>
                  ))}
                </div>
              </div>
            )}

            {/* About */}
            {preview.about && (
              <div className="px-6 py-4">
                <h3 className="text-sm font-extrabold text-slate-900 mb-1">About Us</h3>
                <p className="text-[11px] text-slate-500 font-light leading-relaxed">{preview.about}</p>
              </div>
            )}

            {/* Contact */}
            <div className="px-6 py-4 grid grid-cols-3 gap-3 border-t border-slate-100">
              <div className="text-center space-y-1">
                <Phone className={`w-5 h-5 mx-auto ${t.text}`} />
                <p className="text-[9px] font-bold text-slate-900">Phone</p>
                <p className="text-[9px] text-slate-500 whitespace-pre-line">{preview.contact.phone || '—'}</p>
              </div>
              <div className="text-center space-y-1">
                <MapPin className={`w-5 h-5 mx-auto ${t.text}`} />
                <p className="text-[9px] font-bold text-slate-900">Address</p>
                <p className="text-[9px] text-slate-500 whitespace-pre-line">{preview.contact.address || '—'}</p>
              </div>
              <div className="text-center space-y-1">
                <Clock className={`w-5 h-5 mx-auto ${t.text}`} />
                <p className="text-[9px] font-bold text-slate-900">Hours</p>
                <p className="text-[9px] text-slate-500 whitespace-pre-line">{preview.contact.hours || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageField({ label, value, onUpload, onClear }: {
  label: string; value?: string; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onClear: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> {label}</label>
        {value && <button onClick={onClear} className="text-[10px] font-semibold text-danger hover:text-danger/80 cursor-pointer">Remove</button>}
      </div>
      <label className="flex items-center justify-center gap-2 w-full text-[10px] font-semibold text-text-secondary border border-dashed border-border rounded-lg px-2.5 py-3 hover:border-primary-300 cursor-pointer transition-colors">
        <Upload className="w-3.5 h-3.5" /> {value ? 'Replace image' : 'Upload image'}
        <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
      </label>
      {value && <img src={value} alt={label} className="w-full h-20 object-cover rounded-lg border border-border" />}
    </div>
  );
}
