// Front-end-only white-label config store (no backend yet — see CLAUDE.md §21).
// Per-clinic branding is persisted in localStorage and read by PublicLandingPage.

export type WLTheme = 'teal' | 'indigo' | 'rose' | 'emerald';

export interface WLDoctor {
  id: string;
  name: string;
  specialty: string;
  photo?: string; // data URL
}

export interface WLMotionBanner {
  enabled: boolean;
  title: string;
  message: string;
  image?: string; // data URL
  ctaLabel: string;
  ctaUrl: string;
}

export interface WLContact {
  phone: string;
  email: string;
  address: string;
  hours: string;
}

export interface WhitelabelConfig {
  clinicId: string;
  logo?: string; // data URL
  banner?: string; // data URL
  building?: string; // data URL
  theme: WLTheme;
  headline: string;
  subheadline: string;
  doctors: WLDoctor[];
  motionBanner: WLMotionBanner;
  contact: WLContact;
  about: string;
  services: string[];
}

const KEY = (clinicId: string) => `wl:${clinicId}`;

export function emptyConfig(clinicId: string): WhitelabelConfig {
  return {
    clinicId,
    theme: 'teal',
    headline: '',
    subheadline: '',
    doctors: [],
    motionBanner: { enabled: false, title: '', message: '', ctaLabel: '', ctaUrl: '' },
    contact: { phone: '', email: '', address: '', hours: '' },
    about: '',
    services: [],
  };
}

export function getWhitelabel(clinicId: string): WhitelabelConfig | null {
  try {
    const raw = localStorage.getItem(KEY(clinicId));
    return raw ? (JSON.parse(raw) as WhitelabelConfig) : null;
  } catch {
    return null;
  }
}

export function saveWhitelabel(config: WhitelabelConfig): void {
  localStorage.setItem(KEY(config.clinicId), JSON.stringify(config));
}

// Downscale + re-encode uploads as JPEG so several base64 images fit in localStorage.
export function readImageAsDataUrl(file: File, maxW = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('canvas unavailable'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Sample content for the "demo showcase" toggle — shows the full layout before anything is uploaded.
export const DEMO_CONFIG: Omit<WhitelabelConfig, 'clinicId'> = {
  logo: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=200',
  banner:
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1200',
  building:
    'https://images.unsplash.com/photo-1519494140681-67b1c8e5f1b3?auto=format&fit=crop&q=80&w=800',
  theme: 'teal',
  headline: 'Compassionate Care, Close to Home',
  subheadline:
    'Board-certified physicians delivering personalized treatment plans with transparent pricing and modern diagnostics.',
  doctors: [
    {
      id: 'demo-1',
      name: 'Dr. Aris Thorne',
      specialty: 'Chief Medical Officer',
      photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200',
    },
    {
      id: 'demo-2',
      name: 'Dr. Sarah Jenkins',
      specialty: 'Senior Cardiologist',
      photo: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=200',
    },
  ],
  motionBanner: {
    enabled: true,
    title: 'Seasonal Wellness Campaign',
    message: 'Book your annual check-up this month and get 20% off diagnostics.',
    ctaLabel: 'Claim Offer',
    ctaUrl: '#contact',
  },
  contact: {
    phone: '+1 (555) 901-2345',
    email: 'care@clinic.com',
    address: '123 Medical Plaza Blvd, Suite 400, New York, NY 10001',
    hours: 'Mon - Fri: 8:00 AM - 6:00 PM\nSat: 9:00 AM - 2:00 PM',
  },
  about:
    'We combine evidence-based medicine with a patient-first approach, so every visit is clear, calm, and coordinated around you.',
  services: [
    'Cardiovascular Screenings',
    'Chronic Disease Management',
    'Diagnostic Imaging',
    'Specialist Consultations',
  ],
};
