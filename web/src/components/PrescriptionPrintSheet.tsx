import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { itemName, type Prescription, type PrescriptionItem } from '../lib/prescriptions';

interface Contact {
  phone: string;
  email: string;
  address: string;
  hours: string;
}

interface Props {
  prescription: Prescription;
  clinicName: string;
  logo?: string;
  headline?: string;
  contact?: Contact;
  onClose: () => void;
}

// Rendered via a portal into <body> so it's a direct child of body; print CSS
// hides every other body child with display:none (no leftover layout space).
// The letterhead is composed from the logo + clinic/doctor/contact fields, so
// it always prints — no PDF rasterization, no fragile image backgrounds.
export default function PrescriptionPrintSheet({ prescription, clinicName, logo, headline, contact, onClose }: Props) {
  useEffect(() => {
    document.body.classList.add('rx-printing');
    return () => document.body.classList.remove('rx-printing');
  }, []);

  const patient = prescription.patient;
  const doctor = prescription.doctor;
  const items = prescription.items ?? [];
  const date = new Date(prescription.createdAt).toLocaleDateString();
  const contactLine = [contact?.address, contact?.phone, contact?.email].filter(Boolean).join('  ·  ');

  const sheet = (
    <div className="rx-print-sheet fixed inset-0 z-[9999] bg-slate-900/40 overflow-y-auto">
      <style>{`
        @page { margin: 12mm; }
        @media print {
          body.rx-printing > *:not(.rx-print-sheet) { display: none !important; }
          .rx-print-sheet {
            position: static !important; inset: auto !important;
            background: #fff !important; overflow: visible !important;
          }
          .rx-print-sheet .no-print { display: none !important; }
          .rx-sheet-card {
            box-shadow: none !important; border-radius: 0 !important;
            margin: 0 !important; max-width: 100% !important;
          }
          .rx-print-sheet, .rx-sheet-card, .rx-sheet-card * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="no-print flex items-center justify-end gap-2 px-4 py-3 bg-slate-100 border-b border-slate-200 sticky top-0 z-10">
        <button onClick={() => window.print()}
          className="text-xs font-semibold px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">Print / Save PDF</button>
        <button onClick={onClose}
          className="text-xs font-semibold px-4 py-2 rounded-lg bg-slate-300 text-slate-800 hover:bg-slate-400">Close</button>
      </div>

      <div className="rx-sheet-card bg-white w-full max-w-[800px] mx-auto my-4 shadow-xl rounded-lg overflow-hidden">
        <div className="px-10 py-8 text-slate-900" style={{ fontFamily: 'Georgia, serif' }}>
          {/* Composed letterhead */}
          <div className="flex items-start gap-4 border-b-2 border-slate-800 pb-4 mb-6">
            {logo && <img src={logo} alt="" className="h-16 w-16 object-contain rounded" />}
            <div className="flex-1">
              <h1 className="text-2xl font-bold leading-tight">{clinicName}</h1>
              {headline && <p className="text-xs text-slate-500 mt-0.5">{headline}</p>}
              {doctor?.name && <p className="text-sm font-semibold mt-1">Dr. {doctor.name}</p>}
              {contactLine && <p className="text-[11px] text-slate-600 mt-1 whitespace-pre-line">{contactLine}</p>}
            </div>
            <div className="text-right text-[11px] text-slate-500">
              <p className="font-bold uppercase tracking-wider">Prescription</p>
              <p className="mt-1">{date}</p>
            </div>
          </div>

          <div className="text-xs mb-4"><span className="font-semibold">Patient:</span> {patient?.name ?? '—'}{patient?.phone ? ` (${patient.phone})` : ''}</div>

          {prescription.notes && (
            <p className="text-xs italic text-slate-600 mb-4">Notes: {prescription.notes}</p>
          )}

          <table className="w-full table-fixed text-xs border-collapse mb-10">
            <thead>
              <tr className="border-b border-slate-400 text-left">
                <th className="py-2 w-6">#</th>
                <th className="w-1/4">Medication</th>
                <th>Dosage</th>
                <th>Frequency</th>
                <th>Duration</th>
                <th>Instructions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={6} className="py-3 text-center text-slate-400">No items</td></tr>
              )}
              {items.map((it: PrescriptionItem, i: number) => (
                <tr key={it.id} className="border-b border-slate-200 align-top">
                  <td className="py-1.5">{i + 1}</td>
                  <td className="py-1.5 font-semibold break-words">{itemName(it)}</td>
                  <td className="break-words">{it.dosage ?? '—'}</td>
                  <td className="break-words">{it.frequency ?? '—'}</td>
                  <td className="break-words">{it.duration ?? '—'}</td>
                  <td className="break-words">{it.instructions ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-end mt-12 text-xs">
            <div>
              <div className="border-t border-slate-400 w-44 pt-1">Signature</div>
              <p className="mt-1 text-slate-500">{doctor?.name ?? ''}</p>
            </div>
            <div className="text-right text-slate-400">Rx ID: {prescription.id.slice(0, 8)}</div>
          </div>

          {contactLine && (
            <p className="text-[10px] text-slate-400 text-center mt-10 border-t border-slate-100 pt-3 whitespace-pre-line">{contactLine}</p>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
}
