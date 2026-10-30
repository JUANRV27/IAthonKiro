# Requisitos — Reporte de puntos críticos priorizado con IA (FEN Piura)

Fuente: plan del equipo `amapa.pdf` ("Mapa de riesgo FEN Piura · Plan del equipo"), que contiene el canvas y la carta del track. En el repositorio no existen `CANVAS.md` ni `RETOS.md`. Los puntos marcados [SUPUESTO] siguen pendientes de validar con un mentor.

## Track (carta del reto)
- **Frente:** Solidaridad y ayuda humanitaria ante el Fenómeno El Niño (FEN), con un mapa ciudadano de riesgo.
- **Qué pide el reto:** reportes de puntos críticos (con foto) y un tablero priorizado.
- **Qué se entrega:** el código (zip con `.kiro/`), un frontend público por HTTPS, el documento, el video del pitch y las insignias (API viva, Persistencia, Asíncrono, GenAI con propósito, Maestría Kiro).

## Canvas
1. **Problema y para quién:** las brigadas y autoridades de Piura (COE distrital, Defensa Civil) reciben los reportes del FEN dispersos por llamadas y WhatsApp, sin una prioridad común, y pierden tiempo en decidir a dónde ir primero. [SUPUESTO]
2. **Usuario principal:** la brigada municipal o comunitaria en campo y el operador del COE que la despacha. SENAMHI es el cliente de los datos de verificación, no el usuario diario.
3. **Propuesta de valor:** la brigada registra un punto en segundos, la IA lo clasifica en rojo, amarillo o verde con criterios de la Evaluación Rápida EDAN, y el mapa y la tabla muestran qué atender primero y qué ya está asegurado.
4. **Dato de contexto (público):** Piura es el departamento con más población expuesta a riesgo muy alto por inundaciones, con 368 199 personas en el escenario mayo–julio 2026 (CENEPRED).
5. **Qué nos diferencia:** cruzamos el reporte de campo con el estado del río (umbrales SENAMHI) y lo priorizamos con IA en un mapa en vivo. EDAN Digital registra daños después del evento, SIGRID planifica y PHISIS mide el río. [SUPUESTO]

## Glosario
- **Reporte:** punto crítico con datos EDAN mínimos. Campos del contrato: `tipoPeligro`, `distrito`, `lat`, `lng`, `personasEnRiesgo`, `viviendas`, `viaAcceso`, `lugaresCriticos`, `necesidad`, `descripcion`, `fotoUrl`.
- **Nivel:** `clasificando` | `rojo` | `amarillo` | `verde`. El rojo agrupa los niveles "muy alto" y "alto" de CENEPRED.
- **Estado:** `pendiente` | `en atención` | `asegurado`.

## Historia de usuario (la única que funciona hoy)

**Como** brigadista en campo en Piura, **quiero** registrar un punto crítico con los datos EDAN mínimos y verlo en el mapa con su color de riesgo y la acción sugerida, **para que** el COE atienda primero lo más urgente.

### Criterios de aceptación
1. CUANDO la brigada envía el formulario "Nuevo reporte" con datos válidos, `POST /reportes` DEBE responder **201** en menos de 1 s con el reporte, `id` nuevo, `nivel:"clasificando"`, `estado:"pendiente"` y `fecha` ISO-8601.
2. SI falta `tipoPeligro`, `distrito`, `lat` o `lng`, o un campo está fuera de sus valores (`viviendas`, `viaAcceso`, `necesidad`, `lugaresCriticos`), o `descripcion` supera 500 caracteres, o `lat`/`lng` caen fuera de la región Piura, la API DEBE responder **400** en JSON sin llamar al modelo.
3. Mientras se clasifica, el punto DEBE verse en el mapa en **gris** con el texto "clasificando…".
4. En menos de **12 s**, el reporte DEBE pasar a `rojo`, `amarillo` o `verde`, con `porque` (máximo 15 palabras) y `accionSugerida`, clasificado por Amazon Bedrock (API Converse) según estos criterios:
   - **Rojo:** vía bloqueada con personas en riesgo, viviendas inhabitables o colapsadas, necesidad de evacuación, o colegio o posta expuestos.
   - **Amarillo:** viviendas afectadas, vía restringida o riesgo que puede escalar.
   - **Verde:** daño menor, sin personas en riesgo inmediato.
5. SI Bedrock no responde o devuelve algo inválido, las mismas reglas DEBEN clasificar el reporte por código (`fuente:"reglas"`) y el flujo NO DEBE romperse.
6. `GET /reportes` DEBE devolver 200 con un arreglo ordenado rojo → amarillo → verde → clasificando y, dentro de cada nivel, del más reciente al más antiguo. El frontend DEBE consultarlo cada 5 s.
7. En la tabla, cada fila DEBE mostrar distrito, peligro, nivel, porqué, acción sugerida y estado, junto con los botones "En atención" y "Asegurado". `PATCH /reportes/{id}` con `{"estado":…}` DEBE responder 200 con el objeto actualizado, o 400 si el estado no es válido y 404 si el id no existe.
8. La pantalla DEBE funcionar sin login y mostrar estados de cargando, vacío y error. Debe haber 8 reportes de demo sembrados (3 rojos, 3 amarillos y 2 verdes, dos de ellos asegurados) con coordenadas aproximadas y datos simulados, sin nombres, teléfonos ni correos.

## Fuera de alcance hoy
Login, notificaciones, subida real de fotos a S3 (la foto es opcional, con el botón "Usar foto de ejemplo"), estadísticas y Google Maps/Amplify (ver `design.md`).

## Siguiente paso después del evento
Validar el dolor y los criterios EDAN con un COE distrital de Piura y conectar datos reales de SENAMHI: el caudal en Puente Sánchez Cerro, Tambogrande y Puente Ñácara, y los avisos por nivel como capa del mapa, para que el estado del río suba la prioridad. Después, entregar a SENAMHI la verificación en campo de sus avisos, con hora y ubicación, para sus indicadores PD, PFA y CSI.
