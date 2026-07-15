import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { prescriptionApi as api } from '../lib/prescriptions';
import { Plus, Trash2, Clipboard, AlertCircle, Loader2 } from 'lucide-react';

// Demo drugs for autocomplete
const DRUG_DATABASE = ['Amoxicillin 500mg', 'Paracetamol 650mg', 'Omeprazole 20mg', 'Metformin 500mg', 'Azithromycin 250mg', 'Ibuprofen 400mg'];

export default function PrescriptionsPage() {
  const { clinic, user } = useAuth();
  const [patientId, setPatientId] = useState('');
  const [notes, setNotes] = useState('');
  const [drugName, setDrugName] = useState('');
  const [dosage, setDosage] = useState('1 tablet');
  const [frequency, setFrequency] = useState('Once daily');
  const [duration, setDuration] = useState('7 days');
  const [items, setItems] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDrugSearch = (val: string) => {
    setDrugName(val);
    if (val) setSuggestions(DRUG_DATABASE.filter(d => d.toLowerCase().includes(val.toLowerCase())));
    else setSuggestions([]);
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!drugName) { setError('Select a medication'); return; }
    setItems(prev => [...prev, { id: Date.now().toString(), medicineName: drugName, dosage, frequency, duration }]);
    setDrugName(''); setDosage('1 tablet'); setFrequency('Once daily'); setDuration('7 days');
    setSuggestions([]);
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const handleSubmit = async () => {
    if (!clinic) return alert('Select a clinic first');
    if (!patientId) { setError('Enter patient ID'); return; }
    if (items.length === 0) { setError('Add at least one medication'); return; }
    setError(''); setLoading(true);
    try {
      const rx = await api.create({ clinicId: clinic.id, patientId, doctorId: user!.id, notes, items });
      alert(`Prescription created: ${rx.id}`);
      setItems([]); setPatientId(''); setNotes('');
    } catch { alert('Failed to create prescription'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5 animate-fade-in font-sans pb-12">
      <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
        <Clipboard className="w-5 h-5 text-primary-600" /> Prescription Writer
      </h1>

      <form onSubmit={addItem} className="bg-surface-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1">Patient ID *</label>
            <input value={patientId} onChange={e => setPatientId(e.target.value)} placeholder="Patient UUID"
              className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-surface-card" />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1">Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes"
              className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-surface-card" />
          </div>
        </div>
        <hr className="border-border-light" />
        <h3 className="text-sm font-bold">Add Medication</h3>
        <div className="relative">
          <input value={drugName} onChange={e => handleDrugSearch(e.target.value)} placeholder="Search medication..."
            className="w-full text-sm border border-border rounded-lg px-3 py-2.5 bg-surface-card" />
          {(suggestions.length > 0 || drugName) && (
            <div className="absolute z-50 w-full mt-1 bg-surface-card rounded-lg border border-border shadow-lg max-h-48 overflow-y-auto">
              {suggestions.map(s => (
                <button key={s} type="button" onClick={() => { setDrugName(s); setSuggestions([]); }}
                  className="w-full text-left text-xs px-3 py-2 hover:bg-surface">{s}</button>
              ))}
              {drugName && (
                <button type="button" onClick={() => { setSuggestions([]); }}
                  className="w-full text-left text-xs px-3 py-2 hover:bg-surface text-primary-600 font-semibold border-t border-border-light">
                  + Add Custom "{drugName}"
                </button>
              )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <input value={dosage} onChange={e => setDosage(e.target.value)} placeholder="Dosage"
            className="text-sm border border-border rounded-lg px-3 py-2.5 bg-surface-card" />
          <select value={frequency} onChange={e => setFrequency(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-2.5 bg-surface-card">
            <option>Once daily</option><option>Twice daily</option><option>Three times daily</option>
            <option>Before meals</option><option>As needed (PRN)</option>
          </select>
          <input value={duration} onChange={e => setDuration(e.target.value)} placeholder="Duration"
            className="text-sm border border-border rounded-lg px-3 py-2.5 bg-surface-card" />
        </div>
        {error && <span className="text-xs text-danger flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</span>}
        <button type="submit" className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 py-3 rounded-lg">
          <Plus className="w-4 h-4" /> Add to Prescription
        </button>
      </form>

      <div className="bg-surface-card rounded-xl border border-border p-5 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold">Current Items ({items.length})</h3>
        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="p-3.5 rounded-xl border border-border flex justify-between">
                <div>
                  <p className="text-xs font-bold">{item.medicineName}</p>
                  <p className="text-[11px] text-text-secondary mt-1">Take {item.dosage} • {item.frequency} • {item.duration}</p>
                </div>
                <button onClick={() => removeItem(item.id)} className="text-text-muted hover:text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            <button onClick={handleSubmit} disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 py-3 rounded-lg">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Prescription'}
            </button>
          </div>
        ) : (
          <div className="py-12 text-center border border-dashed border-border rounded-xl text-text-secondary">
            <Clipboard className="w-8 h-8 mx-auto text-text-muted" />
            <p className="text-xs font-semibold mt-2">Prescription is empty</p>
          </div>
        )}
      </div>
    </div>
  );
}