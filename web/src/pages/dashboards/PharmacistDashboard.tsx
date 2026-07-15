import { statsByRole } from '../../lib/constants';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { AlertTriangle, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../lib/useApiQuery';
import { inventoryApi } from '../../lib/inventory';
import { prescriptionApi } from '../../lib/prescriptions';

export default function PharmacistDashboard() {
  const { clinic } = useAuth();

  // Fetch real inventory list
  const { data: inventoryData } = useApiQuery(
    () => inventoryApi.list({ clinicId: clinic?.id, limit: 100 }),
    { skip: !clinic?.id }
  );

  // Fetch awaiting prescriptions
  const { data: prescriptionsData } = useApiQuery(
    () => prescriptionApi.list({ clinicId: clinic?.id, limit: 100 }),
    { skip: !clinic?.id }
  );

  const displayInventory = (inventoryData?.data || []).map((item) => {
    const qty = item.quantity;
    const thresh = item.reorderThreshold || 0;
    let status: 'Good' | 'LOW STOCK' | 'EXPIRING SOON' = 'Good';
    if (qty <= thresh) {
      status = 'LOW STOCK';
    } else if (item.expiryDate) {
      const exp = new Date(item.expiryDate);
      const diff = exp.getTime() - Date.now();
      if (diff > 0 && diff < 30 * 24 * 60 * 60 * 1000) {
        status = 'EXPIRING SOON';
      }
    }
    return {
      id: item.id,
      name: item.customName || 'Medicine',
      form: item.dosageForm || 'Tablet',
      currentQty: qty,
      reorderPoint: thresh,
      expiry: item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '–',
      status,
    };
  });

  const displayPrescriptions = (prescriptionsData?.data || [])
    .filter((rx) => rx.status === 'ACTIVE')
    .map((rx) => ({
      id: rx.id,
      patient: rx.patient?.name || 'Unknown Patient',
      doctor: rx.doctor?.name || 'Doctor',
      date: new Date(rx.createdAt).toLocaleDateString(),
      itemCount: (rx.items || []).length,
    }));

  // Calculate dynamic stats
  const lowStockCount = displayInventory.filter(i => i.status === 'LOW STOCK').length;
  const expiringCount = displayInventory.filter(i => i.status === 'EXPIRING SOON').length;

  const displayStats = statsByRole.PHARMACIST.map((s) => {
    if (s.id === 'stat-1') {
      return { ...s, value: String(displayInventory.length), trend: undefined };
    }
    if (s.id === 'stat-2') {
      return { ...s, value: `${lowStockCount} Items`, subtitle: lowStockCount > 0 ? 'Action required' : 'Inventory normal' };
    }
    if (s.id === 'stat-3') {
      return { ...s, value: `${expiringCount} Items`, subtitle: 'within 30 days' };
    }
    if (s.id === 'stat-4') {
      return { ...s, value: '0' };
    }
    return s;
  });

  // Calculate dynamic alerts/notifications
  const displayNotifications = [
    ...displayInventory
      .filter(i => i.status === 'LOW STOCK')
      .map(i => ({ id: `low-${i.id}`, text: `Low Stock: ${i.name} (${i.currentQty}/${i.reorderPoint} point)`, type: 'danger' as const })),
    ...displayInventory
      .filter(i => i.status === 'EXPIRING SOON')
      .map(i => ({ id: `exp-${i.id}`, text: `Expiring Soon: ${i.name} (expiring on ${i.expiry})`, type: 'warning' as const }))
  ];

  const displayDeliveries: any[] = [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Pharmacy Inventory Dashboard</h1>
        <p className="text-xs text-text-muted mt-0.5">
          Current date: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger-children">
        {displayStats.map((stat, i) => (
          <StatCard key={stat.id} data={stat} index={i} />
        ))}
      </div>

      {/* Stock Levels + Notifications */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
        {/* Current Stock Levels */}
        <div className="bg-surface-card rounded-xl border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
            <h3 className="text-sm font-semibold text-text-primary">Current Stock Levels</h3>
            <div className="flex gap-2">
              <button className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-primary-600 px-3 py-1.5 rounded-lg border border-border hover:border-primary-300 transition-colors cursor-pointer">
                <Filter className="w-3 h-3" /> Filters
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Item Name
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Form</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Current Qty
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Reorder Point
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Expiry</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-text-secondary uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {displayInventory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-xs text-text-muted italic">
                      No stock items registered in this clinic.
                    </td>
                  </tr>
                ) : (
                  displayInventory.map((item) => {
                    const statusConfig = {
                      'Good': { variant: 'success' as const },
                      'LOW STOCK': { variant: 'danger' as const },
                      'EXPIRING SOON': { variant: 'warning' as const },
                    }[item.status];

                    return (
                      <tr key={item.id} className="hover:bg-surface/50 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-text-primary">{item.name}</td>
                        <td className="px-5 py-3.5 text-text-secondary">{item.form}</td>
                        <td className="px-5 py-3.5 text-text-primary font-medium">{item.currentQty.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-text-secondary">{item.reorderPoint}</td>
                        <td className="px-5 py-3.5 text-text-secondary">{item.expiry}</td>
                        <td className="px-5 py-3.5">
                          <Badge variant={statusConfig?.variant || 'neutral'}>{item.status}</Badge>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {item.status !== 'Good' && (
                            <AlertTriangle className="w-4 h-4 text-warning inline-block" />
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notifications & Action Items */}
        <div className="bg-surface-card rounded-xl border border-border p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-sm font-semibold text-text-primary mb-4">Notifications & Action Items</h3>
          <div className="space-y-3">
            {displayNotifications.length === 0 ? (
              <p className="text-xs text-text-muted italic py-4 text-center">No alerts or notifications</p>
            ) : (
              displayNotifications.map((notif) => {
                const borderColor = {
                  danger: 'border-l-danger bg-red-50/50',
                  warning: 'border-l-warning bg-amber-50/50',
                  info: 'border-l-info bg-blue-50/50',
                }[notif.type];

                return (
                  <div key={notif.id} className={`p-3 rounded-lg border-l-3 ${borderColor} border border-border-light`}>
                    <p className="text-xs text-text-primary leading-relaxed">{notif.text}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Prescriptions Awaiting + Recent Deliveries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Prescriptions Awaiting Dispensing */}
        <div className="bg-surface-card rounded-xl border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-4 border-b border-border-light">
            <h3 className="text-sm font-semibold text-text-primary">Prescriptions Awaiting Dispensing</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Patient & Prescriber</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Date & Items Count</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {displayPrescriptions.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-xs text-text-muted italic">
                      No prescriptions awaiting dispensing
                    </td>
                  </tr>
                ) : (
                  displayPrescriptions.map((rx) => (
                    <tr key={rx.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-5 py-3.5 text-text-primary">{rx.patient} – {rx.doctor}</td>
                      <td className="px-5 py-3.5 text-text-secondary">{rx.date} – {rx.itemCount} Items</td>
                      <td className="px-5 py-3.5">
                        <button className="text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-1.5 rounded-md transition-colors cursor-pointer">
                          Dispense
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Incoming Stock Deliveries */}
        <div className="bg-surface-card rounded-xl border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-4 border-b border-border-light">
            <h3 className="text-sm font-semibold text-text-primary">Recent Incoming Stock Deliveries</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Order ID</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {displayDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-xs text-text-muted italic">
                      No recent incoming deliveries
                    </td>
                  </tr>
                ) : (
                  displayDeliveries.map((del) => {
                    const statusVariant = ({
                      Received: 'success' as const,
                      Partial: 'warning' as const,
                      Pending: 'neutral' as const,
                    } as Record<string, 'success' | 'warning' | 'neutral'>)[del.status as string] || 'neutral';

                    return (
                      <tr key={del.id} className="hover:bg-surface/50 transition-colors">
                        <td className="px-5 py-3.5 text-text-primary font-medium">{del.orderId} – {del.supplier}</td>
                        <td className="px-5 py-3.5 text-text-secondary">{del.date}</td>
                        <td className="px-5 py-3.5">
                          <Badge variant={statusVariant}>{del.status}</Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
