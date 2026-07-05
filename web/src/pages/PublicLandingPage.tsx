import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Calendar, Clock, Star, Phone, MapPin, 
  ShieldCheck, CheckCircle2, User, Mail, Award, X
} from 'lucide-react';

const DOCTOR_PRESETS: Record<string, { name: string; specialty: string; image: string }[]> = {
  'Downtown Specialty Clinic': [
    { name: 'Dr. Aris Thorne', specialty: 'Chief Executive Officer & Physician', image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200' },
    { name: 'Dr. Sarah Jenkins', specialty: 'Senior Cardiologist', image: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=200' }
  ],
  'Westside Family Practice': [
    { name: 'Dr. Emily Chen', specialty: 'Senior Pediatrician', image: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=200' },
    { name: 'Dr. David Miller', specialty: 'General Practitioner', image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200' }
  ],
  'Northside Urgent Care': [
    { name: 'Dr. Raj Patel', specialty: 'Urgent Care Specialist', image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200' },
    { name: 'Dr. Lisa Tanaka', specialty: 'Emergency Triage Doctor', image: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=200' }
  ],
  'East Valley Health': [
    { name: 'Dr. Marcus Aurelius', specialty: 'Integrative Wellness Doctor', image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200' },
    { name: 'Dr. Chloe Vance', specialty: 'Alternative Care Consultant', image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200' }
  ],
};

const SERVICES_PRESETS: Record<string, string[]> = {
  'Downtown Specialty Clinic': ['Cardiovascular Screenings', 'Chronic Disease Management', 'Diagnostic Imaging', 'Specialist Consultations'],
  'Westside Family Practice': ['Pediatric Vaccinations', 'General Family Health check', 'Geriatric Care', 'Annual Wellness Physicals'],
  'Northside Urgent Care': ['Acute Injury Stitches', 'Fracture Splinting', 'Rapid Flu & COVID Testing', '24/7 Trauma Screenings'],
  'East Valley Health': ['Holistic Acupuncture', 'Evidence-Based Nutrition', 'Stress Management Therapy', 'Preventive Lifespan Assessments'],
};

export default function PublicLandingPage() {
  const [searchParams] = useSearchParams();

  // Load configuration parameters from URL parameters or fall back to Downtown Specialty Clinic values
  const clinicName = searchParams.get('clinic') || 'Downtown Specialty Clinic';
  const headline = searchParams.get('headline') || 'Modern Specialist Care, Tailored to You';
  const subheadline = searchParams.get('subheadline') || 'Apex clinical specialists utilizing state-of-the-art diagnostic pathways and patient care systems.';
  const theme = (searchParams.get('theme') || 'teal') as 'teal' | 'indigo' | 'rose' | 'emerald';

  // Booking form states
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Retrieve presets
  const doctorsList = DOCTOR_PRESETS[clinicName] || DOCTOR_PRESETS['Downtown Specialty Clinic'];
  const servicesList = SERVICES_PRESETS[clinicName] || SERVICES_PRESETS['Downtown Specialty Clinic'];

  // Styling helper dictionaries
  const themeClasses = {
    teal: {
      accentText: 'text-teal-600',
      accentBg: 'bg-teal-600 hover:bg-teal-700 text-white',
      accentBgLight: 'bg-teal-50 text-teal-700 border-teal-100',
      accentRing: 'focus:ring-teal-500/20 focus:border-teal-500',
      accentFill: 'bg-teal-600',
      accentBorder: 'border-teal-500/20',
      accentGradient: 'from-teal-600 to-emerald-500',
    },
    indigo: {
      accentText: 'text-indigo-600',
      accentBg: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      accentBgLight: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      accentRing: 'focus:ring-indigo-500/20 focus:border-indigo-500',
      accentFill: 'bg-indigo-600',
      accentBorder: 'border-indigo-500/20',
      accentGradient: 'from-indigo-600 to-blue-500',
    },
    rose: {
      accentText: 'text-rose-600',
      accentBg: 'bg-rose-600 hover:bg-rose-700 text-white',
      accentBgLight: 'bg-rose-50 text-rose-700 border-rose-100',
      accentRing: 'focus:ring-rose-500/20 focus:border-rose-500',
      accentFill: 'bg-rose-600',
      accentBorder: 'border-rose-500/20',
      accentGradient: 'from-rose-600 to-orange-500',
    },
    emerald: {
      accentText: 'text-emerald-600',
      accentBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      accentBgLight: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      accentRing: 'focus:ring-emerald-500/20 focus:border-emerald-500',
      accentFill: 'bg-emerald-600',
      accentBorder: 'border-emerald-500/20',
      accentGradient: 'from-emerald-600 to-teal-500',
    },
  };

  const style = themeClasses[theme] || themeClasses.teal;

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !patientEmail || !selectedDoctor || !preferredDate) {
      alert('Please fill out all mandatory fields.');
      return;
    }
    setBookingSuccess(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      
      {/* 1. Navbar */}
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm ${style.accentFill}`}>
              c
            </div>
            <span className="font-extrabold text-base text-slate-900 tracking-tight">{clinicName}</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <a href="#services" className="text-xs font-semibold text-slate-600 hover:text-slate-900 hidden sm:inline">Services</a>
            <a href="#doctors" className="text-xs font-semibold text-slate-600 hover:text-slate-900 hidden sm:inline">Physicians</a>
            <button
              onClick={() => alert(`Patient portal login requested for ${clinicName}.`)}
              className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Patient Login
            </button>
          </div>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <header className="bg-white border-b border-slate-100 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className={`mx-auto w-fit text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${style.accentBorder} ${style.accentText} bg-white shadow-sm flex items-center gap-1`}>
            <Award className="w-3.5 h-3.5" /> Official Patient Portal
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight tracking-tight">
            {headline}
          </h1>
          <p className="text-sm sm:text-base text-slate-500 leading-relaxed max-w-2xl mx-auto font-light">
            {subheadline}
          </p>
          <div className="flex justify-center gap-4 pt-3">
            <button
              onClick={() => {
                setSelectedDoctor(doctorsList[0]?.name || '');
                setIsBookingOpen(true);
              }}
              className={`text-xs sm:text-sm font-bold px-6 py-3.5 rounded-xl shadow-md cursor-pointer transition-all ${style.accentBg}`}
            >
              Book Appointment
            </button>
            <a
              href="#contact"
              className="text-xs sm:text-sm font-bold px-6 py-3.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 cursor-pointer transition-all flex items-center gap-1.5"
            >
              <Phone className="w-4 h-4 text-slate-400" /> Contact Clinic
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-12 space-y-16">
        
        {/* 3. Services Offered Section */}
        <section id="services" className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-extrabold text-slate-950">Clinical Specialties & Services</h2>
            <p className="text-xs text-slate-500 mt-1 font-light">Certified treatments available at our {clinicName} branch.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {servicesList.map((service, index) => (
              <div key={service} className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm space-y-3 hover:-translate-y-0.5 transition-transform duration-300">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${style.accentBgLight}`}>
                  0{index + 1}
                </span>
                <h3 className="font-bold text-sm text-slate-900">{service}</h3>
                <p className="text-[11px] text-slate-500 font-light leading-relaxed">
                  Scheduled consultation slot inclusions, prescription writing, and dynamic monitoring.
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Meet Doctors Section */}
        <section id="doctors" className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-extrabold text-slate-950">Our Specialty Care Physicians</h2>
            <p className="text-xs text-slate-500 mt-1 font-light">Directly schedule your slot with our board-certified clinical experts.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {doctorsList.map((doc) => (
              <div key={doc.name} className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm flex gap-4 items-center">
                <img
                  src={doc.image}
                  alt={doc.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-slate-100 shadow-sm"
                />
                <div className="space-y-1.5 flex-1">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">{doc.name}</h3>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">{doc.specialty}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400">5.0 (40+ reviews)</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedDoctor(doc.name);
                      setIsBookingOpen(true);
                    }}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer w-fit ${style.accentBg}`}
                  >
                    Select & Book
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Why Choose Us Section */}
        <section className="bg-white rounded-xl border border-slate-100 p-8 shadow-sm flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 space-y-4">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Integrating Clinical Systems & Patient Care</h2>
            <p className="text-xs text-slate-500 leading-relaxed font-light">
              We leverage ClinicOS, a premium multi-tenant clinic management system, to organize your prescriptions, scheduling lines, and invoice history seamlessly.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${style.accentText}`} />
                <span className="text-xs font-semibold text-slate-700">Digital Rx Prescriptions</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${style.accentText}`} />
                <span className="text-xs font-semibold text-slate-700">Instant Check-In Queues</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${style.accentText}`} />
                <span className="text-xs font-semibold text-slate-700">Secure Vitals Logs</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${style.accentText}`} />
                <span className="text-xs font-semibold text-slate-700">WhatsApp reminders</span>
              </div>
            </div>
          </div>
          <div className="w-full md:w-[350px] aspect-[4/3] bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center p-6 text-center">
            <div className="space-y-2">
              <ShieldCheck className={`w-10 h-10 mx-auto ${style.accentText}`} />
              <h3 className="font-bold text-xs text-slate-900">HIPAA Compliant Platform</h3>
              <p className="text-[10px] text-slate-500 max-w-[200px] leading-relaxed mx-auto font-light">
                Our database systems encrypt patient data in transit and at rest to ensure medical record privacy.
              </p>
            </div>
          </div>
        </section>

        {/* 6. Contact Coordinates & Details */}
        <section id="contact" className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm text-center space-y-2">
            <MapPin className={`w-6 h-6 mx-auto ${style.accentText}`} />
            <h3 className="font-bold text-xs text-slate-900">Clinic Address</h3>
            <p className="text-[11px] text-slate-500 font-light leading-relaxed">
              123 Medical Plaza Boulevard, Suite 400<br />New York, NY 10001
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm text-center space-y-2">
            <Phone className={`w-6 h-6 mx-auto ${style.accentText}`} />
            <h3 className="font-bold text-xs text-slate-900">Telephone Lines</h3>
            <p className="text-[11px] text-slate-500 font-light leading-relaxed">
              Main Office: +1 (555) 901-2345<br />Urgent Care Desk: +1 (555) 901-9988
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm text-center space-y-2">
            <Clock className={`w-6 h-6 mx-auto ${style.accentText}`} />
            <h3 className="font-bold text-xs text-slate-900">Operating Hours</h3>
            <p className="text-[11px] text-slate-500 font-light leading-relaxed">
              Mon - Fri: 8:00 AM - 6:00 PM<br />Sat: 9:00 AM - 2:00 PM (Sun Closed)
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-8 px-4 mt-12 text-center text-text-muted text-[10px] font-semibold">
        <p>© 2026 {clinicName}. Renders by ClinicOS. All rights reserved.</p>
      </footer>

      {/* Booking Overlay Modal */}
      {isBookingOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-100 max-w-md w-full p-6 shadow-2xl relative space-y-4">
            
            {/* Close button */}
            <button
              onClick={() => {
                setIsBookingOpen(false);
                setBookingSuccess(false);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {bookingSuccess ? (
              <div className="text-center py-6 space-y-3.5">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <div className="space-y-1">
                  <h3 className="font-extrabold text-sm text-slate-900">Appointment Requested!</h3>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed font-light">
                    Your request with <span className="font-semibold text-slate-800">{selectedDoctor}</span> at <span className="font-semibold text-slate-800">{clinicName}</span> was logged successfully.
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg text-emerald-800 text-[10px] font-semibold">
                  A verification link & calendar invite has been sent to your email.
                </div>
                <button
                  onClick={() => {
                    setIsBookingOpen(false);
                    setBookingSuccess(false);
                    setPatientName('');
                    setPatientEmail('');
                  }}
                  className={`text-xs font-bold w-full py-2.5 rounded-lg cursor-pointer ${style.accentBg}`}
                >
                  Close Window
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-950 flex items-center gap-1.5">
                    <Calendar className={`w-4 h-4 ${style.accentText}`} /> Book a Consultation
                  </h3>
                  <p className="text-[10px] text-slate-500 font-light">Securely schedule appointments at our {clinicName} branch.</p>
                </div>

                <form onSubmit={handleBookingSubmit} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">Your Full Name *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="Liam Brown"
                        className={`w-full text-xs border border-slate-200 rounded-lg pl-9 pr-3 py-2 outline-none ${style.accentRing}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">Your Email Address *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={patientEmail}
                        onChange={(e) => setPatientEmail(e.target.value)}
                        placeholder="liam.brown@example.com"
                        className={`w-full text-xs border border-slate-200 rounded-lg pl-9 pr-3 py-2 outline-none ${style.accentRing}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">Selected Physician *</label>
                    <select
                      value={selectedDoctor}
                      onChange={(e) => setSelectedDoctor(e.target.value)}
                      className={`w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2.5 outline-none bg-white ${style.accentRing}`}
                    >
                      {doctorsList.map(doc => (
                        <option key={doc.name} value={doc.name}>{doc.name} ({doc.specialty})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">Preferred Date *</label>
                      <input
                        type="date"
                        required
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        className={`w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 outline-none bg-white ${style.accentRing}`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">Preferred Time *</label>
                      <select
                        value={preferredTime}
                        onChange={(e) => setPreferredTime(e.target.value)}
                        className={`w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2.5 outline-none bg-white ${style.accentRing}`}
                      >
                        <option value="09:00 AM">09:00 AM</option>
                        <option value="10:30 AM">10:30 AM</option>
                        <option value="01:00 PM">01:00 PM</option>
                        <option value="03:30 PM">03:30 PM</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={`text-xs font-bold w-full py-3 rounded-lg shadow-sm cursor-pointer transition-colors mt-2 ${style.accentBg}`}
                  >
                    Confirm Booking Reservation
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
