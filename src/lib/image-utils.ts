/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Area } from "react-easy-crop";

/**
 * Creates an image element from a URL
 */
export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous"); // needed to avoid cross-origin issues on CodeSandbox
    image.src = url;
  });

/**
 * Returns the cropped image as a data URL
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
  flip = { horizontal: false, vertical: false }
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return "";
  }

  const rotRad = (rotation * Math.PI) / 180;

  // calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  // set canvas size to match the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // translate canvas context to a central point to allow rotating and flipping around the center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  // draw rotated image
  ctx.drawImage(image, 0, 0);

  // croppedAreaPixels values are bounding box relative
  // extract the cropped image using these values
  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  );

  // set canvas width to final desired size (384x384 for avatar thumbnail)
  canvas.width = 384;
  canvas.height = 384;

  // paste generated rotate image with correct offsets for x,y crop values.
  ctx.putImageData(data, 0, 0);

  // However, putImageData doesn't scale. We need to scale to 384x384.
  // So we'll use a temporary canvas for the crop, then draw it to the final canvas.
  
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  tempCanvas.width = pixelCrop.width;
  tempCanvas.height = pixelCrop.height;
  tempCtx?.putImageData(data, 0, 0);

  ctx.clearRect(0, 0, 384, 384);
  ctx.drawImage(tempCanvas, 0, 0, pixelCrop.width, pixelCrop.height, 0, 0, 384, 384);

  // return as base64
  return canvas.toDataURL("image/jpeg", 0.75);
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = (rotation * Math.PI) / 180;

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

export async function compressAndResizeImage(fileOrDataUrl: File | string, maxDim = 1200, quality = 0.82): Promise<Blob> {
  let imageSrc = "";
  if (typeof fileOrDataUrl === "string") {
    imageSrc = fileOrDataUrl;
  } else {
    imageSrc = URL.createObjectURL(fileOrDataUrl);
  }

  let image: HTMLImageElement;
  try {
    image = await createImage(imageSrc);
  } catch (err) {
    if (typeof fileOrDataUrl === "string" && fileOrDataUrl.startsWith("data:")) {
      const res = await fetch(fileOrDataUrl);
      return await res.blob();
    }
    return typeof fileOrDataUrl === "string" ? new Blob() : fileOrDataUrl;
  }

  let { width, height } = image;

  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    if (typeof fileOrDataUrl === "string" && fileOrDataUrl.startsWith("data:")) {
      const res = await fetch(fileOrDataUrl);
      return await res.blob();
    }
    return typeof fileOrDataUrl === "string" ? new Blob() : fileOrDataUrl;
  }

  ctx.drawImage(image, 0, 0, width, height);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          fetch(canvas.toDataURL("image/jpeg", quality))
            .then((res) => res.blob())
            .then((b) => resolve(b))
            .catch(() => resolve(new Blob()));
        }
      },
      "image/jpeg",
      quality
    );
  });
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function uploadProfilePhotoToStorage(fileOrDataUrl: File | string, identifier: string): Promise<string> {
  if (typeof fileOrDataUrl === "string" && (fileOrDataUrl.startsWith("http://") || fileOrDataUrl.startsWith("https://"))) {
    return fileOrDataUrl;
  }

  // Compress avatar to 400px max dimension at 0.75 quality (~15-20KB)
  const blob = await compressAndResizeImage(fileOrDataUrl, 400, 0.75);

  if (!storage) {
    return await blobToDataUrl(blob);
  }

  try {
    const filename = `profile_photos/${identifier}_${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);

    const uploadPromise = (async () => {
      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    })();

    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error("Storage upload timeout")), 4000)
    );

    return await Promise.race([uploadPromise, timeoutPromise]);
  } catch (err) {
    console.warn("Firebase Storage upload failed or timed out, falling back to compressed data URL:", err);
    return await blobToDataUrl(blob);
  }
}

export async function compressBase64Image(dataUrl: string, maxDim = 600, quality = 0.75): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith("data:image")) {
    return dataUrl;
  }
  if (dataUrl.length < 35_000) {
    return dataUrl;
  }
  try {
    const blob = await compressAndResizeImage(dataUrl, maxDim, quality);
    const compressed = await blobToDataUrl(blob);
    return compressed.length < dataUrl.length ? compressed : dataUrl;
  } catch {
    return dataUrl;
  }
}

