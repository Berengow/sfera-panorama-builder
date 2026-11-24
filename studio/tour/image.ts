export interface EncodedImage {
  dataUrl: string;
  blob: Blob;
}

export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error ?? new Error("read"));
    reader.readAsDataURL(file);
  });
}

export function transcode(dataUrl: string, maxWidth: number, quality: number): Promise<EncodedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const width = Math.max(2, Math.round(img.width * scale));
      const height = Math.max(2, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("blob"));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve({ dataUrl: String(reader.result || ""), blob });
          reader.onerror = () => reject(reader.error ?? new Error("encode"));
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        quality,
      );
    };
    img.onerror = () => reject(new Error("image"));
    img.src = dataUrl;
  });
}
