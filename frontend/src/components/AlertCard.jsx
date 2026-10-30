/**
 * Tarjeta de alerta con acciones: auto-asignar, resolver, ver detalles
 */
import { useState } from 'react';
import { RiskBadge } from './RiskBadge';
import { selfAssign, resolveAlert, autoAssign } from '../services/api';

const STATUS_LABELS = {
  active:   { label: 'Activa',   color: '#22c55e' },
  full:     { label: 'Completa', color: '#f97316' },
  resolved: { label: 'Resuelta', color: '#64748b' },
};

export function AlertCard({ alert, brigadierId, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const status = STATUS_LABELS[alert.status] || STATUS_LABELS.active;
  const senamhi = alert.senamhi_data ? JSON.parse(alert.senamhi_data) : null;
  const progressPct = Math.min(100, Math.round((alert.assigned_count / alert.max_brigadiers) * 100));

  async function handleSelfAssign() {
    if (!brigadierId) return setMessage({ type: 'error', text: 'Selecciona tu brigadier primero' });
    setLoading(true);
    setMessage(null);
    try {
      const result = await selfAssign(brigadierId, alert.id);
      let text = `✅ Asignado. Distancia: ${result.assignment.distance_km.toFixed(2)} km`;
      if (result.nearest_suggestion) {
        text += ` | ⚠️ ${result.nearest_suggestion.message}`;
      }
      setMessage({ type: 'success', text });
      onRefresh();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoAssign() {
    setLoading(true);
    setMessage(null);
    try {
      const result = await autoAssign(alert.id);
      setMessage({ type: 'success', text: `✅ Asignado automáticamente: ${result.assignment.brigadier_name} (${result.assignment.distance_km.toFixed(2)} km)` });
      onRefresh();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve() {
    if (!window.confirm('¿Marcar esta alerta como resuelta?')) return;
    setLoading(true);
    try {
      await resolveAlert(alert.id);
      setMessage({ type: 'success', text: '✅ Alerta resuelta' });
      onRefresh();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  const RISK_BORDER = { red: '#ef4444', orange: '#f97316', yellow: '#eab308', green: '#22c55e' };

  return (
    <div style={{
      background: '#1e293b',
      border: `1px solid ${RISK_BORDER[alert.risk_level]}`,
      borderLeft: `4px solid ${RISK_BORDER[alert.risk_level]}`,
      borderRadius: '8px',
      padding: '14px',
      marginBottom: '10px',
      opacity: alert.status === 'resolved' ? 0.6 : 1,
    }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <RiskBadge level={alert.risk_level} />
            <span style={{ fontSize: '11px', color: status.color, fontWeight: '600', background: '#0f172a', padding: '2px 8px', borderRadius: '4px' }}>
              {status.label}
            </span>
          </div>
          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px' }}>{alert.title}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            📍 {alert.zone_name} — {alert.district}
          </div>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Barra de progreso de brigadieres */}
      <div style={{ marginTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
          <span>Brigadieres asignados</span>
          <span>{alert.assigned_count} / {alert.max_brigadiers}</span>
        </div>
        <div style={{ background: '#0f172a', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progressPct}%`,
            background: alert.status === 'full' ? '#f97316' : '#3b82f6',
            borderRadius: '4px',
            transition: 'width 0.3s ease',
          }} />
        </div>
        {alert.status === 'full' && (
          <div style={{ fontSize: '11px', color: '#f97316', marginTop: '4px', fontWeight: '600' }}>
            🔒 Zona bloqueada — cupo completo
          </div>
        )}
      </div>

      {/* Datos expandidos */}
      {expanded && (
        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #334155' }}>
          {alert.description && (
            <p style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '8px' }}>{alert.description}</p>
          )}
          {senamhi && (
            <div style={{ background: '#0f172a', borderRadius: '6px', padding: '8px', fontSize: '12px' }}>
              <div style={{ color: '#60a5fa', fontWeight: '600', marginBottom: '4px' }}>🛰️ Datos SENAMHI</div>
              {senamhi.precipitacion_mm && <div>🌧️ Precipitación: <strong>{senamhi.precipitacion_mm} mm/24h</strong></div>}
              {senamhi.nivel_rio_m && <div>🌊 Nivel río: <strong>{senamhi.nivel_rio_m} m</strong> (umbral: {senamhi.umbral_critico_m} m)</div>}
              {senamhi.pronostico_24h && <div>📊 Pronóstico: <strong>{senamhi.pronostico_24h}</strong></div>}
              {senamhi.estacion && <div>📡 Estación: {senamhi.estacion}</div>}
            </div>
          )}
        </div>
      )}

      {/* Mensaje de feedback */}
      {message && (
        <div style={{
          marginTop: '8px',
          padding: '6px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          background: message.type === 'success' ? '#14532d' : '#7f1d1d',
          color: message.type === 'success' ? '#86efac' : '#fca5a5',
        }}>
          {message.text}
        </div>
      )}

      {/* Acciones */}
      {alert.status !== 'resolved' && (
        <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {alert.status === 'active' && (
            <>
              <button
                onClick={handleSelfAssign}
                disabled={loading || !brigadierId}
                style={btnStyle('#1d4ed8', '#2563eb', loading || !brigadierId)}
              >
                🙋 Auto-asignarme
              </button>
              <button
                onClick={handleAutoAssign}
                disabled={loading}
                style={btnStyle('#065f46', '#047857', loading)}
              >
                🤖 Asignar más cercano
              </button>
            </>
          )}
          <button
            onClick={handleResolve}
            disabled={loading}
            style={btnStyle('#4c1d95', '#6d28d9', loading)}
          >
            ✔ Resolver
          </button>
        </div>
      )}
    </div>
  );
}

function btnStyle(bg, hover, disabled) {
  return {
    background: disabled ? '#1e293b' : bg,
    color: disabled ? '#475569' : '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '5px 10px',
    fontSize: '12px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: '500',
    transition: 'background 0.2s',
  };
}
