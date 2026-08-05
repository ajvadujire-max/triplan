/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { X, Download, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import { Trip, DiaryEntry } from "../types";

interface TravelDiaryPdfModalProps {
  trip: Trip;
  entries: DiaryEntry[];
  onClose: () => void;
}

interface PhotoLayoutItem {
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  croppedBase64: string;
}

interface PhotoLayoutRow {
  items: PhotoLayoutItem[];
  height: number;
}

// 1. ROBUST TEXT SANITIZATION FOR STANDARD PDF FONTS (Helvetica)
const sanitizePdfText = (str: string | undefined | null): string => {
  if (!str) return "";
  
  // Replace Rupee symbol with standard text to avoid rendering issues
  let sanitized = str.replace(/₹/g, "INR ");

  // Map smart quotes and common high unicode typography to ASCII counterparts
  sanitized = sanitized
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "--")
    .replace(/\u2022/g, "*");

  // Filter out any other characters outside standard ASCII printable range (32 to 126), and tab/newline/carriage return.
  // This removes emojis, regional indicator icons, non-standard symbols, and foreign languages that Helvetica can't display, 
  // preventing any boxes, question marks, or mojibake in the PDF.
  let finalStr = "";
  for (let i = 0; i < sanitized.length; i++) {
    const code = sanitized.charCodeAt(i);
    if ((code >= 32 && code <= 126) || code === 10 || code === 13 || code === 9) {
      finalStr += sanitized[i];
    }
  }

  // Trim lines while preserving intended spacing and paragraphs
  return finalStr
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 || line === "")
    .join("\n")
    .trim();
};

// 2. ASPECT RATIO CALCULATOR (object-fit: contain equivalent)
function getContainedDimensions(imgWidth: number, imgHeight: number, maxWidth: number, maxHeight: number) {
  const ratio = imgWidth / imgHeight;
  let width = maxWidth;
  let height = maxWidth / ratio;
  if (height > maxHeight) {
    height = maxHeight;
    width = maxHeight * ratio;
  }
  return { width, height };
}

// 2.5 CROPPING ENGINE FOR PERFECT GRID LAYOUTS (object-fit: cover equivalent)
function getCroppedImageBase64(
  cachedImg: { imgElement?: HTMLImageElement; base64: string; width: number; height: number },
  targetWidthMm: number,
  targetHeightMm: number
): string {
  if (!cachedImg.imgElement) {
    return cachedImg.base64; // fallback to original if no imgElement cached
  }
  
  const img = cachedImg.imgElement;
  const imgWidth = cachedImg.width;
  const imgHeight = cachedImg.height;
  
  const targetAspectRatio = targetWidthMm / targetHeightMm;
  const sourceAspectRatio = imgWidth / imgHeight;
  
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = imgWidth;
  let sourceHeight = imgHeight;
  
  if (sourceAspectRatio > targetAspectRatio) {
    // Source is wider than target - crop sides
    sourceWidth = imgHeight * targetAspectRatio;
    sourceX = (imgWidth - sourceWidth) / 2;
  } else {
    // Source is taller than target - crop top/bottom
    sourceHeight = imgWidth / targetAspectRatio;
    sourceY = (imgHeight - sourceHeight) / 2;
  }
  
  // Create a high-quality crop canvas
  const canvas = document.createElement("canvas");
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) return cachedImg.base64;
  
  ctx.drawImage(
    img,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    sourceWidth,
    sourceHeight
  );
  
  return canvas.toDataURL("image/jpeg", 0.95);
}

// 3. IMAGE PRELOADER (CORS-safe with fetch & canvas fallbacks)
const loadImage = async (url: string): Promise<{ base64: string; width: number; height: number; imgElement?: HTMLImageElement } | null> => {
  try {
    // Attempt CORS-safe fetch to bypass typical canvas staining blocks
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;
          
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const base64 = canvas.toDataURL("image/jpeg", 0.92);
            resolve({ base64, width, height, imgElement: img });
          } else {
            resolve(null);
          }
        } catch (err) {
          console.error("Canvas draw failed for blob:", err);
          resolve(null);
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };
      img.src = objectUrl;
    });
  } catch (e) {
    console.warn("Direct fetch preloader fallback for image:", url, e);
    // Fallback directly to Image constructor loading
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const base64 = canvas.toDataURL("image/jpeg", 0.92);
            resolve({ base64, width, height, imgElement: img });
          } else {
            resolve(null);
          }
        } catch (err) {
          resolve(null);
        }
      };
      img.onerror = () => {
        resolve(null);
      };
      img.src = url;
    });
  }
};

// 4. BALANCED JOURNAL LAYOUT GENERATOR
function getPhotoLayout(
  photos: string[],
  cachedImages: Record<string, { base64: string; width: number; height: number; imgElement?: HTMLImageElement }>,
  contentWidth: number,
  margin: number
): PhotoLayoutRow[] {
  const rows: PhotoLayoutRow[] = [];
  const gap = 1.5; // 1.5 mm gap (~5.6 px)
  const colWidth = (contentWidth - gap) / 2;
  const height2Col = 55; // 2-column row height
  const height1Col = 85; // 1-column row height

  const getCroppedBase64 = (url: string, targetW: number, targetH: number): string => {
    const cachedImg = cachedImages[url];
    if (!cachedImg) return "";
    return getCroppedImageBase64(cachedImg, targetW, targetH);
  };

  const n = photos.length;

  if (n === 1) {
    // 1 Photo: 1 large full-width photo
    rows.push({
      items: [
        {
          url: photos[0],
          x: margin,
          y: 0,
          width: contentWidth,
          height: height1Col,
          croppedBase64: getCroppedBase64(photos[0], contentWidth, height1Col),
        },
      ],
      height: height1Col,
    });
  } else if (n === 2) {
    // 2 Photos: 1 row of 2 columns
    rows.push({
      items: [
        {
          url: photos[0],
          x: margin,
          y: 0,
          width: colWidth,
          height: height2Col,
          croppedBase64: getCroppedBase64(photos[0], colWidth, height2Col),
        },
        {
          url: photos[1],
          x: margin + colWidth + gap,
          y: 0,
          width: colWidth,
          height: height2Col,
          croppedBase64: getCroppedBase64(photos[1], colWidth, height2Col),
        },
      ],
      height: height2Col,
    });
  } else if (n === 3) {
    // 3 Photos: Row 1 has 2 columns, Row 2 has 1 full-width column
    rows.push({
      items: [
        {
          url: photos[0],
          x: margin,
          y: 0,
          width: colWidth,
          height: height2Col,
          croppedBase64: getCroppedBase64(photos[0], colWidth, height2Col),
        },
        {
          url: photos[1],
          x: margin + colWidth + gap,
          y: 0,
          width: colWidth,
          height: height2Col,
          croppedBase64: getCroppedBase64(photos[1], colWidth, height2Col),
        },
      ],
      height: height2Col,
    });
    rows.push({
      items: [
        {
          url: photos[2],
          x: margin,
          y: height2Col + gap,
          width: contentWidth,
          height: height1Col,
          croppedBase64: getCroppedBase64(photos[2], contentWidth, height1Col),
        },
      ],
      height: height1Col,
    });
  } else if (n === 4) {
    // 4 Photos: 2 rows of 2 columns
    rows.push({
      items: [
        {
          url: photos[0],
          x: margin,
          y: 0,
          width: colWidth,
          height: height2Col,
          croppedBase64: getCroppedBase64(photos[0], colWidth, height2Col),
        },
        {
          url: photos[1],
          x: margin + colWidth + gap,
          y: 0,
          width: colWidth,
          height: height2Col,
          croppedBase64: getCroppedBase64(photos[1], colWidth, height2Col),
        },
      ],
      height: height2Col,
    });
    rows.push({
      items: [
        {
          url: photos[2],
          x: margin,
          y: height2Col + gap,
          width: colWidth,
          height: height2Col,
          croppedBase64: getCroppedBase64(photos[2], colWidth, height2Col),
        },
        {
          url: photos[3],
          x: margin + colWidth + gap,
          y: height2Col + gap,
          width: colWidth,
          height: height2Col,
          croppedBase64: getCroppedBase64(photos[3], colWidth, height2Col),
        },
      ],
      height: height2Col,
    });
  } else if (n === 5) {
    // 5 Photos: Row 1 of 2 cols, Row 2 of 2 cols, Row 3 of 1 full-width col
    rows.push({
      items: [
        {
          url: photos[0],
          x: margin,
          y: 0,
          width: colWidth,
          height: height2Col,
          croppedBase64: getCroppedBase64(photos[0], colWidth, height2Col),
        },
        {
          url: photos[1],
          x: margin + colWidth + gap,
          y: 0,
          width: colWidth,
          height: height2Col,
          croppedBase64: getCroppedBase64(photos[1], colWidth, height2Col),
        },
      ],
      height: height2Col,
    });
    rows.push({
      items: [
        {
          url: photos[2],
          x: margin,
          y: height2Col + gap,
          width: colWidth,
          height: height2Col,
          croppedBase64: getCroppedBase64(photos[2], colWidth, height2Col),
        },
        {
          url: photos[3],
          x: margin + colWidth + gap,
          y: height2Col + gap,
          width: colWidth,
          height: height2Col,
          croppedBase64: getCroppedBase64(photos[3], colWidth, height2Col),
        },
      ],
      height: height2Col,
    });
    rows.push({
      items: [
        {
          url: photos[4],
          x: margin,
          y: (height2Col + gap) * 2,
          width: contentWidth,
          height: height1Col,
          croppedBase64: getCroppedBase64(photos[4], contentWidth, height1Col),
        },
      ],
      height: height1Col,
    });
  } else {
    // 6 or more photos: Rows of 2. If odd leftover, last is full width
    let currentY = 0;
    for (let i = 0; i < n; i += 2) {
      if (i === n - 1) {
        rows.push({
          items: [
            {
              url: photos[i],
              x: margin,
              y: currentY,
              width: contentWidth,
              height: height1Col,
              croppedBase64: getCroppedBase64(photos[i], contentWidth, height1Col),
            },
          ],
          height: height1Col,
        });
        currentY += height1Col + gap;
      } else {
        rows.push({
          items: [
            {
              url: photos[i],
              x: margin,
              y: currentY,
              width: colWidth,
              height: height2Col,
              croppedBase64: getCroppedBase64(photos[i], colWidth, height2Col),
            },
            {
              url: photos[i + 1],
              x: margin + colWidth + gap,
              y: currentY,
              width: colWidth,
              height: height2Col,
              croppedBase64: getCroppedBase64(photos[i + 1], colWidth, height2Col),
            },
          ],
          height: height2Col,
        });
        currentY += height2Col + gap;
      }
    }
  }

  return rows;
}

export const TravelDiaryPdfModal: React.FC<TravelDiaryPdfModalProps> = ({
  trip,
  entries,
  onClose,
}) => {
  const [styleMode, setStyleMode] = useState<"Classic" | "Modern" | "Minimal">("Modern");
  const [includeCover, setIncludeCover] = useState<boolean>(true);
  const [includeSummary, setIncludeSummary] = useState<boolean>(true);
  const [includeLocations, setIncludeLocations] = useState<boolean>(true);
  const [includeMoods, setIncludeMoods] = useState<boolean>(true);
  const [includeTags, setIncludeTags] = useState<boolean>(true);
  const [includePhotos, setIncludePhotos] = useState<boolean>(true);
  const [includePageNumbers, setIncludePageNumbers] = useState<boolean>(true);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sortedEntries = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const totalPhotos = sortedEntries.reduce((acc, e) => acc + (e.photos?.length || 0), 0);
  const estimatedPages = Math.max(2, Math.ceil(sortedEntries.length * 1.3 + (includeCover ? 1 : 0) + (includeSummary ? 1 : 0)));

  const handleGeneratePdf = async () => {
    if (entries.length === 0) {
      setErrorMessage("Your travel diary is empty. Add your first memory before creating your diary book.");
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      // --- STAGE 1: IMAGE PRELOADING ---
      setGenerationStep("Pre-loading diary photographs...");
      const uniquePhotoUrls = new Set<string>();
      
      if (includeCover) {
        const coverImgUrl = trip.coverImage || trip.coverPhoto || (sortedEntries[0]?.photos?.[0]);
        if (coverImgUrl) uniquePhotoUrls.add(coverImgUrl);
      }
      if (includePhotos) {
        for (const entry of sortedEntries) {
          if (entry.photos) {
            for (const p of entry.photos) {
              if (p) uniquePhotoUrls.add(p);
            }
          }
        }
      }

      const photoUrlsArray = Array.from(uniquePhotoUrls);
      const cachedImages: Record<string, { base64: string; width: number; height: number; imgElement?: HTMLImageElement }> = {};

      if (photoUrlsArray.length > 0) {
        let loadedCount = 0;
        const loadPromises = photoUrlsArray.map(async (url) => {
          const result = await loadImage(url);
          if (result) {
            cachedImages[url] = result;
          }
          loadedCount++;
          setGenerationStep(`Downloading travel photographs (${loadedCount}/${photoUrlsArray.length})...`);
        });
        await Promise.all(loadPromises);
      }

      // --- STAGE 2: LAYOUT DESIGN & RENDERING ---
      setGenerationStep("Designing your personalized memory book layout...");
      await new Promise((r) => setTimeout(r, 400));

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;

      let pageCount = 1;
      let firstPageUsed = false;

      const addFooter = (pageNum: number) => {
        if (!includePageNumbers) return;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(140, 140, 140);
        doc.text(`TripPro Travel Memory Book • ${sanitizePdfText(trip.name)}`, margin, pageHeight - 12);
        doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 12, { align: "right" });
      };

      const startPageIfNeeded = () => {
        if (!firstPageUsed) {
          firstPageUsed = true;
          return;
        }
        addFooter(pageCount);
        doc.addPage();
        pageCount++;
      };

      // A. COVER PAGE
      if (includeCover) {
        startPageIfNeeded();

        // Elegant Modern cover styling
        doc.setFillColor(styleMode === "Classic" ? 44 : styleMode === "Modern" ? 22 : 248, styleMode === "Classic" ? 62 : styleMode === "Modern" ? 163 : 250, styleMode === "Classic" ? 80 : styleMode === "Modern" ? 102 : 252);
        doc.rect(0, 0, pageWidth, pageHeight, "F");

        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin, margin + 5, contentWidth, pageHeight - (margin * 2 + 10), 4, 4, "F");

        let currentY = margin + 30;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(26, 171, 103);
        doc.text("PERSONAL TRAVEL DIARY & PHOTO JOURNAL", pageWidth / 2, currentY, { align: "center" });

        currentY += 22;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(26);
        doc.setTextColor(30, 41, 59);
        doc.text("TRAVEL DIARY", pageWidth / 2, currentY, { align: "center" });

        currentY += 12;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(71, 85, 105);
        doc.text(sanitizePdfText(trip.name), pageWidth / 2, currentY, { align: "center" });

        currentY += 10;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.setTextColor(100, 116, 139);
        doc.text(`Destination: ${sanitizePdfText(trip.destination) || "Multiple Locations"}`, pageWidth / 2, currentY, { align: "center" });

        currentY += 7;
        const dateStr = `${trip.startDate || ""} — ${trip.endDate || ""}`;
        doc.text(sanitizePdfText(dateStr), pageWidth / 2, currentY, { align: "center" });

        // Center cover photo with original aspect ratio
        const coverImgUrl = trip.coverImage || trip.coverPhoto || (sortedEntries[0]?.photos?.[0]);
        if (includePhotos && coverImgUrl && cachedImages[coverImgUrl]) {
          try {
            currentY += 12;
            const imgData = cachedImages[coverImgUrl];
            const { width, height } = getContainedDimensions(imgData.width, imgData.height, 110, 85);
            const imgX = (pageWidth - width) / 2;

            doc.setFillColor(248, 250, 252);
            doc.roundedRect(imgX - 2, currentY - 2, width + 4, height + 4, 2, 2, "F");
            doc.addImage(imgData.base64, "JPEG", imgX, currentY, width, height);
            
            currentY += height + 16;
          } catch (err) {
            currentY += 25;
          }
        } else {
          currentY += 45;
        }

        doc.setFont("times", "italic");
        doc.setFontSize(12);
        doc.setTextColor(100, 116, 139);
        doc.text('"Every journey is a story waiting to be told."', pageWidth / 2, currentY, { align: "center" });
      }

      // B. TRIP OVERVIEW / INTRODUCTION
      if (includeSummary) {
        startPageIfNeeded();
        let currentY = margin + 15;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59);
        doc.text("OUR JOURNEY SUMMARY", margin, currentY);

        currentY += 8;
        doc.setLineWidth(0.5);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, currentY, pageWidth - margin, currentY);

        currentY += 15;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.setTextColor(15, 23, 42);
        doc.text(sanitizePdfText(trip.name), margin, currentY);

        currentY += 9;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(71, 85, 105);
        doc.text(`Destination: ${sanitizePdfText(trip.destination) || "N/A"}`, margin, currentY);

        currentY += 7;
        doc.text(`Travel Dates: ${trip.startDate || "N/A"} to ${trip.endDate || "N/A"}`, margin, currentY);

        currentY += 7;
        doc.text(`Total Companion Travellers: ${trip.travellers?.length || 1}`, margin, currentY);

        currentY += 7;
        doc.text(`Diary Log Entries: ${sortedEntries.length}`, margin, currentY);

        currentY += 7;
        doc.text(`High-Quality Photographs: ${totalPhotos}`, margin, currentY);

        currentY += 22;
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(margin, currentY, contentWidth, 38, 3, 3, "F");
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.text("Journal Overview", margin + 10, currentY + 11);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        doc.setTextColor(100, 116, 139);
        const overviewText = `This beautifully compiled memory book highlights a collection of ${sortedEntries.length} chronological journal entries spanning across our journey. Complete with ${totalPhotos} fully preloaded high-resolution print photographs. Generated securely via TripPro Travel Assistant.`;
        const splitOverview = doc.splitTextToSize(sanitizePdfText(overviewText), contentWidth - 20);
        doc.text(splitOverview, margin + 10, currentY + 20);
      }

      // C. CHRONOLOGICAL DIARY ENTRIES
      for (let i = 0; i < sortedEntries.length; i++) {
        const entry = sortedEntries[i];
        startPageIfNeeded();
        let currentY = margin + 15;

        // Entry Header (Date + Mood Badge)
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(26, 171, 103);
        const entryDate = entry.date ? entry.date.toUpperCase() : "";
        doc.text(sanitizePdfText(entryDate), margin, currentY);

        // Render Clean Mood Pill Tag
        if (includeMoods && entry.mood) {
          const moodText = sanitizePdfText(entry.mood).toUpperCase();
          if (moodText) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            const textWidth = doc.getTextWidth(moodText);
            const badgeW = textWidth + 6;
            const badgeH = 5;
            const badgeX = margin + 35;
            const badgeY = currentY - 3.8;
            
            doc.setFillColor(241, 245, 249);
            doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, "F");
            
            doc.setTextColor(71, 85, 105);
            doc.text(moodText, badgeX + 3, currentY - 0.2);
          }
        }

        currentY += 9;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(19);
        doc.setTextColor(15, 23, 42);
        const titleLines = doc.splitTextToSize(sanitizePdfText(entry.title || "Untitled Memory"), contentWidth);
        doc.text(titleLines, margin, currentY);
        currentY += titleLines.length * 8;

        // Vector Red Pin Indicator for Location
        if (includeLocations && entry.location) {
          currentY += 2;
          
          doc.setDrawColor(239, 68, 68);
          doc.setFillColor(239, 68, 68);
          doc.ellipse(margin + 1.8, currentY - 1, 1.4, 1.4, "F");
          doc.triangle(margin + 0.4, currentY - 1, margin + 3.2, currentY - 1, margin + 1.8, currentY + 1.4, "F");
          doc.setFillColor(255, 255, 255);
          doc.ellipse(margin + 1.8, currentY - 1, 0.5, 0.5, "F");
          
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(71, 85, 105);
          doc.text(sanitizePdfText(entry.location), margin + 5.5, currentY + 0.3);
          currentY += 8;
        }

        // Tag indicators
        if (includeTags && entry.tags && entry.tags.length > 0) {
          currentY += 1;
          doc.setFont("helvetica", "italic");
          doc.setFontSize(9.5);
          doc.setTextColor(100, 116, 139);
          const formattedTags = entry.tags.map((t) => `#${sanitizePdfText(t)}`).join("  ");
          doc.text(formattedTags, margin, currentY);
          currentY += 8;
        }

        doc.setLineWidth(0.4);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 10;

        // Clean typography for story paragraphs
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(51, 65, 85);
        const storyLines = doc.splitTextToSize(sanitizePdfText(entry.content || ""), contentWidth);
        doc.text(storyLines, margin, currentY);
        currentY += storyLines.length * 5.8 + 6; // Tight 6mm spacing (approx 22px)

        // Dynamic page boundary calculations for Photo Galleries
        if (includePhotos && entry.photos && entry.photos.length > 0) {
          const photoRows = getPhotoLayout(entry.photos, cachedImages, contentWidth, margin);
          const pageBottomLimit = pageHeight - margin - 15;
          const labelHeight = 8;
          
          let pageStartedForPhotos = false;
          let currentPhotoY = currentY;

          if (currentPhotoY + labelHeight + photoRows[0].height > pageBottomLimit) {
            // Photos won't fit on this page, push to a new page
            addFooter(pageCount);
            doc.addPage();
            pageCount++;
            
            currentPhotoY = margin + 15;
            pageStartedForPhotos = true;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(26, 171, 103);
            doc.text(`${sanitizePdfText(entry.title).toUpperCase()} — PHOTOS`, margin, currentPhotoY);
            currentPhotoY += 5; // Spacing after section title (~18px)
          } else {
            // Draw photo section header on the same page
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(`ATTACHED PHOTOS (${entry.photos.length})`, margin, currentPhotoY);
            currentPhotoY += 4.5; // Spacing after section title (~17px)
          }

          for (let r = 0; r < photoRows.length; r++) {
            const row = photoRows[r];

            if (!pageStartedForPhotos && currentPhotoY + row.height > pageBottomLimit) {
              addFooter(pageCount);
              doc.addPage();
              pageCount++;
              
              currentPhotoY = margin + 15;
              pageStartedForPhotos = true;

              doc.setFont("helvetica", "bold");
              doc.setFontSize(11);
              doc.setTextColor(26, 171, 103);
              doc.text(`${sanitizePdfText(entry.title).toUpperCase()} — PHOTOS (CONTINUED)`, margin, currentPhotoY);
              currentPhotoY += 5;
            } else if (pageStartedForPhotos && currentPhotoY + row.height > pageBottomLimit) {
              addFooter(pageCount);
              doc.addPage();
              pageCount++;
              
              currentPhotoY = margin + 15;

              doc.setFont("helvetica", "bold");
              doc.setFontSize(11);
              doc.setTextColor(26, 171, 103);
              doc.text(`${sanitizePdfText(entry.title).toUpperCase()} — PHOTOS (CONTINUED)`, margin, currentPhotoY);
              currentPhotoY += 5;
            }

            // Draw each photograph using the pre-cropped base64 (object-fit: cover equivalent)
            for (const item of row.items) {
              try {
                if (item.croppedBase64) {
                  // Borderless and completely square for elegant, professional photo book edges
                  doc.addImage(item.croppedBase64, "JPEG", item.x, currentPhotoY, item.width, item.height);
                }
              } catch (e) {
                console.error("Failed to render photograph in PDF:", item.url, e);
              }
            }

            currentPhotoY += row.height + 1.5; // Tightly controlled 1.5mm vertical gap between rows
          }
        }
      }

      // Add final footer before finishing doc
      addFooter(pageCount);

      setGenerationStep("Downloading your Memory Book...");
      await new Promise((r) => setTimeout(r, 300));

      const sanitizedTitle = trip.name.replace(/[^a-zA-Z0-9]/g, "-");
      doc.save(`${sanitizedTitle}-Travel-Diary.pdf`);

      setSuccessMessage("Travel Diary PDF generated and downloaded successfully!");
      setIsGenerating(false);
    } catch (err: any) {
      console.error("PDF compilation error:", err);
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#1AAB67] flex items-center justify-center text-xl font-bold shadow-xs border border-emerald-200 dark:border-emerald-800">
              📖
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Create Travel Diary PDF
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {trip.name} • {entries.length} Entries • {totalPhotos} Photos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {entries.length === 0 ? (
          <div className="p-6 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-center space-y-3 border border-slate-200 dark:border-slate-700">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Your travel diary is empty
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add your first memory before creating your diary book.
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#1AAB67] hover:bg-[#159257] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700 text-center">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Entries</p>
                <p className="text-base font-black text-slate-900 dark:text-white">{entries.length}</p>
              </div>
              <div className="border-x border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Photos</p>
                <p className="text-base font-black text-[#1AAB67]">{totalPhotos}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Est. Pages</p>
                <p className="text-base font-black text-slate-900 dark:text-white">~{estimatedPages}</p>
              </div>
            </div>

            {/* Layout Styling Mode Customizer */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Journal Style & Options
              </label>

              <div className="grid grid-cols-3 gap-2">
                {(["Modern", "Classic", "Minimal"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStyleMode(s)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      styleMode === s
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-[#1AAB67] border-[#1AAB67] shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeCover}
                    onChange={(e) => setIncludeCover(e.target.checked)}
                    className="rounded text-[#1AAB67] focus:ring-[#1AAB67]"
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Cover Page</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSummary}
                    onChange={(e) => setIncludeSummary(e.target.checked)}
                    className="rounded text-[#1AAB67] focus:ring-[#1AAB67]"
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Trip Summary</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includePhotos}
                    onChange={(e) => setIncludePhotos(e.target.checked)}
                    className="rounded text-[#1AAB67] focus:ring-[#1AAB67]"
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Include Photos</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includePageNumbers}
                    onChange={(e) => setIncludePageNumbers(e.target.checked)}
                    className="rounded text-[#1AAB67] focus:ring-[#1AAB67]"
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Page Numbers</span>
                </label>
              </div>
            </div>

            {/* Generation Progress Indicator */}
            {isGenerating && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
                <Loader2 className="w-6 h-6 text-[#1AAB67] animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {generationStep}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Please keep this window open while your journal PDF is generated.
                </p>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-[#1AAB67] shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-bold">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Control buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGeneratePdf}
                className="flex-2 py-3 px-4 rounded-xl bg-[#1AAB67] hover:bg-[#159257] active:scale-95 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Generate & Download PDF</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};
