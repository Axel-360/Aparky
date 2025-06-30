// src/features/photo/components/PhotoCapture/PhotoCapture.tsx - VERSIÓN CONSERVADORA
import React, { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Alert,
  AlertDescription,
} from "@/shared/ui";
import { Camera, Upload, X, Ban } from "lucide-react";

interface PhotoCaptureProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
  quality?: "low" | "medium" | "high";
}

// Solo mantenemos la mejora de configuración de calidad (funciona bien)
const getQualitySettings = (quality: "low" | "medium" | "high") => {
  switch (quality) {
    case "low":
      return { width: 640, height: 480, quality: 0.6 };
    case "high":
      return { width: 1920, height: 1080, quality: 0.9 };
    default:
      return { width: 1280, height: 720, quality: 0.8 };
  }
};

// Solo mejoramos la compresión para que use WebP si está disponible
const compressImage = (file: File, quality: "low" | "medium" | "high"): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const img = new Image();

    img.onload = () => {
      const settings = getQualitySettings(quality);
      const aspectRatio = img.width / img.height;
      let { width, height } = settings;

      if (aspectRatio > width / height) {
        height = width / aspectRatio;
      } else {
        width = height * aspectRatio;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // 🚀 SOLO ESTA MEJORA: Intentar WebP, si no funciona usar JPEG
      let format = "image/webp";
      let finalQuality = settings.quality;

      // Test rápido de soporte WebP
      const testWebP = canvas.toDataURL("image/webp");
      if (!testWebP.startsWith("data:image/webp")) {
        format = "image/jpeg";
      }

      const compressedDataUrl = canvas.toDataURL(format, finalQuality);
      resolve(compressedDataUrl);
    };

    img.src = URL.createObjectURL(file);
  });
};

const PhotoCapture: React.FC<PhotoCaptureProps> = ({ photos, onPhotosChange, maxPhotos = 3, quality = "medium" }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 🚀 SOLO ESTA MEJORA: Cleanup de streams al desmontar
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // TU FUNCIÓN ORIGINAL - SIN CAMBIOS
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length + photos.length > maxPhotos) {
      alert(`Solo puedes añadir ${maxPhotos - photos.length} fotos más`);
      return;
    }

    const compressedPhotos: string[] = [];
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        // Solo cambio: usar la nueva función de compresión
        compressedPhotos.push(await compressImage(file, quality));
      }
    }

    onPhotosChange([...photos, ...compressedPhotos]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // TU FUNCIÓN ORIGINAL - SIN CAMBIOS
  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
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

  // TU FUNCIÓN ORIGINAL - CON PEQUEÑA MEJORA
  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    const video = videoRef.current;
    const ctx = canvas.getContext("2d")!;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Solo mejora: usar WebP si está disponible
    let format = "image/webp";
    const testWebP = canvas.toDataURL("image/webp");
    if (!testWebP.startsWith("data:image/webp")) {
      format = "image/jpeg";
    }

    const dataUrl = canvas.toDataURL(format, getQualitySettings(quality).quality);
    onPhotosChange([...photos, dataUrl]);
    stopCamera();
  };

  // TU FUNCIÓN ORIGINAL - SIN CAMBIOS
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  };

  // TU FUNCIÓN ORIGINAL - SIN CAMBIOS
  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  const canAddMore = photos.length < maxPhotos;

  // TU JSX ORIGINAL - SIN CAMBIOS (excepto display del formato usado)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera /> Fotos del Lugar ({photos.length}/{maxPhotos})
        </CardTitle>
        <CardDescription>
          Añade fotos para ayudarte a recordar dónde aparcaste.
          {/* Solo añadimos info de calidad en castellano */}
          <div className="text-xs text-muted-foreground mt-1">
            Calidad: {quality === "low" ? "Baja" : quality === "medium" ? "Media" : "Alta"} • Formato optimizado
            automáticamente
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {photos.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {photos.map((photo, index) => (
              <div key={index} className="relative group aspect-square">
                <img src={photo} alt={`Foto ${index + 1}`} className="w-full h-full object-cover rounded-lg border" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => removePhoto(index)}
                  title="Eliminar foto"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        {canAddMore && (
          <div>
            {!isCapturing ? (
              <div className="flex flex-col gap-2">
                <Button onClick={startCamera} className="w-full">
                  <Camera className="mr-2 h-4 w-4" /> Tomar Foto
                </Button>
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="w-full">
                  <Upload className="mr-2 h-4 w-4" /> Subir Foto
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-3 flex flex-col items-center">
                <video
                  ref={videoRef}
                  className="w-full max-w-md rounded-lg border bg-secondary"
                  autoPlay
                  playsInline
                  muted
                />
                <div className="flex gap-2">
                  <Button onClick={capturePhoto} size="lg">
                    <Camera className="mr-2 h-5 w-5" /> Capturar
                  </Button>
                  <Button variant="ghost" onClick={stopCamera}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        {!canAddMore && (
          <Alert>
            <Ban className="h-4 w-4" />
            <AlertDescription>Límite de {maxPhotos} fotos alcanzado. Elimina alguna para añadir más.</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default PhotoCapture;
