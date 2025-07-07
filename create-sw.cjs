// create-sw.cjs - Convertido desde tu sw.js actual
const fs = require("fs");
const path = require("path");

const swContent = `// public/sw.js - Service Worker COMPLETO y CORREGIDO
const CACHE_NAME = "aparky-v9-queue-fixed-" + Date.now();
const NOTIFICATION_DB_NAME = "NotificationQueueDB";

// Cola de notificaciones en memoria
let notificationQueue = new Map();
let processingQueue = false;
let keepAliveInterval;
let dbReady = false;
let db = null;

console.log("🚀 SW: Service Worker COMPLETO cargando...");

// Instalar service worker
self.addEventListener("install", (event) => {
  console.log("🔧 SW: Service Worker instalado");
  self.skipWaiting();
});

// Activar service worker
self.addEventListener("activate", (event) => {
  console.log("✅ SW: Service Worker activado");
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      initializeDatabase(),
      restoreNotificationQueue(),
      startQueueProcessor(),
      startKeepAlive(),
    ])
  );
});

// 🔥 MEJORADO: Manejar mensajes con más tipos
self.addEventListener("message", (event) => {
  console.log("📨 SW: Mensaje recibido:", event.data.type, event.data);

  const { type } = event.data; // ✅ Solo extraer el type

  switch (type) {
    case "SCHEDULE_NOTIFICATION":
      // ✅ CORREGIDO: Pasar el mensaje completo, no solo 'data'
      handleScheduleNotification(event.data);
      break;
    case "CANCEL_NOTIFICATION":
      handleCancelNotification(event.data);
      break;
    case "GET_QUEUE_STATUS":
      handleGetQueueStatus(event);
      break;
    case "FORCE_PROCESS_QUEUE":
      console.log("🔄 SW: Procesamiento forzado desde mensaje");
      processNotificationQueue();
      break;
    case "CLEAR_NOTIFICATION_QUEUE":
      console.log("🧹 SW: Limpiando cola desde mensaje");
      notificationQueue.clear();
      break;
    case "CLEAR_ALL_NOTIFICATIONS":
      console.log("🧹 SW: Limpiando todas las notificaciones");
      handleClearAllNotifications();
      break;
    case "DEBUG_INFO":
      console.log("🔍 SW: Info de debug solicitada");
      const debugInfo = {
        queueSize: notificationQueue.size,
        processingQueue,
        dbReady,
        dbExists: !!db,
        dbConnected: !!(db && !db.closed),
        notifications: Array.from(notificationQueue.values()),
      };
      console.log("📊 SW Estado:", debugInfo);
      event.ports[0]?.postMessage(debugInfo);
      break;
    case "CHECK_DEBUG_FUNCTIONS":
      console.log("🔍 SW: Verificando funciones debug disponibles");
      break;
    default:
      console.log("❓ SW: Tipo de mensaje desconocido:", type);
  }
});

// 🔥 MEJORADO: Función para verificar y reinicializar BD automáticamente
async function ensureDatabaseReady() {
  if (dbReady && db && !db.closed) {
    return true;
  }

  console.log("⚠️ SW: BD no lista, reinicializando automáticamente...");

  try {
    await initializeDatabase();
    return dbReady && db && !db.closed;
  } catch (error) {
    console.error("❌ SW: Error reinicializando BD:", error);
    return false;
  }
}

// Inicializar base de datos
async function initializeDatabase() {
  return new Promise((resolve) => {
    console.log("🔄 SW: Inicializando base de datos...");

    const request = indexedDB.open(NOTIFICATION_DB_NAME, 2);

    request.onerror = function (event) {
      console.error("❌ SW: Error abriendo base de datos:", event.target.error);
      dbReady = false;
      db = null;
      resolve();
    };

    request.onupgradeneeded = function (event) {
      console.log("🔄 SW: Actualizando esquema de base de datos...");
      const database = event.target.result;

      // Crear tabla de notificaciones si no existe
      if (!database.objectStoreNames.contains("notifications")) {
        const store = database.createObjectStore("notifications", { keyPath: "id" });
        store.createIndex("scheduledTime", "scheduledTime", { unique: false });
        console.log("✅ SW: Tabla de notificaciones creada");
      }
    };

    request.onsuccess = function (event) {
      db = event.target.result;
      dbReady = true;
      console.log("✅ SW: Base de datos inicializada correctamente");

      db.onerror = function (event) {
        console.error("❌ SW: Error en base de datos:", event.target.error);
      };

      resolve();
    };
  });
}

// Restaurar cola desde BD
async function restoreNotificationQueue() {
  if (!dbReady || !db) {
    console.warn("⚠️ SW: BD no disponible para restaurar cola");
    return;
  }

  try {
    const transaction = db.transaction(["notifications"], "readonly");
    const store = transaction.objectStore("notifications");
    const request = store.getAll();

    request.onsuccess = function () {
      const notifications = request.result;
      console.log(\`🔄 SW: Restaurando \${notifications.length} notificaciones desde BD\`);

      let restored = 0;
      const now = Date.now();

      notifications.forEach((notification) => {
        // Solo restaurar notificaciones futuras válidas
        if (notification.scheduledTime && notification.scheduledTime > now) {
          notificationQueue.set(notification.id, notification);
          restored++;
        } else {
          // Eliminar notificaciones expiradas
          deleteNotificationFromDB(notification.id);
        }
      });

      console.log(
        \`✅ SW: \${restored} notificaciones restauradas, \${notifications.length - restored} expiradas eliminadas\`
      );
    };

    request.onerror = function () {
      console.error("❌ SW: Error restaurando cola desde BD");
    };
  } catch (error) {
    console.error("❌ SW: Error en restauración de cola:", error);
  }
}

// Manejar programación de notificación
// Reemplaza la función handleScheduleNotification completa:
function handleScheduleNotification(messageData) {
  console.log("🔍 DEBUG COMPLETO - messageData:", messageData);
  console.log("🔍 DEBUG - typeof messageData:", typeof messageData);
  console.log("🔍 DEBUG - Object.keys:", Object.keys(messageData));

  // Extraer datos del mensaje correcto
  const data = messageData; // El mensaje completo ES los datos

  console.log("⏰ SW: Programando notificación:", data.id);

  // 🔧 VALIDACIÓN CORREGIDA
  if (!data.id || !data.title || !data.scheduledTime) {
    console.error("❌ SW: Datos de notificación inválidos:", data);
    console.error("❌ SW: id:", data.id, "title:", data.title, "scheduledTime:", data.scheduledTime);
    return;
  }

  // Validar que scheduledTime es un número válido
  const scheduledTime = Number(data.scheduledTime);
  if (isNaN(scheduledTime)) {
    console.error("❌ SW: scheduledTime inválido:", data.scheduledTime);
    return;
  }

  const notification = {
    id: data.id,
    title: data.title,
    body: data.body || "",
    scheduledTime: scheduledTime,
    icon: data.icon || "/icons/pwa-192x192.png",
    badge: data.badge || "/icons/pwa-64x64.png",
    tag: data.tag || data.id,
    requireInteraction: data.requireInteraction ?? true,
    vibrate: data.vibrate || [200, 100, 200],
    data: data.data || {},
    processed: false,
    retryCount: 0,
    createdAt: Date.now(),
  };

  // Añadir a cola
  notificationQueue.set(data.id, notification);

  // Guardar en BD
  saveNotificationToDB(notification);

  console.log(\`✅ SW: Notificación \${data.id} programada para \${new Date(scheduledTime).toLocaleString()}\`);
}

// Manejar cancelación de notificación
function handleCancelNotification(data) {
  const id = typeof data === "string" ? data : data.id;
  console.log("❌ SW: Cancelando notificación:", id);

  if (notificationQueue.has(id)) {
    notificationQueue.delete(id);
    deleteNotificationFromDB(id);
    console.log(\`✅ SW: Notificación \${id} cancelada\`);
  }
}

// Manejar solicitud de estado de cola
function handleGetQueueStatus(event) {
  const status = getNotificationQueueDebug();

  // Responder al cliente si es posible
  if (event.ports && event.ports[0]) {
    event.ports[0].postMessage(status);
  }

  console.log("📊 SW: Estado de cola enviado:", status);
}

function handleClearAllNotifications() {
  console.log("🧹 SW: Limpiando todas las notificaciones y cola");

  // Limpiar cola en memoria
  notificationQueue.clear();

  // Limpiar notificaciones activas del navegador
  registration
    .getNotifications()
    .then((notifications) => {
      notifications.forEach((notification) => {
        console.log(\`🗑️ SW: Cerrando notificación: \${notification.tag}\`);
        notification.close();
      });

      console.log(\`✅ SW: \${notifications.length} notificaciones cerradas\`);
    })
    .catch((error) => {
      console.error("❌ SW: Error limpiando notificaciones:", error);
    });

  // Limpiar base de datos
  if (db) {
    try {
      const transaction = db.transaction(["notifications"], "readwrite");
      const store = transaction.objectStore("notifications");
      store.clear();
      console.log("🗑️ SW: Base de datos de notificaciones limpiada");
    } catch (error) {
      console.error("❌ SW: Error limpiando BD:", error);
    }
  }
}

// Guardar notificación en BD
function saveNotificationToDB(notification) {
  if (!dbReady || !db) return;

  try {
    const transaction = db.transaction(["notifications"], "readwrite");
    const store = transaction.objectStore("notifications");
    store.put(notification);
  } catch (error) {
    console.error("❌ SW: Error guardando en BD:", error);
  }
}

// Eliminar notificación de BD
function deleteNotificationFromDB(id) {
  if (!dbReady || !db) return;

  try {
    const transaction = db.transaction(["notifications"], "readwrite");
    const store = transaction.objectStore("notifications");
    store.delete(id);
  } catch (error) {
    console.error("❌ SW: Error eliminando de BD:", error);
  }
}

// 🔥 CORREGIDO: Procesador de cola mejorado
async function processNotificationQueue() {
  if (processingQueue) {
    console.log("⏳ SW: Procesador ya ejecutándose");
    return;
  }

  if (notificationQueue.size === 0) {
    return;
  }

  processingQueue = true;
  const now = Date.now();
  const processed = [];
  const invalidNotifications = [];

  console.log(\`🔄 SW: Procesando \${notificationQueue.size} notificaciones...\`);

  try {
    for (const [id, notification] of notificationQueue) {
      // Verificar fecha válida
      if (!notification.scheduledTime || isNaN(notification.scheduledTime)) {
        console.warn(\`❌ SW: Notificación con fecha inválida: \${id}\`);
        invalidNotifications.push(id);
        continue;
      }

      // Procesar si ha llegado el momento
      if (notification.scheduledTime <= now && !notification.processed) {
        console.log(\`🔔 SW: Ejecutando notificación: \${id}\`);

        try {
          await registration.showNotification(notification.title, {
            body: notification.body,
            icon: notification.icon,
            badge: notification.badge,
            tag: notification.tag,
            requireInteraction: notification.requireInteraction,
            vibrate: notification.vibrate,
            data: notification.data,
            actions: [
              { action: "open", title: "📱 Abrir", icon: "/icons/pwa-64x64.png" },
              { action: "dismiss", title: "❌ Cerrar", icon: "/icons/pwa-64x64.png" },
            ],
          });

          // Marcar como procesada
          notification.processed = true;
          processed.push(id);

          console.log(\`✅ SW: Notificación \${id} mostrada correctamente\`);
        } catch (showError) {
          console.error(\`❌ SW: Error mostrando notificación \${id}:\`, showError);

          // Incrementar contador de reintentos
          notification.retryCount = (notification.retryCount || 0) + 1;

          if (notification.retryCount >= 3) {
            console.error(\`❌ SW: Notificación \${id} falló después de 3 intentos\`);
            processed.push(id); // Marcar para eliminar
          }
        }
      }
    }

    // Limpiar notificaciones procesadas
    processed.forEach((id) => {
      notificationQueue.delete(id);
      deleteNotificationFromDB(id);
    });

    // Limpiar notificaciones inválidas
    invalidNotifications.forEach((id) => {
      notificationQueue.delete(id);
      deleteNotificationFromDB(id);
    });

    if (processed.length > 0 || invalidNotifications.length > 0) {
      console.log(
        \`✅ SW: Procesamiento completado - \${processed.length} procesadas, \${invalidNotifications.length} inválidas eliminadas\`
      );
    }
  } catch (error) {
    console.error("❌ SW: Error en procesamiento de cola:", error);
  } finally {
    processingQueue = false;
  }
}

// Iniciar procesador de cola
async function startQueueProcessor() {
  if (processingQueue) return;

  console.log("⏰ SW: Iniciando procesador de cola (PWA compatible)");

  // Procesamiento inicial
  processNotificationQueue();

  // 🔥 NUEVO: Múltiples métodos de procesamiento para PWA

  // Método 1: setInterval tradicional
  const traditionalInterval = setInterval(() => {
    if (notificationQueue.size > 0) {
      console.log("⏰ SW: Procesamiento tradicional");
      processNotificationQueue();
    }
  }, 5000);

  // Método 2: setTimeout recursivo (más confiable en PWA)
  function recursiveProcessing() {
    setTimeout(() => {
      if (notificationQueue.size > 0) {
        console.log("🔄 SW: Procesamiento recursivo");
        processNotificationQueue();
      }
      recursiveProcessing(); // Re-programar
    }, 5000);
  }
  recursiveProcessing();

  // Método 3: Procesamiento basado en mensajes (más robusto)
  function setupMessageBasedProcessing() {
    // Auto-procesar cada vez que se añade una notificación
    const originalSet = notificationQueue.set;
    notificationQueue.set = function (key, value) {
      const result = originalSet.call(this, key, value);

      // Programar procesamiento inmediato
      setTimeout(() => {
        console.log("📨 SW: Procesamiento por mensaje");
        processNotificationQueue();
      }, 1000);

      return result;
    };
  }
  setupMessageBasedProcessing();

  // Método 4: Keep-alive más agresivo para PWA
  function aggressiveKeepAlive() {
    setInterval(() => {
      console.log("💓 SW: Keep-alive agresivo PWA");

      // Forzar procesamiento en keep-alive
      if (notificationQueue.size > 0) {
        console.log("🔄 SW: Procesamiento en keep-alive");
        processNotificationQueue();
      }
    }, 15000); // Cada 15 segundos
  }
  aggressiveKeepAlive();

  console.log("✅ SW: Procesador de cola PWA iniciado con múltiples métodos");
}

// 🔥 AÑADIMOS LA FUNCIÓN FALTANTE startKeepAlive()
function startKeepAlive() {
  // Limpiar keep-alive anterior
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }

  keepAliveInterval = setInterval(async () => {
    console.log("💓 SW: Keep-alive ping");

    // Verificar BD en cada keep-alive
    const isReady = await ensureDatabaseReady();
    if (!isReady) {
      console.warn("⚠️ SW: BD no disponible en keep-alive");
    }

    // Procesar cola si hay notificaciones
    if (notificationQueue.size > 0) {
      processNotificationQueue();
    }
  }, 25000);
}

// 🔥 DEBUG: Obtener información de la cola
function getNotificationQueueDebug() {
  return {
    queueSize: notificationQueue.size,
    processingQueue: processingQueue,
    dbReady: dbReady,
    dbExists: !!db,
    dbConnected: !!(db && !db.closed),
    notifications: Array.from(notificationQueue.values()).map((item) => ({
      id: item.id,
      title: item.title,
      scheduledFor:
        item.scheduledTime && !isNaN(item.scheduledTime)
          ? new Date(item.scheduledTime).toLocaleString()
          : "Invalid Date",
      remainingMs:
        item.scheduledTime && !isNaN(item.scheduledTime) ? Math.max(0, item.scheduledTime - Date.now()) : NaN,
      processed: item.processed || false,
      retryCount: item.retryCount || 0,
      createdAt: new Date(item.createdAt || Date.now()).toLocaleString(),
      isValid: !!(item.scheduledTime && !isNaN(item.scheduledTime)),
    })),
  };
}

// 🔥 FUNCIONES GLOBALES PARA DEBUG
self.getNotificationQueueDebug = getNotificationQueueDebug;

self.forceProcessQueue = () => {
  console.log("🔄 SW: Forzando procesamiento de cola manual");
  return processNotificationQueue();
};

self.clearNotificationQueue = () => {
  console.log("🧹 SW: Limpiando cola manualmente");
  notificationQueue.clear();
  return Promise.resolve();
};

self.forceReinitDB = async () => {
  console.log("🔄 SW: Forzando reinicialización manual de BD");
  dbReady = false;
  if (db) {
    db.close();
  }
  db = null;
  return await ensureDatabaseReady();
};

self.clearInvalidNotifications = () => {
  console.log("🧹 SW: Limpiando solo notificaciones inválidas");
  let cleaned = 0;

  for (const [id, notification] of notificationQueue) {
    if (!notification.scheduledTime || isNaN(notification.scheduledTime)) {
      notificationQueue.delete(id);
      deleteNotificationFromDB(id);
      cleaned++;
    }
  }

  console.log(\`✅ SW: \${cleaned} notificaciones inválidas limpiadas\`);
  return Promise.resolve(cleaned);
};

// 🔥 NUEVO: Función para procesar inmediatamente notificaciones vencidas
self.forceProcessExpired = async () => {
  console.log("🚨 SW: Forzando procesamiento de notificaciones vencidas");
  const now = Date.now();
  let processed = 0;

  for (const [id, notification] of notificationQueue) {
    if (notification.scheduledTime <= now && !notification.processed) {
      try {
        await registration.showNotification(notification.title, {
          body: notification.body,
          icon: notification.icon,
          badge: notification.badge,
          tag: notification.tag,
          requireInteraction: true,
          vibrate: notification.vibrate,
          data: notification.data,
        });

        notification.processed = true;
        processed++;
        console.log(\`✅ SW: Notificación vencida procesada: \${id}\`);
      } catch (error) {
        console.error(\`❌ SW: Error procesando notificación vencida \${id}:\`, error);
      }
    }
  }

  console.log(\`✅ SW: \${processed} notificaciones vencidas procesadas\`);
  return processed;
};

// Manejar clicks en notificaciones
self.addEventListener("notificationclick", (event) => {
  console.log("🔔 SW: Notificación clickeada:", event.notification.tag);

  event.notification.close();

  // Enviar evento a la aplicación
  self.clients.matchAll().then((clients) => {
    if (clients.length > 0) {
      clients[0].postMessage({
        type: "NOTIFICATION_CLICKED",
        tag: event.notification.tag,
        data: event.notification.data,
      });
    }
  });

  // Abrir la aplicación
  event.waitUntil(self.clients.openWindow("/"));
});

console.log("🚀 SW: Service Worker COMPLETO cargado");
console.log("🔧 SW: Funciones debug disponibles:");
console.log("  - self.getNotificationQueueDebug()");
console.log("  - self.forceProcessQueue()");
console.log("  - self.clearNotificationQueue()");
console.log("  - self.forceReinitDB()");
console.log("  - self.clearInvalidNotifications()");
console.log("  - self.forceProcessExpired() // 🔥 NUEVO");

// Verificación inicial con auto-limpieza
setTimeout(async () => {
  await ensureDatabaseReady();

  // Auto-limpiar notificaciones inválidas al iniciar
  if (typeof self.clearInvalidNotifications === "function") {
    const cleaned = await self.clearInvalidNotifications();
    if (cleaned > 0) {
      console.log(\`🧹 SW: Auto-limpieza inicial: \${cleaned} notificaciones inválidas removidas\`);
    }
  }

  console.log("📊 SW: Estado inicial:", {
    dbReady,
    dbExists: !!db,
    dbConnected: !!(db && !db.closed),
    queueSize: notificationQueue.size,
  });
}, 1000);`;

// Crear directorio public si no existe
const publicDir = path.join(__dirname, "public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log("✅ Directorio public/ creado");
}

// Crear archivo sw.js
const swPath = path.join(publicDir, "sw.js");
fs.writeFileSync(swPath, swContent);

console.log("✅ Service Worker convertido y creado exitosamente desde tu sw.js actual");
console.log("📍 Ubicación:", swPath);
console.log("📄 Tamaño:", swContent.length, "caracteres");
console.log("");
console.log("🎯 CARACTERÍSTICAS INCLUIDAS:");
console.log("  ✅ Tu código actual + procesamiento mejorado para PWA");
console.log("  ✅ Múltiples métodos de procesamiento (setInterval + recursivo + mensajes)");
console.log("  ✅ Keep-alive agresivo para PWA");
console.log("  ✅ Función startKeepAlive() añadida (que faltaba)");
console.log("  ✅ Todas las funciones debug disponibles");
console.log("");
console.log("🔧 MEJORAS AÑADIDAS PARA PWA:");
console.log("  - Procesamiento recursivo cada 5s");
console.log("  - Procesamiento por mensajes (1s después de añadir)");
console.log("  - Keep-alive agresivo cada 15s");
console.log("  - Keep-alive tradicional cada 25s");
console.log("");
console.log("🚀 ¡Listo para usar con notificaciones PWA funcionando!");
