/**
 * Estado heredado (zonas, alertas, brigadistas y asignaciones) en DynamoDB.
 *
 * En Lambda cada contenedor tenía su propia copia en /tmp, así que resolver una
 * alerta o asignar un brigadista solo se veía en una instancia. Aquí todo el
 * estado se guarda en un único ítem de ItemsTable:
 *   id = "estado#legacy", kind = "estado", version: número, data: JSON (string)
 * GET /items lo excluye por tener `kind`.
 *
 * La escritura es condicionada por `version` (bloqueo optimista): si otra
 * instancia guardó antes, save() lanza un error con code = 'CONFLICT'.
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const STATE_ID = 'estado#legacy';
const STATE_KIND = 'estado';

const defaultDocClient = () => DynamoDBDocumentClient.from(new DynamoDBClient({}));

function createDynamoLegacyStateStore(tableName, docClient = defaultDocClient()) {
  return {
    /** @returns {Promise<{ state: object, version: number } | null>} */
    async load() {
      const { Item } = await docClient.send(new GetCommand({
        TableName: tableName, Key: { id: STATE_ID }, ConsistentRead: true,
      }));
      if (!Item || Item.kind !== STATE_KIND) return null;
      return { state: JSON.parse(Item.data), version: Item.version };
    },

    /**
     * Guarda el estado si nadie lo cambió desde `expectedVersion` (0 = aún no existe).
     * @returns {Promise<number>} nueva versión
     */
    async save(state, expectedVersion) {
      const version = expectedVersion + 1;
      try {
        await docClient.send(new PutCommand({
          TableName: tableName,
          Item: { id: STATE_ID, kind: STATE_KIND, version, data: JSON.stringify(state), updatedAt: new Date().toISOString() },
          ...(expectedVersion === 0
            ? { ConditionExpression: 'attribute_not_exists(id)' }
            : { ConditionExpression: 'version = :v', ExpressionAttributeValues: { ':v': expectedVersion } }),
        }));
      } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
          const conflict = new Error('El estado cambió en otra instancia');
          conflict.code = 'CONFLICT';
          throw conflict;
        }
        throw err;
      }
      return version;
    },
  };
}

module.exports = { createDynamoLegacyStateStore, STATE_ID, STATE_KIND };
