/**
 * AMAPA — Aplicación principal
 * Sistema de Alertas y Gestión de Brigadieres - FEN Piura
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getAlerts, getBrigadiers, getAlert } from './services/api';
import { useSocket } from './hooks/useSocket';
import { MapView } from './components/MapView';
import { AlertCard } from './components/AlertCard';
import { CreateAlertModal } from './components/CreateAlertModal';
import { RiskBadge } from './components/RiskBadge';

export default function App() {
  const [alerts, setAlerts] = useState([]);
  const [brigadiers, setBrigadiers] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [selectedBrigadierId, setSelectedBrigadierId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'all' | 'brigadiers'
  const [toast, setToast] = useState(null);

  // Cargar datos. Solo se aplica la respuesta más reciente: si cambias de pestaña
  // mientras otra petición sigue en curso, esa respuesta vieja se descarta.
  const alertsRequestRef = useRef(0);
  const loadAlerts = useCallback(async () => {
    const requestId = ++alertsRequestRef.current;
    try {
      const data = await getAlerts(activeTab === 'active');
      if (requestId !== alertsRequestRef.current) return;
      setAlerts(data);
    } catch (err) {
      console.error('Error cargando alertas:', err);
    }
  }, [activeTab]);

  const loadBrigadiers = useCallback(async () => {
    try {
      const data = await getBrigadiers();
      setBrigadiers(data);
    } catch (err) {
      console.error('Error cargando brigadieres:', err);
    }
  }, []);

  const refresh = useCallback(() => {
    loadAlerts();
    loadBrigadiers();
  }, [loadAlerts, loadBrigadiers]);

  useEffect(() => { refresh(); }, [refresh]);

  // WebSocket — actualización en tiempo real
  const handleSocketEvent = useCallback((event, data) => {
    const msgs = {
      'alert:created':   `🚨 Nueva alerta: ${data?.title || ''}`,
      'alert:resolved':  `✅ Alerta resuelta`,
      'alert:full':      `🔒 Alerta completa — cupo llenado`,
      'assignment:created': `👤 Brigadier asignado: ${data?.assignment?.brigadier_name || ''}`,
    };
    if (msgs[event]) {
      setToast(msgs[event]);
      setTimeout(() => setToast(null), 4000);
    }
    refresh();
  }, [refresh]);

  const { connected, mode } = useSocket(handleSocketEvent);

  // Estadísticas rápidas
  const stats = {
    red:    alerts.filter(a => a.risk_level === 'red'    && a.status !== 'resolved').length,
    orange: alerts.filter(a => a.risk_level === 'orange' && a.status !== 'resolved').length,
    yellow: alerts.filter(a => a.risk_level === 'yellow' && a.status !== 'resolved').length,
    available: brigadiers.filter(b => b.status === 'available').length,
    assigned:  brigadiers.filter(b => b.status === 'assigned').length,
  };

  const displayedAlerts = activeTab === 'all'
    ? alerts
    : alerts.filter(a => a.status !== 'resolved');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '10px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '700', letterSpacing: '-0.3px' }}>
                🗺️ AMAPA <span style={{ color: '#60a5fa' }}>FEN Piura</span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Sistema de Alertas y Gestión de Brigadieres</div>
            </div>
          </div>

          {/* Stats rápidas */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {stats.red > 0    && <StatPill color="#ef4444" label={`🔴 ${stats.red} Rojo`} />}
            {stats.orange > 0 && <StatPill color="#f97316" label={`🟠 ${stats.orange} Naranja`} />}
            {stats.yellow > 0 && <StatPill color="#eab308" label={`🟡 ${stats.yellow} Amarillo`} />}
            <StatPill color="#22c55e" label={`🟢 ${stats.available} disponibles`} />
            <StatPill color="#f97316" label={`🟠 ${stats.assigned} asignados`} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: connected ? '#22c55e' : '#ef4444' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: connected ? '#22c55e' : '#ef4444' }} />
              {!connected ? 'Desconectado' : mode === 'polling' ? 'En línea (refresco cada 10 s)' : 'En línea'}
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}
          >
            + Nueva Alerta
          </button>
        </div>
      </header>

      {/* ── Cuerpo principal ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Panel lateral izquierdo */}
        <aside style={{ width: '360px', flexShrink: 0, background: '#0f172a', display: 'flex', flexDirection: 'column', borderRight: '1px solid #334155', overflow: 'hidden' }}>

          {/* Selector de brigadier */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #334155', background: '#1e293b' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Mi brigadier (para auto-asignación)</label>
            <select
              value={selectedBrigadierId}
              onChange={e => setSelectedBrigadierId(e.target.value)}
              style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', borderRadius: '4px', padding: '6px 8px', fontSize: '13px' }}
            >
              <option value="">— Seleccionar —</option>
              {brigadiers.map(b => (
                <option key={b.id} value={b.id} disabled={b.status !== 'available'}>
                  {b.name} {b.status !== 'available' ? `(${b.status})` : '✓'}
                </option>
              ))}
            </select>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #334155' }}>
            {[
              { key: 'active', label: 'Activas' },
              { key: 'all',    label: 'Todas' },
              { key: 'brigadiers', label: 'Brigadieres' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer', fontSize: '12px',
                  background: activeTab === tab.key ? '#1e293b' : 'transparent',
                  color: activeTab === tab.key ? '#60a5fa' : '#64748b',
                  borderBottom: activeTab === tab.key ? '2px solid #3b82f6' : '2px solid transparent',
                  fontWeight: activeTab === tab.key ? '600' : '400',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Lista de alertas / brigadieres */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
            {activeTab !== 'brigadiers' ? (
              displayedAlerts.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#475569', fontSize: '13px', marginTop: '40px' }}>
                  No hay alertas {activeTab === 'active' ? 'activas' : ''}
                </div>
              ) : (
                displayedAlerts.map(alert => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    brigadierId={selectedBrigadierId ? Number(selectedBrigadierId) : null}
                    onRefresh={refresh}
                  />
                ))
              )
            ) : (
              /* Lista de brigadieres */
              brigadiers.map(b => (
                <div key={b.id} style={{
                  background: '#1e293b', border: '1px solid #334155', borderRadius: '6px',
                  padding: '10px', marginBottom: '6px',
                  borderLeft: `3px solid ${b.status === 'assigned' ? '#f97316' : b.status === 'available' ? '#22c55e' : '#64748b'}`,
                }}>
                  <div style={{ fontWeight: '600', fontSize: '13px' }}>{b.name}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                    📞 {b.phone || 'Sin teléfono'} |
                    {' '}{b.status === 'assigned' ? '🟠 Asignado' : b.status === 'available' ? '🟢 Disponible' : '⚫ Offline'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>
                    📍 {b.lat.toFixed(4)}, {b.lng.toFixed(4)}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Mapa */}
        <main style={{ flex: 1, position: 'relative' }}>
          <MapView
            alerts={displayedAlerts}
            brigadiers={brigadiers}
            selectedAlert={selectedAlert}
          />

          {/* Leyenda del mapa */}
          <div style={{
            position: 'absolute', bottom: '20px', right: '10px', zIndex: 999,
            background: 'rgba(15,23,42,0.9)', border: '1px solid #334155',
            borderRadius: '8px', padding: '10px 12px', fontSize: '11px',
          }}>
            <div style={{ fontWeight: '600', marginBottom: '6px', color: '#94a3b8' }}>LEYENDA</div>
            {[['#ef4444','Riesgo Rojo'],['#f97316','Riesgo Naranja'],['#eab308','Riesgo Amarillo'],['#22c55e','Riesgo Verde']].map(([c,l]) => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: c, opacity: 0.7 }} />
                <span style={{ color: '#cbd5e1' }}>{l}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #334155', marginTop: '6px', paddingTop: '6px' }}>
              {[['#22c55e','Brigadier disponible'],['#f97316','Brigadier asignado']].map(([c,l]) => (
                <div key={c} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: c }} />
                  <span style={{ color: '#cbd5e1' }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Toast de notificaciones */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
          background: '#1e40af', color: '#fff', padding: '10px 20px', borderRadius: '8px',
          zIndex: 2000, fontSize: '13px', fontWeight: '500', boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          animation: 'fadeIn 0.3s ease',
        }}>
          {toast}
        </div>
      )}

      {/* Modal nueva alerta */}
      {showModal && (
        <CreateAlertModal
          onClose={() => setShowModal(false)}
          onCreated={refresh}
        />
      )}
    </div>
  );
}

function StatPill({ color, label }) {
  return (
    <div style={{
      background: `${color}22`, border: `1px solid ${color}55`,
      color, borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: '600',
    }}>
      {label}
    </div>
  );
}
