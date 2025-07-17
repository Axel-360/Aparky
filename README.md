# 🚗 Aparky - Encuentra tu Coche

> **Aplicación Web Progresiva (PWA)** para guardar y encontrar fácilmente donde aparcaste tu vehículo

## ✨ **Características Principales**

- 📍 **Guardar ubicación automática** con GPS
- 🗺️ **Mapa interactivo** con OpenStreetMap
- ⏰ **Temporizadores de parking** con notificaciones
- 📱 **PWA completa** - funciona sin conexión
- 🔔 **Notificaciones background** cuando expira el parking
- 📸 **Fotos de referencia** para recordar mejor
- 📊 **Estadísticas de uso** y historial
- 🎯 **Búsqueda por proximidad** para encontrar tu coche
- 💰 **Control de costes** de aparcamiento

## 🚀 **Tecnologías**

- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS 4.1 + shadcn/ui
- **Build**: Vite 6.3
- **Maps**: Leaflet + OpenStreetMap
- **PWA**: Service Worker + Workbox
- **Storage**: LocalStorage + IndexedDB

## 🏗️ **Estructura del Proyecto**

```
src/
├── features/           # Funcionalidades por dominio
│   ├── location/      # Gestión de ubicaciones
│   ├── parking/       # Temporizadores y parking
│   ├── navigation/    # Navegación y rutas
│   └── photo/         # Captura de fotos
├── components/        # Componentes globales
│   ├── PWA/          # Componentes PWA
│   └── ui/           # Sistema de diseño
├── hooks/            # Hooks reutilizables
├── utils/            # Servicios y utilidades
└── types/            # Definiciones TypeScript
```

## 🛠️ **Instalación y Desarrollo**

### **Prerrequisitos**

- Node.js 18+
- npm o yarn

### **Configuración Local**

```bash
# Clonar e instalar
git clone [tu-repo]
cd aparky
npm install

# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview
```

### **URLs de Desarrollo**

- **App**: http://localhost:3000
- **PWA**: Se registra automáticamente
- **HTTPS**: No necesario en desarrollo

## 📱 **Funcionalidades PWA**

### **Instalación**

- ✅ Instalable desde el navegador
- ✅ Icono en pantalla de inicio
- ✅ Funciona sin conexión
- ✅ Notificaciones push

### **Notificaciones**

- 🔔 Avisos cuando expira el parking
- 📱 Funciona en background
- 🍎 Compatible con iOS y Android
- ⚡ Sistema de cola robusto

## 🎯 **Casos de Uso**

1. **Parking Rápido**

   - Abrir app → Guardar ubicación → Listo

2. **Parking con Tiempo**

   - Guardar ubicación → Configurar timer → Recibir notificación

3. **Buscar Coche**

   - Abrir app → Ver mapa → Navegar hasta el coche

4. **Gestión Completa**
   - Fotos, notas, costes, historial

## 🔧 **Configuración**

### **Permisos Necesarios**

- 📍 **Ubicación**: Para GPS automático
- 🔔 **Notificaciones**: Para avisos de tiempo
- 📸 **Cámara**: Para fotos opcionales

### **Almacenamiento**

- **LocalStorage**: Ubicaciones y preferencias
- **IndexedDB**: Cola de notificaciones
- **Cache**: Mapas y recursos sin conexión

## 📊 **Performance**

- ⚡ **Primera carga**: <2s
- 🗺️ **Mapas**: Cache agresivo
- 💾 **Sin conexión**: Funcionalidad completa
- 🔄 **Sync**: Automática al reconectar

## 🧪 **Testing**

```bash
# Linting
npm run lint

# Verificar tipos
npm run type-check

# Build test
npm run build
```

## 🚀 **Deployment**

### **Build de Producción**

```bash
npm run build:deploy
```

### **Archivos Generados**

- `dist/` - Aplicación optimizada
- `sw.js` - Service Worker
- `manifest.json` - Metadatos PWA

### **Recomendaciones**

- ✅ HTTPS obligatorio para PWA
- ✅ Configurar headers de cache
- ✅ Verificar manifest.json

## 🐛 **Troubleshooting**

### **Problemas Comunes**

**GPS no funciona**

- Verificar permisos de ubicación
- Usar HTTPS en producción

**Notificaciones no llegan**

- Verificar permisos de notificación
- Comprobar que PWA esté instalada

**App no funciona sin conexión**

- Verificar Service Worker registrado
- Limpiar cache del navegador

### **Debug**

```javascript
// En consola del navegador
window.timerManager?.getDebugInfo();
```

## 📝 **Roadmap**

- [ ] 🗺️ Múltiples servicios de mapas
- [ ] 🔄 Sincronización en la nube
- [ ] 📈 Analytics avanzado
- [ ] 🎨 Temas personalizables
- [ ] 🌍 Multi-idioma

## 👨‍💻 **Autor**

**David Rovira**

- Aplicación creada con ❤️
- Especializada en PWA y geolocalización

## 📄 **Licencia**

Proyecto personal - Todos los derechos reservados

---

_¿Perdiste tu coche? ¡Aparky te ayuda a encontrarlo! 🚗✨_
