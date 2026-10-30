/**
 * AMAPA — Handler de AWS Lambda
 * - Eventos HTTP (API Gateway HTTP API, payload v2) → app Express vía serverless-http.
 * - Eventos SQS (ClasificarQueue) → clasificación de reportes con Bedrock.
 *
 * Limitaciones del despliegue serverless (MVP):
 * - Sin WebSocket: el frontend refresca por polling.
 * - Todo persiste en DynamoDB: reportes, ítems, trabajos y el estado heredado de
 *   alertas/brigadistas (un ítem "estado#legacy" compartido por todas las instancias).
 */
const path = require('path');

process.env.AMAPA_DATA_DIR = process.env.AMAPA_DATA_DIR || '/tmp/amapa-data';

const serverless = require('serverless-http');
const { BedrockRuntimeClient } = require('@aws-sdk/client-bedrock-runtime');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const db = require('./db/database');
const { seed } = require('./db/seed');
const { createApp } = require('./app');
const { createDynamoItemsStore, createDynamoJobsStore } = require('./services/itemsStore');
const { createDynamoReportesStore } = require('./services/reportesStore');
const { createReportesService } = require('./services/reportesService');
const { createDynamoLegacyStateStore } = require('./services/legacyStateStore');

// Sin TABLE_NAME (sam local sin tabla) se usa el seed en /tmp como antes
if (db.getAllZones().length === 0) seed();

const { TABLE_NAME, MODEL_ID, QUEUE_URL } = process.env;

// Reintentos propios ante ThrottlingException, por eso maxAttempts: 1
const bedrock = MODEL_ID ? { client: new BedrockRuntimeClient({ maxAttempts: 1 }), modelId: MODEL_ID } : {};

function createSqsQueue(queueUrl, client = new SQSClient({})) {
  return {
    async send(id) {
      await client.send(new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: JSON.stringify({ id }) }));
    },
  };
}

const reportes = TABLE_NAME
  ? createReportesService({
    store: createDynamoReportesStore(TABLE_NAME),
    queue: QUEUE_URL ? createSqsQueue(QUEUE_URL) : null,
    ia: bedrock,
  })
  : null;

const app = createApp({
  teamId: process.env.TEAM_ID || null,
  staticDir: path.join(__dirname, '..', 'public'),
  itemsStore: TABLE_NAME ? createDynamoItemsStore(TABLE_NAME) : null,
  jobsStore:  TABLE_NAME ? createDynamoJobsStore(TABLE_NAME) : null,
  briefing: bedrock,
  reportes,
  legacyState: TABLE_NAME ? createDynamoLegacyStateStore(TABLE_NAME) : null,
});

const httpHandler = serverless(app, {
  binary: ['image/*', 'font/*', 'application/octet-stream', 'application/font-woff', 'application/font-woff2'],
});

const isSqsEvent = (event) => Array.isArray(event?.Records) && event.Records.length > 0
  && event.Records.every((r) => r.eventSource === 'aws:sqs');

module.exports.handler = async (event, context) => {
  if (isSqsEvent(event)) {
    if (!reportes) throw new Error('TABLE_NAME no configurado');
    return reportes.procesarMensajes(event.Records); // ReportBatchItemFailures
  }
  return httpHandler(event, context);
};

module.exports.isSqsEvent = isSqsEvent;
