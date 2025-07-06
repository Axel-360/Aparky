// create-sw.cjs - Script FINAL para crear el Service Worker robusto anti-dormirse
const fs = require("fs");
const path = require("path");

const swContent = `// public/sw.js - Service Worker DEFINITIVO que nunca pierde la BD
const CACHE_NAME = "aparky-v7-auto-reinit-" + Date.now();
const NOTIFICATION_DB_NAME = "NotificationQueueDB";

// Cola de notificaciones en memoria
let notificationQueue = new Map();
let processingQueue = false;
let keepAliveInterval;
let dbReady = false;
let db = null;

console.log("🚀 SW: Service Worker ROBUSTO cargando...");

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

// 🔥 NUEVO: Función para verificar y reinicializar BD automáticamente
async function ensureDatabaseReady() {
  if (dbReady && db) {
    return true; // Ya está lista
  }

  console.log("⚠️ SW: BD no lista, reinicializando automáticamente...");
  
  try {
    await initializeDatabase();
    return dbReady && db;
  } catch (error) {
    console.error("❌ SW: Error reinicializando BD:", error);
    return false;
  }
}

// 🔥 CORREGIDO: Inicializar base de datos con más robustez
async function initializeDatabase() {
  return new Promise((resolve) => {
    console.log("🔄 SW: Inicializando base de datos...");

    const request = indexedDB.open(NOTIFICATION_DB_NAME, 2);

    request.onerror = function (event) {
      console.error("❌ SW: Error abriendo base de datos:", event.target.error);
      dbReady = false;
      db = null;
      resolve(); // No fallar el activate, continuar sin DB
    };

    request.onsuccess = function (event) {
      db = event.target.result;
      dbReady = true;
      console.log("✅ SW: Base de datos inicializada correctamente");
      
      // 🔥 NUEVO: Manejar errores de la BD en tiempo de ejecución
      db.onerror = function(event) {
        console.error("❌ SW: Error de BD en runtime:", event.target.error);
        dbReady = false;
        db = null;
      };
      
      db.onclose = function() {
        console.warn("⚠️ SW: BD cerrada inesperadamente");
        dbReady = false;
        db = null;
      };
      
      resolve();
    };

    request.onupgradeneeded = function (event) {
      console.log("🔧 SW: Creando schema de base de datos...");
      const database = event.target.result;

      if (!database.objectStoreNames.contains("notifications")) {
        const store = database.createObjectStore("notifications", { keyPath: "id" });
        store.createIndex("scheduledTime", "scheduledTime", { unique: false });
        store.createIndex("status", "status", { unique: false });
        console.log("✅ SW: Object store 'notifications' creado");
      }
    };
  });
}

// 🔥 MEJORADO: Guardar con verificación automática de BD
async function saveNotificationQueue(notification) {
  // 🔥 NUEVO: Verificar BD antes de usar
  const isReady = await ensureDatabaseReady();
  
  if (!isReady) {
    console.warn("⚠️ SW: No se pudo reinicializar BD, saltando guardado");
    return false;
  }

  try {
    const transaction = db.transaction(["notifications"], "readwrite");
    const store = transaction.objectStore("notifications");
    const request = store.put(notification);

    return new Promise((resolve) => {
      request.onsuccess = () => {
        console.log(\`💾 SW: Notificación guardada en BD: \${notification.id}\`);
        resolve(true);
      };

      request.onerror = () => {
        console.error(\`❌ SW: Error guardando notificación: \${request.error}\`);
        // 🔥 NUEVO: Si falla, marcar BD como no lista para reinicializar
        dbReady = false;
        db = null;
        resolve(false);
      };
    });
  } catch (error) {
    console.error("❌ SW: Error en saveNotificationQueue:", error);
    // 🔥 NUEVO: Resetear BD en caso de error
    dbReady = false;
    db = null;
    return false;
  }
}

// 🔥 MEJORADO: Restaurar con verificación automática
async function restoreNotificationQueue() {
  const isReady = await ensureDatabaseReady();
  
  if (!isReady) {
    console.warn("⚠️ SW: BD no disponible para restaurar");
    return;
  }

  try {
    const transaction = db.transaction(["notifications"], "readonly");
    const store = transaction.objectStore("notifications");
    const request = store.getAll();

    request.onsuccess = () => {
      const notifications = request.result || [];
      const now = Date.now();

      let restoredCount = 0;
      notifications.forEach((notification) => {
        if (notification.scheduledTime > now && !notification.processed) {
          notificationQueue.set(notification.id, notification);
          restoredCount++;
        }
      });

      console.log(\`🔄 SW: \${restoredCount} notificaciones restauradas de BD\`);
    };

    request.onerror = () => {
      console.error("❌ SW: Error restaurando notificaciones:", request.error);
      dbReady = false;
      db = null;
    };
  } catch (error) {
    console.error("❌ SW: Error en restoreNotificationQueue:", error);
    dbReady = false;
    db = null;
  }
}

// 🔥 MEJORADO: Keep alive que también verifica BD
function startKeepAlive() {
  if (keepAliveInterval) clearInterval(keepAliveInterval);

  keepAliveInterval = setInterval(async () => {
    console.log("💓 SW: Keep-alive ping");

    // 🔥 NUEVO: Verificar BD en cada keep-alive
    const isReady = await ensureDatabaseReady();
    if (!isReady) {
      console.warn("⚠️ SW: BD no disponible en keep-alive");
    }

    if (notificationQueue.size > 0) {
      processNotificationQueue();
    }
  }, 25000);
}

// Procesador de cola (sin cambios)
async function startQueueProcessor() {
  if (processingQueue) return;

  console.log("⏰ SW: Iniciando procesador de cola");
  processNotificationQueue();

  setInterval(() => {
    if (notificationQueue.size > 0) {
      processNotificationQueue();
    }
  }, 10000);
}

// Procesar cola (sin cambios mayores)
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

  console.log(\`🔄 SW: Procesando \${notificationQueue.size} notificaciones...\`);

  try {
    for (const [id, notification] of notificationQueue) {
      if (notification.scheduledTime <= now && !notification.processed) {
        console.log(\`🔔 SW: Ejecutando notificación: \${id}\`);

        try {
          await self.registration.showNotification(notification.title, {
            body: notification.body,
            icon: notification.icon || "/icons/pwa-192x192.png",
            badge: notification.badge || "/icons/pwa-64x64.png",
            tag: notification.tag || notification.id,
            requireInteraction: notification.requireInteraction ?? true,
            vibrate: notification.vibrate || [300, 100, 300],
            timestamp: Date.now(),
            data: { id: notification.id, ...notification.data },
            actions: [
              { action: "open", title: "📱 Abrir", icon: "/icons/pwa-64x64.png" },
              { action: "dismiss", title: "❌ Cerrar", icon: "/icons/pwa-64x64.png" },
            ],
          });

          console.log(\`✅ SW: Notificación mostrada: \${id}\`);

          notification.processed = true;
          notification.executedAt = now;
          processed.push(id);

          // 🔥 MEJORADO: Guardar con verificación automática
          await saveNotificationQueue(notification);
        } catch (error) {
          console.error(\`❌ SW: Error mostrando notificación \${id}:\`, error);

          notification.retryCount = (notification.retryCount || 0) + 1;
          if (notification.retryCount < 3) {
            notification.scheduledTime = now + 30000;
            console.log(\`🔄 SW: Reintentando \${id} en 30s (intento \${notification.retryCount})\`);
          } else {
            notification.processed = true;
            notification.failed = true;
            processed.push(id);
            console.error(\`❌ SW: Notificación \${id} falló después de 3 intentos\`);
          }
        }
      }
    }

    processed.forEach((id) => {
      notificationQueue.delete(id);
      console.log(\`🧹 SW: Notificación \${id} removida de cola\`);
    });

    if (processed.length > 0) {
      console.log(\`✅ SW: \${processed.length} notificaciones procesadas\`);
    }
  } catch (error) {
    console.error("❌ SW: Error en processNotificationQueue:", error);
  } finally {
    processingQueue = false;
  }
}

// 🔥 MEJORADO: Manejar mensajes con verificación de BD
self.addEventListener("message", async (event) => {
  const { type, ...data } = event.data;

  console.log(\`📨 SW: Mensaje recibido: \${type}\`, data);

  switch (type) {
    case "SCHEDULE_NOTIFICATION":
      console.log(
        \`📅 SW: Programando notificación: \${data.id} para \${new Date(data.scheduledTime).toLocaleTimeString()}\`
      );

      // Añadir a cola en memoria
      notificationQueue.set(data.id, {
        ...data,
        processed: false,
        createdAt: Date.now(),
      });

      // 🔥 MEJORADO: Guardar con verificación automática
      const saved = await saveNotificationQueue(notificationQueue.get(data.id));
      if (saved) {
        console.log(\`✅ SW: Notificación \${data.id} guardada y programada\`);
      } else {
        console.warn(\`⚠️ SW: Notificación \${data.id} programada solo en memoria\`);
      }

      if (data.scheduledTime <= Date.now()) {
        processNotificationQueue();
      }
      break;

    case "CANCEL_NOTIFICATION":
      const removed = notificationQueue.delete(data.id);
      if (removed) {
        console.log(\`❌ SW: Notificación cancelada: \${data.id}\`);

        // Intentar remover de BD
        const isReady = await ensureDatabaseReady();
        if (isReady && db) {
          try {
            const transaction = db.transaction(["notifications"], "readwrite");
            const store = transaction.objectStore("notifications");
            store.delete(data.id);
          } catch (error) {
            console.error("Error removiendo de BD:", error);
          }
        }
      }
      break;

    case "DEBUG_INFO":
      const debugInfo = getNotificationQueueDebug();
      console.log("🔍 SW: Debug Info:", debugInfo);

      event.source?.postMessage({
        type: "QUEUE_STATUS",
        data: debugInfo,
      });
      break;

    case "CLEAR_ALL_NOTIFICATIONS":
      notificationQueue.clear();
      console.log("🧹 SW: Todas las notificaciones limpiadas");

      const isReady = await ensureDatabaseReady();
      if (isReady && db) {
        try {
          const transaction = db.transaction(["notifications"], "readwrite");
          const store = transaction.objectStore("notifications");
          store.clear();
        } catch (error) {
          console.error("Error limpiando BD:", error);
        }
      }
      break;

    // 🔥 NUEVO: Comando para forzar reinicialización manual
    case "FORCE_REINIT_DB":
      console.log("🔄 SW: Forzando reinicialización de BD...");
      dbReady = false;
      db = null;
      const reinitResult = await ensureDatabaseReady();
      console.log("🔄 SW: Resultado reinicialización:", reinitResult);
      
      event.source?.postMessage({
        type: "REINIT_RESULT",
        success: reinitResult
      });
      break;

    default:
      console.log(\`📨 SW: Mensaje no reconocido: \${type}\`);
  }
});

// Eventos de notificación (sin cambios)
self.addEventListener("notificationclick", (event) => {
  console.log("🔔 SW: Notificación clickeada:", event.notification.tag);
  event.notification.close();

  if (event.action === "open" || !event.action) {
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        for (const client of clients) {
          if (client.url.includes(self.registration.scope) && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow("/");
        }
      })
    );
  }

  if (event.notification.tag) {
    notificationQueue.delete(event.notification.tag);
  }
});

self.addEventListener("notificationclose", (event) => {
  console.log("🔔 SW: Notificación cerrada:", event.notification.tag);
  if (event.notification.tag) {
    notificationQueue.delete(event.notification.tag);
  }
});

// 🔥 MEJORADO: Debug con estado de BD
function getNotificationQueueDebug() {
  return {
    queueSize: notificationQueue.size,
    processingQueue,
    dbReady,
    dbExists: !!db,
    dbConnected: !!(db && !db.closed), // 🔥 NUEVO: Verificar conexión
    notifications: Array.from(notificationQueue.values()).map((item) => ({
      id: item.id,
      title: item.title,
      scheduledFor: new Date(item.scheduledTime).toLocaleString(),
      remainingMs: Math.max(0, item.scheduledTime - Date.now()),
      processed: item.processed || false,
      retryCount: item.retryCount || 0,
      createdAt: new Date(item.createdAt || Date.now()).toLocaleString(),
    })),
  };
}

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

// 🔥 NUEVO: Función para reinicializar BD manualmente
self.forceReinitDB = async () => {
  console.log("🔄 SW: Forzando reinicialización manual de BD");
  dbReady = false;
  db = null;
  return await ensureDatabaseReady();
};

console.log("🚀 SW: Service Worker ROBUSTO completamente cargado");
console.log("🔧 SW: Funciones debug disponibles:");
console.log("  - self.getNotificationQueueDebug()");
console.log("  - self.forceProcessQueue()");
console.log("  - self.clearNotificationQueue()");
console.log("  - self.forceReinitDB() // 🔥 NUEVO");

// 🔥 NUEVO: Log de estado inicial con verificación
setTimeout(async () => {
  await ensureDatabaseReady(); // Verificar BD al inicio
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

console.log("✅ Archivo public/sw.js ROBUSTO creado exitosamente");
console.log("📍 Ubicación:", swPath);
console.log("📄 Tamaño:", swContent.length, "caracteres");
console.log("🔥 Características NUEVAS:");
console.log("  - Auto-verifica BD antes de cada operación");
console.log("  - Se reinicializa automáticamente si detecta problemas");
console.log("  - Keep-alive que verifica BD cada 25 segundos");
console.log("  - Comando de emergencia FORCE_REINIT_DB");
console.log("  - Manejo de errores de BD en tiempo real");

// Verificar que el archivo existe
if (fs.existsSync(swPath)) {
  console.log("✅ Verificación: El archivo existe y es accesible");
  console.log("🎉 Ahora puedes ejecutar: npm run build");
  console.log("");
  console.log("🚀 Este SW NUNCA debería perder la base de datos!");
  console.log("💡 Si alguna vez falla, usa en consola:");
  console.log("   navigator.serviceWorker.ready.then(reg => reg.active.postMessage({type: 'FORCE_REINIT_DB'}))");
} else {
  console.log("❌ Error: El archivo no se creó correctamente");
}
