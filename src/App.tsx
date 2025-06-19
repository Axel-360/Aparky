// src/App.tsx
import { useState, useEffect } from "react";
import Map from "./components/ui/Map";
import LocationSaver from "./components/ui/LocationSaver";
import SavedLocations from "./components/ui/SavedLocations";
import type { CarLocation } from "./types/location";
import { getCarLocations } from "./utils/storage";
import "./App.css";

function App() {
  const [locations, setLocations] = useState<CarLocation[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.4168, -3.7038]);
  const [mapZoom, setMapZoom] = useState<number>(13);

  useEffect(() => {
    const savedLocations = getCarLocations();
    setLocations(savedLocations);

    // Si hay ubicaciones guardadas, centrar el mapa en la más reciente
    if (savedLocations.length > 0) {
      const lastLocation = savedLocations[0];
      setMapCenter([lastLocation.latitude, lastLocation.longitude]);
      setMapZoom(15);
    }
  }, []);

  const handleLocationSaved = (newLocation: CarLocation) => {
    setLocations((prev) => [newLocation, ...prev]);
    setMapCenter([newLocation.latitude, newLocation.longitude]);
    setMapZoom(15);
  };

  const handleLocationDeleted = (id: string) => {
    setLocations((prev) => prev.filter((location) => location.id !== id));
  };

  const handleLocationSelected = (location: CarLocation) => {
    setMapCenter([location.latitude, location.longitude]);
    setMapZoom(15);
  };

  return (
    <div className="App">
      <header
        style={{
          backgroundColor: "#282c34",
          padding: "20px",
          color: "white",
          textAlign: "center",
        }}
      >
        <h1>🚗 ¿Dónde aparqué mi coche?</h1>
        <p>Guarda y encuentra fácilmente donde aparcaste tu vehículo</p>
      </header>

      <main style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
        <LocationSaver onLocationSaved={handleLocationSaved} />

        <div style={{ marginBottom: "20px" }}>
          <h3>🗺️ Mapa de ubicaciones</h3>
          <Map locations={locations} center={mapCenter} zoom={mapZoom} />
        </div>

        <SavedLocations
          locations={locations}
          onLocationDeleted={handleLocationDeleted}
          onLocationSelected={handleLocationSelected}
        />
      </main>

      <footer
        style={{
          backgroundColor: "#f8f9fa",
          padding: "20px",
          textAlign: "center",
          marginTop: "40px",
          borderTop: "1px solid #dee2e6",
        }}
      >
        <p>💡 Consejo: Permite el acceso a la ubicación para obtener mejores resultados</p>
      </footer>
    </div>
  );
}

export default App;
