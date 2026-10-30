/**
 * Almacén de reportes de puntos críticos en ItemsTable (DynamoDB).
 * Clave: id = "reporte#<id>", kind = "reporte" (GET /items los excluye por tener kind).
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, UpdateCommand,
} = require('@aws-sdk/lib-dynamodb');

const KIND = 'reporte';
const PREFIX = 'reporte#';
const MAX_REPORTES = 500;

const toKey = (id) => ({ id: PREFIX + id });
const fromItem = (item) => {
  if (!item || item.kind !== KIND) return null;
  const { kind, ...rest } = item; // eslint-disable-line no-unused-vars
  return { ...rest, id: rest.id.slice(PREFIX.length) };
};

function createDynamoReportesStore(tableName, docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}))) {
  return {
    /** Guarda un reporte. Con onlyIfNew no sobrescribe (seed idempotente). */
    async put(reporte, { onlyIfNew = false } = {}) {
      try {
        await docClient.send(new PutCommand({
          TableName: tableName,
          Item: { ...reporte, id: PREFIX + reporte.id, kind: KIND },
          ...(onlyIfNew ? { ConditionExpression: 'attribute_not_exists(id)' } : {}),
        }));
      } catch (err) {
        if (!(onlyIfNew && err.name === 'ConditionalCheckFailedException')) throw err;
      }
      return reporte;
    },

    async get(id) {
      const { Item } = await docClient.send(new GetCommand({ TableName: tableName, Key: toKey(id) }));
      return fromItem(Item);
    },

    /** Todos los reportes (scan paginado con filtro kind = reporte) */
    async list() {
      const out = [];
      let ExclusiveStartKey;
      do {
        const page = await docClient.send(new ScanCommand({
          TableName: tableName,
          FilterExpression: 'kind = :k',
          ExpressionAttributeValues: { ':k': KIND },
          ExclusiveStartKey,
        }));
        out.push(...(page.Items || []).map(fromItem));
        ExclusiveStartKey = page.LastEvaluatedKey;
      } while (ExclusiveStartKey && out.length < MAX_REPORTES);
      return out.slice(0, MAX_REPORTES);
    },

    /**
     * Actualiza campos. onlyIfClasificando: solo si nivel = "clasificando"
     * (idempotente ante reintentos de SQS). Devuelve el reporte o null si no aplica.
     */
    async update(id, patch, { onlyIfClasificando = false } = {}) {
      const names = {};
      const values = {};
      const sets = Object.entries(patch).map(([k, v], i) => {
        names[`#f${i}`] = k;
        values[`:v${i}`] = v;
        return `#f${i} = :v${i}`;
      });
      let condition = 'attribute_exists(id)';
      if (onlyIfClasificando) {
        names['#nivel'] = 'nivel';
        values[':clasificando'] = 'clasificando';
        condition += ' AND #nivel = :clasificando';
      }
      try {
        const res = await docClient.send(new UpdateCommand({
          TableName: tableName,
          Key: toKey(id),
          UpdateExpression: `SET ${sets.join(', ')}`,
          ConditionExpression: condition,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
          ReturnValues: 'ALL_NEW',
        }));
        return fromItem(res.Attributes);
      } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') return null;
        throw err;
      }
    },
  };
}

/** Almacén en memoria con la misma interfaz (local con npm start y tests) */
function createMemoryReportesStore() {
  const rows = new Map();
  return {
    rows,
    async put(r, { onlyIfNew = false } = {}) {
      if (!(onlyIfNew && rows.has(r.id))) rows.set(r.id, { ...r });
      return r;
    },
    async get(id) { const r = rows.get(id); return r ? { ...r } : null; },
    async list() { return [...rows.values()].map((r) => ({ ...r })); },
    async update(id, patch, { onlyIfClasificando = false } = {}) {
      const r = rows.get(id);
      if (!r || (onlyIfClasificando && r.nivel !== 'clasificando')) return null;
      Object.assign(r, patch);
      return { ...r };
    },
  };
}

module.exports = { createDynamoReportesStore, createMemoryReportesStore };
