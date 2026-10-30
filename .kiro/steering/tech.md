# Tecnología

Frontend: React + Vite + Tailwind, en frontend/. Interfaz en español.

Mapa: Google Maps (key en VITE_GOOGLE_MAPS_KEY), estilo oscuro.

Backend: API Gateway + Lambda + DynamoDB + SQS + Bedrock (us-east-1).

El contrato de la API está en docs/contrato-api.md: respétalo siempre.

Si VITE_USE_MOCK=true, usar datos simulados con la misma forma.

En vivo: GET /reportes cada 5 segundos.

Siempre mostrar estados de cargando, vacío y error.

Sin login: un bot evaluador debe poder usar todo en pocos clics.
