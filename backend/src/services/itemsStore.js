/**
 * Almacenes en DynamoDB sobre la tabla ItemsTable de template.yaml
 * (nombre en la variable TABLE_NAME, clave de partición id: String).
 *
 * - Ítems (insignia "Persistencia"): id = UUID, sin atributo "kind".
 * - Trabajos (insignia "Asíncrono"): id = "job#<jobId>", kind = "job".
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, UpdateCommand,
} = require('@aws-sdk/lib-dynamodb');

const MAX_LIST_ITEMS = 100;
const JOB_KIND = 'job';
const JOB_PREFIX = 'job#';

const defaultDocClient = () => DynamoDBDocumentClient.from(new DynamoDBClient({}));

function createDynamoItemsStore(tableName, docClient = defaultDocClient()) {
  return {
    async put(item) {
      await docClient.send(new PutCommand({ TableName: tableName, Item: item }));
      return item;
    },

    async get(id) {
      const { Item } = await docClient.send(new GetCommand({ TableName: tableName, Key: { id } }));
      return Item && Item.kind !== JOB_KIND ? Item : null;
    },

    /** Recorre todas las páginas del scan hasta juntar `limit` ítems o terminar la tabla */
    async list(limit = MAX_LIST_ITEMS) {
      const items = [];
      let ExclusiveStartKey;
      do {
        const page = await docClient.send(new ScanCommand({
          TableName: tableName,
          Limit: limit - items.length,
          ExclusiveStartKey,
          FilterExpression: 'attribute_not_exists(kind)', // excluye trabajos
        }));
        items.push(...(page.Items || []));
        ExclusiveStartKey = page.LastEvaluatedKey;
      } while (ExclusiveStartKey && items.length < limit);
      return items.slice(0, limit);
    },
  };
}

function createDynamoJobsStore(tableName, docClient = defaultDocClient()) {
  return {
    async put(job) {
      await docClient.send(new PutCommand({
        TableName: tableName,
        Item: { ...job, id: JOB_PREFIX + job.jobId, kind: JOB_KIND },
      }));
      return job;
    },

    async get(jobId) {
      const { Item } = await docClient.send(new GetCommand({ TableName: tableName, Key: { id: JOB_PREFIX + jobId } }));
      if (!Item || Item.kind !== JOB_KIND) return null;
      const { id, kind, ...job } = Item; // eslint-disable-line no-unused-vars
      return job;
    },

    /** Marca el trabajo como terminado una sola vez (idempotente ante lecturas concurrentes) */
    async complete(jobId, output) {
      try {
        await docClient.send(new UpdateCommand({
          TableName: tableName,
          Key: { id: JOB_PREFIX + jobId },
          UpdateExpression: 'SET #s = :done, #o = :output, completedAt = :now',
          ConditionExpression: '#s = :queued',
          ExpressionAttributeNames: { '#s': 'status', '#o': 'output' },
          ExpressionAttributeValues: { ':done': 'done', ':queued': 'queued', ':output': output, ':now': new Date().toISOString() },
        }));
      } catch (err) {
        if (err.name !== 'ConditionalCheckFailedException') throw err;
      }
    },
  };
}

module.exports = { createDynamoItemsStore, createDynamoJobsStore, MAX_LIST_ITEMS };
