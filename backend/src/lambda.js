/**
 * AMAPA — Handler de AWS Lambda (API Gateway HTTP API, payload v2)
 * Sirve la API REST en /api/*, el health check en /health y el frontend en /app.
 *
 * Limitaciones del despliegue serverless (MVP):
 * - Sin WebSocket: el frontend refresca por polling.
 * - Los datos viven en /tmp de cada instancia Lambda (se re-siembran en cada
 *   arranque en frío con los datos simulados del seed).
 */
const path = require('path');

process.env.AMAPA_DATA_DIR = process.env.AMAPA_DATA_DIR || '/tmp/amapa-data';

const serverless = require('serverless-http');
const { BedrockRuntimeClient } = require('@aws-sdk/client-bedrock-runtime');
const db = require('./db/database');
const { seed } = require('./db/seed');
const { createApp } = require('./app');
const { createDynamoItemsStore, createDynamoJobsStore } = require('./services/itemsStore');

if (db.getAllZones().length === 0) seed();

const app = createApp({
  teamId: process.env.TEAM_ID || null,
  staticDir: path.join(__dirname, '..', 'public'),
  itemsStore: process.env.TABLE_NAME ? createDynamoItemsStore(process.env.TABLE_NAME) : null,
  jobsStore:  process.env.TABLE_NAME ? createDynamoJobsStore(process.env.TABLE_NAME) : null,
  // Reintentos propios en briefingService (ThrottlingException), por eso maxAttempts: 1
  briefing: process.env.MODEL_ID
    ? { client: new BedrockRuntimeClient({ maxAttempts: 1 }), modelId: process.env.MODEL_ID }
    : {},
});

module.exports.handler = serverless(app, {
  binary: ['image/*', 'font/*', 'application/octet-stream', 'application/font-woff', 'application/font-woff2'],
});
