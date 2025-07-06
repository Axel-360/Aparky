// post-build.cjs - Script para reemplazar SW generado (CommonJS)
const fs = require("fs");
const path = require("path");

console.log("🔄 === REEMPLAZANDO SERVICE WORKER ===");

try {
  // Rutas
  const customSWPath = path.join(__dirname, "public", "sw.js");
  const distSWPath = path.join(__dirname, "dist", "sw.js");
  const distDir = path.join(__dirname, "dist");

  // Verificar que existe public/sw.js
  if (!fs.existsSync(customSWPath)) {
    console.error("❌ Error: No se encuentra public/sw.js");
    console.log("💡 Ejecuta primero: npm run create-sw");
    process.exit(1);
  }

  // Verificar que existe dist/
  if (!fs.existsSync(distDir)) {
    console.error("❌ Error: No se encuentra el directorio dist/");
    console.log("💡 El build de Vite no se completó correctamente");
    process.exit(1);
  }

  // Leer contenido del SW personalizado
  const customSWContent = fs.readFileSync(customSWPath, "utf8");

  // Verificar contenido
  console.log("📄 SW personalizado:");
  console.log("  - Tamaño:", customSWContent.length, "caracteres");
  console.log("  - Contiene processNotificationQueue:", customSWContent.includes("processNotificationQueue"));
  console.log("  - Contiene SCHEDULE_NOTIFICATION:", customSWContent.includes("SCHEDULE_NOTIFICATION"));

  // Verificar si ya existe SW en dist (generado por VitePWA)
  if (fs.existsSync(distSWPath)) {
    const generatedSW = fs.readFileSync(distSWPath, "utf8");
    console.log("📄 SW generado por VitePWA encontrado:");
    console.log("  - Tamaño:", generatedSW.length, "caracteres");
    console.log("  - Contiene Workbox:", generatedSW.includes("workbox"));
    console.log("🔄 Reemplazando con SW personalizado...");
  } else {
    console.log("📄 No se encontró SW generado, creando uno nuevo...");
  }

  // Reemplazar con el SW personalizado
  fs.writeFileSync(distSWPath, customSWContent);

  console.log("✅ SW personalizado copiado a dist/sw.js");

  // Verificar que se copió correctamente
  const copiedSW = fs.readFileSync(distSWPath, "utf8");
  if (copiedSW === customSWContent) {
    console.log("✅ Verificación: El contenido coincide perfectamente");
  } else {
    console.log("❌ Error: El contenido no coincide");
    process.exit(1);
  }

  // Verificar funciones críticas
  if (copiedSW.includes("processNotificationQueue") && copiedSW.includes("SCHEDULE_NOTIFICATION")) {
    console.log("✅ El SW tiene todas las funciones necesarias para notificaciones background");
  } else {
    console.log("❌ El SW NO tiene las funciones necesarias");
    process.exit(1);
  }

  console.log("🎉 ¡SW personalizado listo para deploy!");
  console.log("📍 Ubicación final: dist/sw.js");
  console.log("🚀 Tu app ahora soporta notificaciones background");
} catch (error) {
  console.error("❌ Error en post-build:", error.message);
  process.exit(1);
}
