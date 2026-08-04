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

  // set canvas width to final desired size (512x512 as requested)
  canvas.width = 512;
  canvas.height = 512;

  // paste generated rotate image with correct offsets for x,y crop values.
  ctx.putImageData(data, 0, 0);

  // However, putImageData doesn't scale. We need to scale to 512x512.
  // So we'll use a temporary canvas for the crop, then draw it to the final canvas.
  
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  tempCanvas.width = pixelCrop.width;
  tempCanvas.height = pixelCrop.height;
  tempCtx?.putImageData(data, 0, 0);

  ctx.clearRect(0, 0, 512, 512);
  ctx.drawImage(tempCanvas, 0, 0, pixelCrop.width, pixelCrop.height, 0, 0, 512, 512);

  // return as base64
  return canvas.toDataURL("image/jpeg", 0.9);
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

export async function uploadProfilePhotoToStorage(fileOrDataUrl: File | string, identifier: string): Promise<string> {
  if (!storage) {
    throw new Error("Firebase Storage is not initialized");
  }

  let blob: Blob;
  if (typeof fileOrDataUrl === "string") {
    if (fileOrDataUrl.startsWith("data:")) {
      const res = await fetch(fileOrDataUrl);
      blob = await res.blob();
    } else {
      return fileOrDataUrl; // Already a URL
    }
  } else {
    blob = fileOrDataUrl;
  }

  const filename = `profile_photos/${identifier}_${Date.now()}.jpg`;
  const storageRef = ref(storage, filename);
  await uploadBytes(storageRef, blob);
  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
}

