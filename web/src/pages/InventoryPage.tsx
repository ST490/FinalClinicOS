import React, { useState } from 'react';
import { Package, AlertTriangle, Plus, Search, ArrowUpRight, ArrowDownLeft, Info } from 'lucide-react';
import { stockItems } from '../mockData';
import type { StockItem } from '../types';
import Badge from '../components/ui/Badge';

// Predefined drug list for autocomplete suggestions
const DRUG_SUGGESTIONS = [
  'Amoxicillin 500mg Tabs',
  'Paracetamol 650mg Tabs',
  'Omeprazole 20mg Caps',
  'Metformin 500mg Tabs',
  'Azithromycin 250mg Tabs',
  'Ibuprofen 400mg Tabs',
  'Lisinopril 10mg Tabs',
  'Atorvastatin 20mg Tabs',
  'Ciprofloxacin 500mg Caps',
];

interface StockMovement {
  id: string;
  date: string;
  itemName: string;
  type: 'RESTOCK' | 'DISPENSED' | 'CORRECTION';
  delta: number;
  operator: string;
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'levels' | 'history'>('levels');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local state for inventory levels
  const [inventory, setInventory] = useState<StockItem[]>(() => {
    return stockItems.map((item, idx) => ({
      ...item,
      id: item.id || `inv-${idx}`,
    }));
  });

  // Local state for stock movements
  const [movements, setMovements] = useState<StockMovement[]>([
    { id: 'm-1', date: '2026-07-04 10:15 AM', itemName: 'Atorvastatin 20mg Tabs (Capsules)', type: 'DISPENSED', delta: -20, operator: 'Dr. Evelyn Reed' },
    { id: 'm-2', date: '2026-07-04 09:30 AM', itemName: 'Atorvastatin 20mg Tabs (Tablets)', type: 'RESTOCK', delta: 500, operator: 'Dr. Evelyn Reed' },
    { id: 'm-3', date: '2026-07-03 02:45 PM', itemName: 'Atorvastatin 20mg Tabs (Syrup)', type: 'CORRECTION', delta: -5, operator: 'Nurse Sarah L.' },
    { id: 'm-4', date: '2026-07-02 11:20 AM', itemName: 'Ibuprofen 400mg Tabs (Tablets)', type: 'DISPENSED', delta: -50, operator: 'Dr. Eleanor Vance' },
  ]);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Form Fields
  const [drugName, setDrugName] = useState('');
  const [formType, setFormType] = useState('Tablets');
  const [qty, setQty] = useState('');
  const [reorder, setReorder] = useState('200');
  const [expiry, setExpiry] = useState('');
  
  // Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [error, setError] = useState('');

  // Handle autocomplete input changes
  const handleDrugNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDrugName(value);
    
    if (value) {
      const filtered = DRUG_SUGGESTIONS.filter(item =>
        item.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (val: string) => {
    setDrugName(val);
    setShowSuggestions(false);
  };

  // Add Item to Inventory List
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!drugName || !qty || !expiry) {
      setError('Please fill in all required fields.');
      return;
    }

    const currentQty = parseInt(qty);
    const reorderPoint = parseInt(reorder);

    if (isNaN(currentQty) || isNaN(reorderPoint)) {
      setError('Quantity and Reorder Point must be valid numbers.');
      return;
    }

    // Determine status badge
    let status: StockItem['status'] = 'Good';
    if (currentQty <= reorderPoint) {
      status = 'LOW STOCK';
    }

    const newId = `inv-${Date.now()}`;
    const newItem: StockItem = {
      id: newId,
      name: drugName,
      form: formType,
      currentQty,
      reorderPoint,
      expiry,
      status,
    };

    // Add to levels
    setInventory(prev => [newItem, ...prev]);

    // Log movement history
    const newMovement: StockMovement = {
      id: `m-${Date.now()}`,
      date: new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, month: '2-digit', day: '2-digit', year: 'numeric' }),
      itemName: `${drugName} (${formType})`,
      type: 'RESTOCK',
      delta: currentQty,
      operator: 'Dr. Evelyn Reed',
    };
    setMovements(prev => [newMovement, ...prev]);

    // Reset fields
    setDrugName('');
    setQty('');
    setExpiry('');
    setIsAddModalOpen(false);
  };

  // Filter levels table based on search
  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.form.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute alert metrics
  const lowStockCount = inventory.filter(item => item.status === 'LOW STOCK').length;
  const expiringCount = inventory.filter(item => item.status === 'EXPIRING SOON').length;

  return (
    <div className="space-y-5 animate-fade-in font-sans pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Package className="w-5 h-5 text-primary-600" />
            Clinic Inventory System
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Monitor clinic stock levels, expiry warnings, and medication movement transactions.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-4 py-2.5 rounded-lg transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Stock Item
        </button>
      </div>

      {/* Top Banner: Expiry/Low Stock Alert Banners */}
      {(lowStockCount > 0 || expiringCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lowStockCount > 0 && (
            <div className="flex items-start gap-3 p-4 bg-danger/10 border border-danger/25 rounded-xl text-danger animate-fade-in">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">Low Stock Warnings</h4>
                <p className="text-sm mt-0.5 font-medium leading-relaxed">
                  Alert: {lowStockCount} items require urgent restock. Inventory levels have fallen below the set reorder points.
                </p>
              </div>
            </div>
          )}

          {expiringCount > 0 && (
            <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/20 rounded-xl text-warning animate-fade-in">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">Expiry Warnings</h4>
                <p className="text-sm mt-0.5 font-medium leading-relaxed">
                  Notice: {expiringCount} medication items are expiring within 30 days. Please prioritize dispensing.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs Selector & Search Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-light pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('levels')}
            className={`pb-2 px-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'levels'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            Current Stock Levels
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2 px-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'border-transparent text-text-secondary hover:text-text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            } ${
              activeTab === 'history' ? '!border-primary-600 !text-primary-700' : ''
            }`}
          >
            Stock Movement History
          </button>
        </div>

        {activeTab === 'levels' && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search stock list..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs border border-border rounded-lg pl-9 pr-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all border-slate-200"
            />
          </div>
        )}
      </div>

      {/* Content Area */}
      {activeTab === 'levels' ? (
        /* Stock Levels Table View */
        <div className="bg-surface-card rounded-xl border border-border overflow-hidden shadow-sm" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface/50 border-b border-border">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Item Name</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Form</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Current Qty</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Reorder Level</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Expiry Date</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold text-text-secondary">Alert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {filteredInventory.length > 0 ? (
                  filteredInventory.map((item) => {
                    const isLow = item.currentQty <= item.reorderPoint;
                    const isExpiring = item.status === 'EXPIRING SOON';
                    
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-surface/50 transition-colors ${
                          isLow ? 'bg-danger/[0.02]' : isExpiring ? 'bg-warning/[0.02]' : ''
                        }`}
                      >
                        <td className="px-5 py-3.5 font-semibold text-text-primary">{item.name}</td>
                        <td className="px-5 py-3.5 text-text-secondary">{item.form}</td>
                        <td className="px-5 py-3.5 font-bold text-text-primary">{item.currentQty.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-text-muted">{item.reorderPoint}</td>
                        <td className="px-5 py-3.5 text-text-secondary whitespace-nowrap">{item.expiry}</td>
                        <td className="px-5 py-3.5">
                          <Badge variant={
                            item.status === 'Good' ? 'success' :
                            item.status === 'LOW STOCK' ? 'danger' : 'warning'
                          }>
                            {item.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-danger font-semibold bg-danger/10 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" /> Restock
                            </span>
                          ) : isExpiring ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-warning font-semibold bg-warning/10 px-2 py-0.5 rounded-full">
                              <Info className="w-3 h-3" /> Expiring
                            </span>
                          ) : (
                            <span className="text-text-muted text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-text-secondary">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Package className="w-8 h-8 text-text-muted" />
                        <p className="font-semibold text-sm">No stock items match your search</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Stock Movement History View */
        <div className="bg-surface-card rounded-xl border border-border overflow-hidden shadow-sm" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface/50 border-b border-border">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Date & Time</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Medication Item</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Action Type</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Adjustment Delta</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {movements.map((move) => {
                  const isPositive = move.delta > 0;
                  return (
                    <tr key={move.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-5 py-3.5 text-text-secondary whitespace-nowrap">{move.date}</td>
                      <td className="px-5 py-3.5 font-semibold text-text-primary">{move.itemName}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          move.type === 'RESTOCK' ? 'bg-primary-50 text-primary-700' :
                          move.type === 'DISPENSED' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {move.type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`flex items-center gap-1 font-bold text-xs ${
                          isPositive ? 'text-success' : 'text-danger'
                        }`}>
                          {isPositive ? (
                            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <ArrowDownLeft className="w-3.5 h-3.5 shrink-0" />
                          )}
                          {isPositive ? `+${move.delta}` : move.delta}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-text-primary">{move.operator}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Stock Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card rounded-xl border border-border max-w-md w-full p-6 animate-scale-in space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border-light">
              <h3 className="text-base font-bold text-text-primary">Add New Stock Entry</h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setError('');
                }}
                className="text-text-secondary hover:text-text-primary text-sm font-semibold p-1 hover:bg-surface rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-danger/10 border border-danger/20 text-danger text-xs rounded-lg flex items-center gap-1.5 animate-fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAddItem} className="space-y-3.5">
              {/* Drug Name Autocomplete */}
              <div className="relative">
                <label className="text-xs font-semibold text-text-secondary block mb-1">Medication Name *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    value={drugName}
                    onChange={handleDrugNameChange}
                    onFocus={() => {
                      if (drugName) setShowSuggestions(true);
                    }}
                    placeholder="Type drug name (e.g. Amoxicillin)"
                    className="w-full text-sm border border-border rounded-lg pl-9 pr-3 py-2 bg-surface-card text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all border-slate-200"
                    autoComplete="off"
                  />
                </div>

                {/* Autocomplete suggestions dropdown */}
                {showSuggestions && (filteredSuggestions.length > 0 || drugName) && (
                  <div className="absolute left-0 right-0 mt-1 bg-surface-card rounded-lg border border-border shadow-lg max-h-48 overflow-y-auto z-50 py-1.5 animate-scale-in">
                    {filteredSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => selectSuggestion(suggestion)}
                        className="w-full text-left text-xs px-3.5 py-2 hover:bg-surface text-text-primary transition-colors cursor-pointer"
                      >
                        {suggestion}
                      </button>
                    ))}
                    {drugName && (
                      <button
                        type="button"
                        onClick={() => selectSuggestion(drugName)}
                        className="w-full text-left text-xs px-3.5 py-2 hover:bg-surface text-primary-600 font-semibold border-t border-border-light transition-colors cursor-pointer"
                      >
                        + Add Custom "{drugName}"
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Form Type & Expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">Form Factor</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all border-slate-200"
                  >
                    <option value="Tablets">Tablets</option>
                    <option value="Capsules">Capsules</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Ointment">Ointment</option>
                    <option value="Injection">Injection</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all border-slate-200"
                  />
                </div>
              </div>

              {/* Quantity & Reorder Level */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    placeholder="e.g. 500"
                    min="1"
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">Reorder Point</label>
                  <input
                    type="number"
                    value={reorder}
                    onChange={(e) => setReorder(e.target.value)}
                    placeholder="e.g. 200"
                    min="0"
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all border-slate-200"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 text-xs font-semibold text-text-primary bg-surface hover:bg-slate-200 py-2.5 rounded-lg border border-border transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  Save Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
