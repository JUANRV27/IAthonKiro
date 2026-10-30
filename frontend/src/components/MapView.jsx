/**
 * Mapa de Piura con zonas, alertas activas y posición de brigadieres
 * Usa React-Leaflet + OpenStreetMap
 */
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix para iconos de Leaflet con Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const RISK_COLORS = {
  red:    '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green:  '#22c55e',
};

const STATUS_OPACITY = {
  active:   0.7,
  full:     0.5,
  resolved: 0.2,
};

// Centro del mapa: Piura
const PIURA_CENTER = [-5.1945, -80.6328];

export function MapView({ alerts, brigadiers, selectedAlert }) {
  return (
    <MapContainer
      center={PIURA_CENTER}
      zoom={10}
      style={{ height: '100%', width: '100%', borderRadius: '8px' }}
    >
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Zonas de alerta como círculos */}
      {alerts.map((alert) => (
        <CircleMarker
          key={`alert-${alert.id}`}
          center={[alert.zone_lat, alert.zone_lng]}
          radius={alert.status === 'full' ? 22 : 18}
          pathOptions={{
            color: RISK_COLORS[alert.risk_level],
            fillColor: RISK_COLORS[alert.risk_level],
            fillOpacity: STATUS_OPACITY[alert.status] || 0.5,
            weight: alert.status === 'full' ? 3 : 2,
            dashArray: alert.status === 'full' ? '6 3' : null,
          }}
        >
          <Popup>
            <div style={{ minWidth: '200px' }}>
              <strong style={{ fontSize: '13px' }}>{alert.title}</strong>
              <br />
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                {alert.zone_name} — {alert.district}
              </span>
              <br />
              <span style={{ fontSize: '12px' }}>
                👥 {alert.assigned_count}/{alert.max_brigadiers} brigadieres
              </span>
              {alert.status === 'full' && (
                <div style={{ color: '#f97316', fontWeight: '600', fontSize: '11px', marginTop: '4px' }}>
                  🔒 Cupo completo
                </div>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* Posición de brigadieres */}
      {brigadiers.map((b) => {
        const color = b.status === 'assigned' ? '#f97316' : b.status === 'available' ? '#22c55e' : '#64748b';
        return (
          <CircleMarker
            key={`brig-${b.id}`}
            center={[b.lat, b.lng]}
            radius={7}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.9, weight: 2 }}
          >
            <Popup>
              <div>
                <strong>{b.name}</strong>
                <br />
                <span style={{ fontSize: '11px' }}>
                  {b.status === 'assigned' ? '🟠 Asignado' : b.status === 'available' ? '🟢 Disponible' : '⚫ Offline'}
                </span>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {/* Rutas de la alerta seleccionada */}
      {selectedAlert?.assignments?.map((asn) => {
        if (!asn.route_geojson) return null;
        try {
          const route = JSON.parse(asn.route_geojson);
          const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          return (
            <Polyline
              key={`route-${asn.id}`}
              positions={coords}
              pathOptions={{ color: '#3b82f6', weight: 2, dashArray: '4 4', opacity: 0.8 }}
            />
          );
        } catch {
          return null;
        }
      })}
    </MapContainer>
  );
}
