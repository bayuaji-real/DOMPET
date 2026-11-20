/**
 * Utilitas kompresi gambar di sisi klien untuk foto struk belanja.
 * Batas maksimal dimensi: 1600px, format: JPEG, kualitas: 0.8
 */

export interface CompressionResult {
  file: File;
  blob: Blob;
  dataUrl: string;
  base64: string;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
}

export async function compressImage(
  file: File,
  maxDimension = 1600,
  quality = 0.8
): Promise<CompressionResult> {
  // Jika lingkungan bukan browser (SSR), kembalikan file asli sebagai fallback
  if (typeof window === "undefined") {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return {
      file,
      blob: file,
      dataUrl: `data:${file.type};base64,${base64}`,
      base64,
      width: 0,
      height: 0,
      originalSize: file.size,
      compressedSize: file.size,
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Hitung skala resize jika melebihi batas maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Gagal menginisialisasi canvas context"));
          return;
        }

        // Gambar background putih (mencegah background hitam jika PNG transparan diubah ke JPEG)
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);

        // Gambar foto struk ke canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Ekspor ke format JPEG dengan kualitas 0.8
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Gagal mengompresi gambar"));
              return;
            }

            const compressedFileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const compressedFile = new File([blob], compressedFileName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            const dataUrl = canvas.toDataURL("image/jpeg", quality);
            // Ekstrak string base64 murni tanpa prefix data URI
            const base64 = dataUrl.split(",")[1] || "";

            resolve({
              file: compressedFile,
              blob,
              dataUrl,
              base64,
              width,
              height,
              originalSize: file.size,
              compressedSize: blob.size,
            });
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => {
        reject(new Error("Gagal memuat gambar untuk dikompresi"));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error("Gagal membaca file gambar"));
    };

    reader.readAsDataURL(file);
  });
}
