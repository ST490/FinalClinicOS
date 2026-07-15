import React, { useState, useMemo } from 'react';
import { Package, AlertTriangle, Plus, Search, ArrowUpRight, ArrowDownLeft, Info } from 'lucide-react';
import Badge from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { inventoryApi, CLINICAL_CATEGORIES, type InventoryClinicalCategory, type InventoryItem } from '../lib/inventory';
import { useApiQuery, apiMutate } from '../lib/useApiQuery';

interface InvRow {
  id: string;
  name: string;
  form: string;
  currentQty: number;
  reorderPoint: number;
  expiry: string;
  status: 'Good' | 'LOW STOCK' | 'EXPIRING SOON';
  ingredients?: string;
  buyPrice?: number | string | null;
  sellPrice?: number | string | null;
  margin?: number | null;
  clinicalCategory: InventoryClinicalCategory;
  trackingType: InventoryItem['trackingType'];
  regulatoryClass: InventoryItem['regulatoryClass'];
}

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
  const { clinic: authClinic } = useAuth();
  const [activeTab, setActiveTab] = useState<'levels' | 'history'>('levels');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<InventoryClinicalCategory | 'ALL'>('ALL');
  const [refetchKey, setRefetchKey] = useState(0);

  // Fetch from API (pharmacists are auto-scoped to PHARMA by the backend)
  const { data: apiData } = useApiQuery(
    () => inventoryApi.list({
      clinicId: authClinic?.id,
      limit: 100,
      clinicalCategory: categoryFilter === 'ALL' ? undefined : categoryFilter,
    }),
    { skip: !authClinic?.id, deps: [refetchKey, authClinic?.id, categoryFilter] },
  );

  // Map API data to the table row shape
  const inventoryItems: InvRow[] = useMemo(() => {
    if (!apiData?.data) return [];
    return apiData.data.map((item) => ({
      id: item.id,
      name: item.customName || item.medicine?.genericName || 'Item',
      form: item.dosageForm || 'Tablets',
      currentQty: item.quantity,
      reorderPoint: item.reorderThreshold,
      expiry: item.expiryDate || 'N/A',
      status: item.quantity <= 0 ? 'LOW STOCK'
        : item.quantity <= item.reorderThreshold ? 'LOW STOCK'
          : 'Good',
      ingredients: item.ingredients || item.medicine?.composition || undefined,
      buyPrice: item.unitPrice,
      sellPrice: item.sellingPrice ?? null,
      margin: item.margin ?? null,
      clinicalCategory: item.clinicalCategory,
      trackingType: item.trackingType,
      regulatoryClass: item.regulatoryClass,
    }));
  }, [apiData]);

  // Local state wrapper for compatibility with existing UI code
  const [inventory, setInventory] = useState<InvRow[]>([]);
  // Sync API data into local state whenever it changes
  React.useEffect(() => {
    setInventory(inventoryItems);
  }, [inventoryItems]);

  // Local state for stock movements
  const movements: StockMovement[] = [];

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form Fields
  const [drugName, setDrugName] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [formType, setFormType] = useState('Tablets');
  const [qty, setQty] = useState('');
  const [reorder, setReorder] = useState('200');
  const [expiry, setExpiry] = useState('');
  // Classification
  const [clinicalCategory, setClinicalCategory] = useState<InventoryClinicalCategory>('PHARMA');
  const [trackingType, setTrackingType] = useState<InventoryItem['trackingType']>('BULK');
  const [regulatoryClass, setRegulatoryClass] = useState<InventoryItem['regulatoryClass']>('STANDARD');
  const [costType, setCostType] = useState<InventoryItem['costType']>('OVERHEAD');
  const [stockingLevel, setStockingLevel] = useState<InventoryItem['stockingLevel']>('CENTRAL');
  const [sellingPrice, setSellingPrice] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [consignmentOwner, setConsignmentOwner] = useState('');

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
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!drugName || !qty || !expiry) {
      setError('Please fill in all required fields.');
      return;
    }

    const currentQty = parseInt(qty, 10);
    const reorderPoint = parseInt(reorder, 10);
    const buy = parseFloat(buyPrice) || 0;

    if (isNaN(currentQty) || isNaN(reorderPoint)) {
      setError('Quantity and Reorder Point must be valid numbers.');
      return;
    }

    if (!authClinic?.id) {
      setError('No active clinic — sign in to a clinic to add items.');
      return;
    }
    const { data, error: apiErr } = await apiMutate(() =>
      inventoryApi.create({
        clinicId: authClinic.id,
        customName: drugName,
        dosageForm: formType,
        quantity: currentQty,
        reorderThreshold: reorderPoint,
        unitPrice: buy,
        sellingPrice: sellingPrice ? parseFloat(sellingPrice) : undefined,
        expiryDate: new Date(expiry).toISOString(),
        ingredients: ingredients || undefined,
        clinicalCategory,
        trackingType,
        regulatoryClass,
        costType,
        stockingLevel,
        serialNo: serialNo || undefined,
        consignmentOwner: consignmentOwner || undefined,
      }),
    );
    if (apiErr) {
      setError(apiErr);
      return;
    }
    if (data) {
      setRefetchKey(k => k + 1);
      setDrugName('');
      setIngredients('');
      setQty('');
      setExpiry('');
      setBuyPrice('');
      setSellingPrice('');
      setSerialNo('');
      setConsignmentOwner('');
      setClinicalCategory('PHARMA');
      setTrackingType('BULK');
      setRegulatoryClass('STANDARD');
      setCostType('OVERHEAD');
      setStockingLevel('CENTRAL');
      setIsAddModalOpen(false);
    }
  };

  // Filter levels table based on search
  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.form.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.ingredients && item.ingredients.toLowerCase().includes(searchQuery.toLowerCase()))
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
            className={`pb-2 px-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${activeTab === 'levels'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
          >
            Current Stock Levels
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2 px-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${activeTab === 'history'
                ? 'border-transparent text-text-secondary hover:text-text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
              } ${activeTab === 'history' ? '!border-primary-600 !text-primary-700' : ''
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

      {/* Clinical category filter bar */}
      {activeTab === 'levels' && (
        <div className="flex flex-wrap gap-1.5">
          {(['ALL', ...CLINICAL_CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-surface-card text-text-secondary border-border hover:border-primary-400'
              }`}
            >
              {cat === 'ALL' ? 'All' : cat}
            </button>
          ))}
        </div>
      )}

      {/* Content Area */}
      {activeTab === 'levels' ? (
        /* Stock Levels Table View */
        <div className="bg-surface-card rounded-xl border border-border overflow-hidden shadow-sm" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface/50 border-b border-border">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Item Name</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Category</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Form</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Current Qty</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Reorder Level</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Buy</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Sell</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Margin</th>
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
                        className={`hover:bg-surface/50 transition-colors ${isLow ? 'bg-danger/[0.02]' : isExpiring ? 'bg-warning/[0.02]' : ''
                          }`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-text-primary">{item.name}</div>
                          {item.ingredients && (
                            <div className="text-[11px] text-text-muted mt-0.5 italic">{item.ingredients}</div>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {item.clinicalCategory}
                            {item.regulatoryClass === 'CONTROLLED' && (
                              <span className="text-danger" title="Controlled substance">●</span>
                            )}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-text-secondary">{item.form}</td>
                        <td className="px-5 py-3.5 font-bold text-text-primary text-right">{item.currentQty.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-text-muted text-right">{item.reorderPoint}</td>
                        <td className="px-5 py-3.5 text-text-secondary text-right tabular-nums">{item.buyPrice != null ? Number(item.buyPrice).toFixed(2) : '—'}</td>
                        <td className="px-5 py-3.5 text-text-secondary text-right tabular-nums">{item.sellPrice != null ? Number(item.sellPrice).toFixed(2) : '—'}</td>
                        <td className={`px-5 py-3.5 text-right tabular-nums font-semibold ${item.margin != null && item.margin >= 0 ? 'text-success' : 'text-text-muted'}`}>
                          {item.margin != null ? Number(item.margin).toFixed(2) : '—'}
                        </td>
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
                    <td colSpan={11} className="px-5 py-12 text-center text-text-secondary">
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
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${move.type === 'RESTOCK' ? 'bg-primary-50 text-primary-700' :
                            move.type === 'DISPENSED' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                          {move.type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`flex items-center gap-1 font-bold text-xs ${isPositive ? 'text-success' : 'text-danger'
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

              {/* Active Ingredients / Composition */}
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">Active Ingredients / Composition</label>
                <input
                  type="text"
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  placeholder="e.g. Paracetamol 500mg, Caffeine 30mg"
                  className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all border-slate-200"
                />
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

              {/* Pricing: buy (cost) & sell */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">Buy Price (cost) *</label>
                  <input
                    type="number"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">Sell Price</label>
                  <input
                    type="number"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all border-slate-200"
                  />
                </div>
              </div>

              {/* Classification */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">Clinical Category</label>
                  <select
                    value={clinicalCategory}
                    onChange={(e) => setClinicalCategory(e.target.value as InventoryClinicalCategory)}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all border-slate-200"
                  >
                    {CLINICAL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">Tracking Type</label>
                  <select
                    value={trackingType}
                    onChange={(e) => setTrackingType(e.target.value as InventoryItem['trackingType'])}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all border-slate-200"
                  >
                    <option value="BULK">Bulk / consumable</option>
                    <option value="LOT_BATCH">Lot / batch (expiry)</option>
                    <option value="SERIAL">Serial / unit-unique</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">Regulatory Class</label>
                  <select
                    value={regulatoryClass}
                    onChange={(e) => setRegulatoryClass(e.target.value as InventoryItem['regulatoryClass'])}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all border-slate-200"
                  >
                    <option value="STANDARD">Standard</option>
                    <option value="CONTROLLED">Controlled (dual sign-off)</option>
                    <option value="COLD_CHAIN">Cold chain</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">Cost Type</label>
                  <select
                    value={costType}
                    onChange={(e) => setCostType(e.target.value as InventoryItem['costType'])}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all border-slate-200"
                  >
                    <option value="OVERHEAD">Overhead</option>
                    <option value="CHARGEABLE">Chargeable (billable)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">Stocking Level</label>
                  <select
                    value={stockingLevel}
                    onChange={(e) => setStockingLevel(e.target.value as InventoryItem['stockingLevel'])}
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all border-slate-200"
                  >
                    <option value="CENTRAL">Central store</option>
                    <option value="DEPARTMENT">Department / unit</option>
                    <option value="CONSIGNMENT">Consignment</option>
                  </select>
                </div>
                {trackingType === 'SERIAL' && (
                  <div>
                    <label className="text-xs font-semibold text-text-secondary block mb-1">Serial No</label>
                    <input
                      type="text"
                      value={serialNo}
                      onChange={(e) => setSerialNo(e.target.value)}
                      placeholder="e.g. IMPL-0001"
                      className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all border-slate-200"
                    />
                  </div>
                )}
                {stockingLevel === 'CONSIGNMENT' && (
                  <div>
                    <label className="text-xs font-semibold text-text-secondary block mb-1">Consignment Owner</label>
                    <input
                      type="text"
                      value={consignmentOwner}
                      onChange={(e) => setConsignmentOwner(e.target.value)}
                      placeholder="Vendor name"
                      className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-surface-card text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none transition-all border-slate-200"
                    />
                  </div>
                )}
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
