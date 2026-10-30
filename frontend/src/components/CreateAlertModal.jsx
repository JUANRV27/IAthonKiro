/**
 * Modal para crear nueva alerta (simula input del SENAMHI)
 */
import { useState, useEffect } from 'react';
import { getZones, createAlert } from '../services/api';

export function CreateAlertModal({ onClose, onCreated }) {
  const [zones, setZones] = useState([]);
  const [form, setForm] = useState({
    zone_id: '',
    risk_level: 'orange',
    title: '',
    description: '',
    precipitacion_mm: '',
    nivel_rio_m: '',
    pronostico_24h: 'lluvias intensas',
    estacion: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getZones().then(setZones).catch(console.error);
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.zone_id || !form.title) return setError('Zona y título son requeridos');
    setLoading(true);
    setError(null);
    try {
      const senamhi_data = {
        precipitacion_mm: Number(form.precipitacion_mm) || undefined,
        nivel_rio_m: Number(form.nivel_rio_m) || undefined,
        pronostico_24h: form.pronostico_24h,
        estacion: form.estacion || undefined,
        fecha_reporte: new Date().toISOString(),
      };
      await createAlert({
        zone_id: Number(form.zone_id),
        risk_level: form.risk_level,
        title: form.title,
        description: form.description,
        senamhi_data,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px' }}>🛰️ Nueva Alerta SENAMHI</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Zona afectada *</label>
          <select value={form.zone_id} onChange={e => set('zone_id', e.target.value)} style={inputStyle} required>
            <option value="">— Seleccionar zona —</option>
            {zones.map(z => (
              <option key={z.id} value={z.id}>{z.name} ({z.district})</option>
            ))}
          </select>

          <label style={labelStyle}>Nivel de riesgo *</label>
          <select value={form.risk_level} onChange={e => set('risk_level', e.target.value)} style={inputStyle}>
            <option value="green">🟢 Verde</option>
            <option value="yellow">🟡 Amarillo</option>
            <option value="orange">🟠 Naranja</option>
            <option value="red">🔴 Rojo</option>
          </select>

          <label style={labelStyle}>Título de la alerta *</label>
          <input
            type="text"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            style={inputStyle}
            placeholder="Ej: Alerta Roja - Inundación Catacaos"
            required
          />

          <label style={labelStyle}>Descripción</label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            style={{ ...inputStyle, height: '70px', resize: 'vertical' }}
            placeholder="Descripción de la situación..."
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Precipitación (mm/24h)</label>
              <input type="number" step="0.1" value={form.precipitacion_mm} onChange={e => set('precipitacion_mm', e.target.value)} style={inputStyle} placeholder="0.0" />
            </div>
            <div>
              <label style={labelStyle}>Nivel río (m)</label>
              <input type="number" step="0.1" value={form.nivel_rio_m} onChange={e => set('nivel_rio_m', e.target.value)} style={inputStyle} placeholder="0.0" />
            </div>
          </div>

          <label style={labelStyle}>Pronóstico 24h</label>
          <select value={form.pronostico_24h} onChange={e => set('pronostico_24h', e.target.value)} style={inputStyle}>
            <option value="lluvias ligeras">Lluvias ligeras</option>
            <option value="lluvias moderadas">Lluvias moderadas</option>
            <option value="lluvias intensas">Lluvias intensas</option>
            <option value="lluvias muy intensas">Lluvias muy intensas</option>
          </select>

          <label style={labelStyle}>Estación meteorológica</label>
          <input type="text" value={form.estacion} onChange={e => set('estacion', e.target.value)} style={inputStyle} placeholder="Ej: La Esperanza" />

          {error && (
            <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '8px', borderRadius: '4px', fontSize: '12px', marginTop: '8px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={btnStyle('#334155')}>Cancelar</button>
            <button type="submit" disabled={loading} style={btnStyle('#1d4ed8')}>
              {loading ? 'Creando...' : '✅ Crear Alerta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px',
};
const modalStyle = {
  background: '#1e293b', border: '1px solid #334155', borderRadius: '10px',
  padding: '20px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto',
};
const labelStyle = { display: 'block', fontSize: '12px', color: '#94a3b8', marginTop: '10px', marginBottom: '4px' };
const inputStyle = {
  width: '100%', background: '#0f172a', border: '1px solid #334155',
  color: '#e2e8f0', borderRadius: '4px', padding: '7px 10px', fontSize: '13px', outline: 'none',
};
const btnStyle = (bg) => ({
  background: bg, color: '#fff', border: 'none', borderRadius: '4px',
  padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
});
