/**
 * Middleware para /api/*: sincroniza el estado heredado con un almacén compartido.
 *
 * 1. Antes de la ruta: carga el estado (si no existe, siembra los datos simulados).
 * 2. Antes de responder: si la ruta escribió y la respuesta es < 400, guarda con
 *    bloqueo optimista. Si otra instancia guardó antes, responde 409 en JSON y
 *    la próxima petición verá el estado nuevo.
 *
 * Una instancia de Lambda atiende una petición a la vez, así que reemplazar el
 * estado del módulo `database` en cada petición es seguro.
 */
const db = require('./database');
const { seed } = require('./seed');

async function loadOrSeed(store) {
  const loaded = await store.load();
  if (loaded) return loaded;
  seed();
  const state = db.getState();
  try {
    return { state, version: await store.save(state, 0) };
  } catch (err) {
    if (err.code !== 'CONFLICT') throw err;
    return store.load(); // otra instancia sembró primero
  }
}

function createLegacySync(store) {
  return async function legacySync(req, res, next) {
    let version;
    try {
      const loaded = await loadOrSeed(store);
      db.replaceState(loaded.state);
      version = loaded.version;
    } catch (err) {
      console.error('No se pudo cargar el estado de alertas', err);
      return res.status(503).json({ success: false, message: 'No se pudo cargar el estado de alertas' });
    }

    const writesBefore = db.getWriteCount();
    const sendJson = res.json.bind(res);
    res.json = (body) => {
      if (db.getWriteCount() === writesBefore || res.statusCode >= 400) return sendJson(body);
      store.save(db.getState(), version)
        .then(() => sendJson(body))
        .catch((err) => {
          if (err.code === 'CONFLICT') {
            res.status(409);
            return sendJson({ success: false, message: 'Otro usuario cambió los datos al mismo tiempo. Intenta de nuevo.' });
          }
          console.error('No se pudo guardar el estado de alertas', err);
          res.status(503);
          return sendJson({ success: false, message: 'No se pudo guardar el cambio' });
        });
      return res;
    };
    next();
  };
}

module.exports = { createLegacySync };
