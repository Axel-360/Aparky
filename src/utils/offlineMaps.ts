// src/utils/offlineMaps.ts
import { toast } from "sonner";

export interface MapArea {
  id: string;
  name: string;
  type: "country" | "region" | "city" | "custom";
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  zoomLevels: number[];
  provider: "osm" | "satellite" | "terrain";
  estimatedSize: string; // Tamaño estimado
  tileCount?: number;
  downloadedAt?: number;
}

// 🗺️ BASE DE DATOS DE ÁREAS PREDEFINIDAS
export const PREDEFINED_AREAS: Record<string, MapArea[]> = {
  // ESPAÑA
  spain: [
    {
      id: "spain-full",
      name: "España (completa)",
      type: "country",
      bounds: { north: 43.79, south: 36.0, east: 4.32, west: -9.3 },
      zoomLevels: [6, 7, 8, 9],
      provider: "osm",
      estimatedSize: "~800 MB",
    },
    {
      id: "madrid",
      name: "Madrid",
      type: "city",
      bounds: { north: 40.65, south: 40.3, east: -3.5, west: -3.9 },
      zoomLevels: [13, 14, 15, 16, 17], // Zoom aumentado para ver calles mejor
      provider: "osm",
      estimatedSize: "~300 MB", // Aumentado por más zoom
    },
    {
      id: "barcelona",
      name: "Barcelona",
      type: "city",
      bounds: { north: 41.47, south: 41.32, east: 2.23, west: 2.05 },
      zoomLevels: [13, 14, 15, 16, 17], // Zoom aumentado
      provider: "osm",
      estimatedSize: "~280 MB",
    },
    {
      id: "valencia",
      name: "Valencia",
      type: "city",
      bounds: { north: 39.52, south: 39.42, east: -0.32, west: -0.42 },
      zoomLevels: [13, 14, 15, 16, 17], // Zoom aumentado
      provider: "osm",
      estimatedSize: "~200 MB",
    },
    {
      id: "sevilla",
      name: "Sevilla",
      type: "city",
      bounds: { north: 37.44, south: 37.33, east: -5.92, west: -6.02 },
      zoomLevels: [13, 14, 15, 16, 17],
      provider: "osm",
      estimatedSize: "~180 MB",
    },
    {
      id: "malaga",
      name: "Málaga",
      type: "city",
      bounds: { north: 36.76, south: 36.68, east: -4.38, west: -4.48 },
      zoomLevels: [13, 14, 15, 16, 17],
      provider: "osm",
      estimatedSize: "~150 MB",
    },
    {
      id: "bilbao",
      name: "Bilbao",
      type: "city",
      bounds: { north: 43.28, south: 43.23, east: -2.9, west: -3.0 },
      zoomLevels: [13, 14, 15, 16, 17],
      provider: "osm",
      estimatedSize: "~130 MB",
    },
    {
      id: "andalucia",
      name: "Andalucía",
      type: "region",
      bounds: { north: 38.73, south: 36.0, east: -1.63, west: -7.52 },
      zoomLevels: [8, 9, 10, 11, 12],
      provider: "osm",
      estimatedSize: "~500 MB",
    },
    {
      id: "cataluna",
      name: "Cataluña",
      type: "region",
      bounds: { north: 42.86, south: 40.52, east: 3.33, west: 0.16 },
      zoomLevels: [8, 9, 10, 11, 12],
      provider: "osm",
      estimatedSize: "~400 MB",
    },
    {
      id: "pais-vasco",
      name: "País Vasco",
      type: "region",
      bounds: { north: 43.42, south: 42.44, east: -1.73, west: -3.4 },
      zoomLevels: [9, 10, 11, 12, 13],
      provider: "osm",
      estimatedSize: "~150 MB",
    },
  ],

  // FRANCIA
  france: [
    {
      id: "france-full",
      name: "Francia (completa)",
      type: "country",
      bounds: { north: 51.1, south: 41.3, east: 9.6, west: -5.2 },
      zoomLevels: [6, 7, 8, 9],
      provider: "osm",
      estimatedSize: "~900 MB",
    },
    {
      id: "paris",
      name: "París",
      type: "city",
      bounds: { north: 48.9, south: 48.82, east: 2.42, west: 2.22 },
      zoomLevels: [13, 14, 15, 16, 17],
      provider: "osm",
      estimatedSize: "~220 MB",
    },
    {
      id: "marseille",
      name: "Marsella",
      type: "city",
      bounds: { north: 43.36, south: 43.26, east: 5.42, west: 5.32 },
      zoomLevels: [13, 14, 15, 16, 17],
      provider: "osm",
      estimatedSize: "~150 MB",
    },
    {
      id: "lyon",
      name: "Lyon",
      type: "city",
      bounds: { north: 45.8, south: 45.72, east: 4.88, west: 4.78 },
      zoomLevels: [13, 14, 15, 16, 17],
      provider: "osm",
      estimatedSize: "~140 MB",
    },
  ],

  // PORTUGAL
  portugal: [
    {
      id: "portugal-full",
      name: "Portugal (completo)",
      type: "country",
      bounds: { north: 42.15, south: 36.96, east: -6.19, west: -9.5 },
      zoomLevels: [7, 8, 9, 10],
      provider: "osm",
      estimatedSize: "~400 MB",
    },
    {
      id: "lisboa",
      name: "Lisboa",
      type: "city",
      bounds: { north: 38.8, south: 38.69, east: -9.09, west: -9.23 },
      zoomLevels: [13, 14, 15, 16, 17],
      provider: "osm",
      estimatedSize: "~160 MB",
    },
    {
      id: "porto",
      name: "Oporto",
      type: "city",
      bounds: { north: 41.18, south: 41.13, east: -8.57, west: -8.67 },
      zoomLevels: [13, 14, 15, 16, 17],
      provider: "osm",
      estimatedSize: "~120 MB",
    },
  ],

  // ITALIA
  italy: [
    {
      id: "italy-full",
      name: "Italia (completa)",
      type: "country",
      bounds: { north: 47.09, south: 36.65, east: 18.52, west: 6.63 },
      zoomLevels: [6, 7, 8, 9],
      provider: "osm",
      estimatedSize: "~850 MB",
    },
    {
      id: "roma",
      name: "Roma",
      type: "city",
      bounds: { north: 41.97, south: 41.8, east: 12.58, west: 12.38 },
      zoomLevels: [13, 14, 15, 16, 17],
      provider: "osm",
      estimatedSize: "~200 MB",
    },
    {
      id: "milano",
      name: "Milán",
      type: "city",
      bounds: { north: 45.53, south: 45.41, east: 9.28, west: 9.08 },
      zoomLevels: [13, 14, 15, 16, 17],
      provider: "osm",
      estimatedSize: "~180 MB",
    },
  ],

  // ALEMANIA
  germany: [
    {
      id: "germany-full",
      name: "Alemania (completa)",
      type: "country",
      bounds: { north: 55.06, south: 47.27, east: 15.04, west: 5.87 },
      zoomLevels: [6, 7, 8, 9],
      provider: "osm",
      estimatedSize: "~1 GB",
    },
    {
      id: "berlin",
      name: "Berlín",
      type: "city",
      bounds: { north: 52.68, south: 52.34, east: 13.76, west: 13.09 },
      zoomLevels: [13, 14, 15, 16, 17],
      provider: "osm",
      estimatedSize: "~250 MB",
    },
    {
      id: "munich",
      name: "Múnich",
      type: "city",
      bounds: { north: 48.25, south: 48.06, east: 11.72, west: 11.36 },
      zoomLevels: [13, 14, 15, 16, 17],
      provider: "osm",
      estimatedSize: "~180 MB",
    },
  ],

  // REINO UNIDO
  uk: [
    {
      id: "uk-full",
      name: "Reino Unido (completo)",
      type: "country",
      bounds: { north: 60.86, south: 49.86, east: 1.76, west: -8.65 },
      zoomLevels: [6, 7, 8, 9],
      provider: "osm",
      estimatedSize: "~950 MB",
    },
    {
      id: "london",
      name: "Londres",
      type: "city",
      bounds: { north: 51.69, south: 51.38, east: 0.33, west: -0.51 },
      zoomLevels: [13, 14, 15, 16, 17],
      provider: "osm",
      estimatedSize: "~280 MB",
    },
  ],
};

export class OfflineMapManager {
  private dbName = "aparky-offline-maps";
  private dbVersion = 2;
  private db: IDBDatabase | null = null;
  private downloadAbortController: AbortController | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store para tiles
        if (!db.objectStoreNames.contains("tiles")) {
          const tilesStore = db.createObjectStore("tiles", { keyPath: "url" });
          tilesStore.createIndex("provider", "provider", { unique: false });
          tilesStore.createIndex("areaId", "areaId", { unique: false });
          tilesStore.createIndex("downloadedAt", "downloadedAt", { unique: false });
        }

        // Store para áreas descargadas
        if (!db.objectStoreNames.contains("areas")) {
          db.createObjectStore("areas", { keyPath: "id" });
        }
      };
    });
  }

  async downloadArea(
    area: MapArea,
    onProgress?: (progress: number, currentTile: number, totalTiles: number) => void
  ): Promise<void> {
    if (!this.db) await this.init();

    this.downloadAbortController = new AbortController();
    const tiles = this.generateTileUrls(area);
    const totalTiles = tiles.length;
    let downloadedTiles = 0;
    let failedTiles = 0;

    console.log(`📥 Iniciando descarga de ${totalTiles} tiles para ${area.name}`);
    toast.info(`Descargando ${area.name}... 0%`, { id: "download-progress" });

    // Descargar en lotes para no saturar la red
    const BATCH_SIZE = 10;
    const DELAY_BETWEEN_BATCHES = 500; // ms

    for (let i = 0; i < tiles.length; i += BATCH_SIZE) {
      // Verificar si se canceló la descarga
      if (this.downloadAbortController.signal.aborted) {
        toast.error("Descarga cancelada");
        throw new Error("Download cancelled");
      }

      const batch = tiles.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (tileUrl) => {
          try {
            await this.downloadTile(tileUrl, area.provider, area.id);
            downloadedTiles++;

            if (onProgress) {
              const progress = (downloadedTiles / totalTiles) * 100;
              onProgress(progress, downloadedTiles, totalTiles);

              // Actualizar toast cada 5%
              if (downloadedTiles % Math.ceil(totalTiles / 20) === 0) {
                toast.info(`Descargando ${area.name}... ${Math.round(progress)}%`, { id: "download-progress" });
              }
            }
          } catch (error) {
            failedTiles++;
            console.error(`Error descargando tile: ${tileUrl}`, error);
          }
        })
      );

      // Pequeña pausa entre lotes para no saturar
      if (i + BATCH_SIZE < tiles.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    // Guardar información del área
    area.downloadedAt = Date.now();
    area.tileCount = downloadedTiles;
    await this.saveArea(area);

    toast.success(`✅ ${area.name} descargado: ${downloadedTiles} tiles (${failedTiles} fallidos)`, {
      id: "download-progress",
      duration: 5000,
    });

    console.log(`✅ Descarga completada: ${downloadedTiles}/${totalTiles} tiles`);
  }

  cancelDownload(): void {
    if (this.downloadAbortController) {
      this.downloadAbortController.abort();
      this.downloadAbortController = null;
      toast.info("Cancelando descarga...");
    }
  }

  private generateTileUrls(area: MapArea): string[] {
    const urls: string[] = [];
    const { north, south, east, west } = area.bounds;

    for (const zoom of area.zoomLevels) {
      const tiles = this.getTilesInBounds(north, south, east, west, zoom);

      for (const tile of tiles) {
        const url = this.getTileUrl(tile.x, tile.y, zoom, area.provider);
        urls.push(url);
      }
    }

    return urls;
  }

  private getTilesInBounds(
    north: number,
    south: number,
    east: number,
    west: number,
    zoom: number
  ): Array<{ x: number; y: number }> {
    const tiles: Array<{ x: number; y: number }> = [];

    const nwTile = this.latLngToTile(north, west, zoom);
    const seTile = this.latLngToTile(south, east, zoom);

    for (let x = Math.min(nwTile.x, seTile.x); x <= Math.max(nwTile.x, seTile.x); x++) {
      for (let y = Math.min(nwTile.y, seTile.y); y <= Math.max(nwTile.y, seTile.y); y++) {
        tiles.push({ x, y });
      }
    }

    return tiles;
  }

  private latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
    const n = 2 ** zoom;
    const x = Math.floor(((lng + 180) / 360) * n);
    const latRad = (lat * Math.PI) / 180;
    const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);

    return { x, y };
  }

  private getTileUrl(x: number, y: number, z: number, provider: string): string {
    switch (provider) {
      case "osm":
        // Usar múltiples servidores de OSM (a, b, c)
        const server = ["a", "b", "c"][Math.floor(Math.random() * 3)];
        return `https://${server}.tile.openstreetmap.org/${z}/${x}/${y}.png`;

      case "satellite":
        return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;

      case "terrain":
        return `https://stamen-tiles.a.ssl.fastly.net/terrain/${z}/${x}/${y}.png`;

      default:
        return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    }
  }

  private async downloadTile(url: string, provider: string, areaId: string): Promise<void> {
    try {
      const response = await fetch(url, {
        signal: this.downloadAbortController?.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction(["tiles"], "readwrite");
        const store = transaction.objectStore("tiles");

        const request = store.put({
          url,
          provider,
          areaId,
          blob,
          downloadedAt: Date.now(),
        });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw error; // Propagar cancelación
      }
      // Ignorar otros errores (tile no disponible, etc.)
    }
  }

  async getTile(url: string): Promise<Blob | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["tiles"], "readonly");
      const store = transaction.objectStore("tiles");
      const request = store.get(url);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.blob : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getDownloadedAreas(): Promise<MapArea[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["areas"], "readonly");
      const store = transaction.objectStore("areas");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async saveArea(area: MapArea): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["areas"], "readwrite");
      const store = transaction.objectStore("areas");
      const request = store.put(area);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteArea(areaId: string): Promise<void> {
    if (!this.db) await this.init();

    // Eliminar el área
    await new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(["areas"], "readwrite");
      const store = transaction.objectStore("areas");
      const request = store.delete(areaId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Eliminar todos los tiles de esa área
    await new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(["tiles"], "readwrite");
      const store = transaction.objectStore("tiles");
      const index = store.index("areaId");
      const request = index.openCursor(IDBKeyRange.only(areaId));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getStorageUsage(): Promise<{ used: number; available: number; percentage: number }> {
    if ("storage" in navigator && "estimate" in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const available = estimate.quota || 0;
      const percentage = available > 0 ? (used / available) * 100 : 0;

      return { used, available, percentage };
    }
    return { used: 0, available: 0, percentage: 0 };
  }

  async clearAllMaps(): Promise<void> {
    if (!this.db) await this.init();

    // Eliminar todas las áreas
    await new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(["areas"], "readwrite");
      const store = transaction.objectStore("areas");
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Eliminar todos los tiles
    await new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(["tiles"], "readwrite");
      const store = transaction.objectStore("tiles");
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    toast.success("Todos los mapas offline eliminados");
  }
}

export const offlineMapManager = new OfflineMapManager();
