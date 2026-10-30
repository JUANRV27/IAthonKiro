/**
 * Badge de nivel de riesgo con colores del sistema SENAMHI
 */
const COLORS = {
  red:    { bg: '#7f1d1d', text: '#fca5a5', label: 'ROJO',    border: '#ef4444' },
  orange: { bg: '#7c2d12', text: '#fdba74', label: 'NARANJA', border: '#f97316' },
  yellow: { bg: '#713f12', text: '#fde047', label: 'AMARILLO',border: '#eab308' },
  green:  { bg: '#14532d', text: '#86efac', label: 'VERDE',   border: '#22c55e' },
};

export function RiskBadge({ level, size = 'sm' }) {
  const c = COLORS[level] || COLORS.green;
  const padding = size === 'lg' ? '6px 14px' : '2px 8px';
  const fontSize = size === 'lg' ? '13px' : '11px';

  return (
    <span style={{
      background: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
      borderRadius: '4px',
      padding,
      fontSize,
      fontWeight: '700',
      letterSpacing: '0.5px',
      display: 'inline-block',
    }}>
      {c.label}
    </span>
  );
}
