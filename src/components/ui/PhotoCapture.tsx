// src/components/ui/PhotoCapture.tsx
import React, { useState, useRef } from "react";

interface PhotoCaptureProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  quality?: "low" | "medium" | "high";
}

const PhotoCapture: React.FC<PhotoCaptureProps> = ({ photos, onPhotosChange, maxPhotos = 3, quality = "medium" }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const getQualitySettings = () => {
    switch (quality) {
      case "low":
        return { width: 640, height: 480, quality: 0.6 };
      case "high":
        return { width: 1920, height: 1080, quality: 0.9 };
      default:
        return { width: 1280, height: 720, quality: 0.8 };
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const img = new Image();

      img.onload = () => {
        const settings = getQualitySettings();

        // Calcular dimensiones manteniendo aspecto
        const aspectRatio = img.width / img.height;
        let { width, height } = settings;

        if (aspectRatio > width / height) {
          height = width / aspectRatio;
        } else {
          width = height * aspectRatio;
        }

        canvas.width = width;
        canvas.height = height;

        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a base64 con compresión
        const compressedDataUrl = canvas.toDataURL("image/jpeg", settings.quality);
        resolve(compressedDataUrl);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (files.length + photos.length > maxPhotos) {
      alert(`Solo puedes añadir ${maxPhotos - photos.length} fotos más`);
      return;
    }

    const compressedPhotos: string[] = [];

    for (const file of files) {
      if (file.type.startsWith("image/")) {
        const compressed = await compressImage(file);
        compressedPhotos.push(compressed);
      }
    }

    onPhotosChange([...photos, ...compressedPhotos]);

    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Cámara trasera en móviles
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert('No se pudo acceder a la cámara. Usa el botón "Subir foto" en su lugar.');
      setIsCapturing(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d")!;

    // Configurar tamaño del canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Capturar frame actual
    ctx.drawImage(video, 0, 0);

    // Convertir a base64
    const dataUrl = canvas.toDataURL("image/jpeg", getQualitySettings().quality);

    onPhotosChange([...photos, dataUrl]);
    stopCamera();
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className="photo-capture">
      <div className="photo-capture-header">
        <h4>
          📸 Fotos del lugar ({photos.length}/{maxPhotos})
        </h4>
        <small>Las fotos te ayudarán a recordar mejor dónde aparcaste</small>
      </div>

      {/* Galería de fotos existentes */}
      {photos.length > 0 && (
        <div className="photo-gallery">
          {photos.map((photo, index) => (
            <div key={index} className="photo-item">
              <img src={photo} alt={`Foto ${index + 1}`} className="photo-thumbnail" />
              <button className="photo-remove-btn" onClick={() => removePhoto(index)} title="Eliminar foto">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Controles de captura */}
      {canAddMore && (
        <div className="photo-controls">
          {!isCapturing ? (
            <div className="photo-buttons">
              <button className="capture-btn camera-btn" onClick={startCamera} title="Tomar foto con cámara">
                📷 Tomar foto
              </button>

              <button
                className="capture-btn upload-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Subir foto desde galería"
              >
                🖼️ Subir foto
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
            </div>
          ) : (
            <div className="camera-interface">
              <video ref={videoRef} className="camera-video" autoPlay playsInline muted />

              <div className="camera-controls">
                <button className="camera-action-btn capture" onClick={capturePhoto}>
                  📸 Capturar
                </button>
                <button className="camera-action-btn cancel" onClick={stopCamera}>
                  ✕ Cancelar
                </button>
              </div>

              <canvas ref={canvasRef} style={{ display: "none" }} />
            </div>
          )}
        </div>
      )}

      {!canAddMore && (
        <p className="photo-limit-message">Máximo de {maxPhotos} fotos alcanzado. Elimina alguna para añadir más.</p>
      )}
    </div>
  );
};

export default PhotoCapture;
