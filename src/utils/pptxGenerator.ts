/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import pptxgen from "pptxgenjs";
import { Trip, TransportSegment, TimelineActivity, HotelModule } from "../types";

export interface PresentationSections {
  cover: boolean;
  overview: boolean;
  timeline: boolean;
  dailyItinerary: boolean;
  transportation: boolean;
  activities: boolean;
  hotels: boolean;
  routeVisual: boolean;
  summary: boolean;
}

export type PresentationStyle = "Modern Travel" | "Minimal" | "Professional" | "Photo Story";

export interface PresentationOptions {
  style: PresentationStyle;
  sections: PresentationSections;
}

export interface PreviewSlide {
  id: number;
  title: string;
  category: string;
  content: {
    heading?: string;
    subheading?: string;
    cards?: { title: string; subtitle?: string; desc?: string; badge?: string; icon?: string; detail?: string }[];
    timelineItems?: { date?: string; title: string; subtitle: string; time?: string; type?: string; detail?: string; cost?: string }[];
    badge?: string;
    metrics?: { label: string; value: string; subtext?: string }[];
    footerText?: string;
  };
}

// Format date helper
function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function calculateDays(startDate?: string, endDate?: string): number {
  if (!startDate || !endDate) return 1;
  try {
    const d1 = new Date(startDate);
    const d2 = new Date(endDate);
    const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  } catch {
    return 1;
  }
}

// Sanitize filename
export function sanitizeFileName(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9_\-\s]/g, "").trim().replace(/\s+/g, "_");
  return clean ? `${clean}_Presentation` : "Trip_Presentation";
}

// Main Data Collector
export function collectTripData(trip: Trip) {
  const totalDays = calculateDays(trip.startDate, trip.endDate);
  const travellersCount = trip.travellers?.length || trip.expectedTravellers || 1;
  const organizer = trip.travellers?.find((t) => t.role === "Organizer")?.fullName || "Organizer";
  
  // Extract route endpoints
  let origin = "Origin";
  let destination = trip.destination || "Destination";
  if (trip.segments && trip.segments.length > 0) {
    origin = trip.segments[0].from || origin;
    destination = trip.segments[trip.segments.length - 1].to || destination;
  }

  // Calculate totals
  let totalDistance = trip.totalDistanceKm || 0;
  let totalTransportCost = 0;
  if (trip.segments) {
    totalTransportCost = trip.segments.reduce((acc, seg) => acc + (seg.fare || 0), 0);
    if (!totalDistance) {
      totalDistance = trip.segments.reduce((acc, seg) => acc + (seg.distanceKm || 0), 0);
    }
  }

  // Transport count breakdown
  const transportCounts: Record<string, number> = {};
  trip.segments?.forEach((seg) => {
    const type = seg.transportType || "Other";
    transportCounts[type] = (transportCounts[type] || 0) + 1;
  });

  // Group timeline & segments by Day
  const dayGroups: Record<string, { date: string; dayNum: number; segments: TransportSegment[]; activities: TimelineActivity[] }> = {};

  // Map segments to day keys
  trip.segments?.forEach((seg) => {
    const rawDate = seg.departure ? seg.departure.split("T")[0] : trip.startDate || "Day 1";
    if (!dayGroups[rawDate]) {
      dayGroups[rawDate] = { date: rawDate, dayNum: Object.keys(dayGroups).length + 1, segments: [], activities: [] };
    }
    dayGroups[rawDate].segments.push(seg);
  });

  // Map activities to day keys
  trip.timeline?.forEach((act) => {
    const rawDate = act.date || trip.startDate || "Day 1";
    if (!dayGroups[rawDate]) {
      dayGroups[rawDate] = { date: rawDate, dayNum: Object.keys(dayGroups).length + 1, segments: [], activities: [] };
    }
    dayGroups[rawDate].activities.push(act);
  });

  const sortedDays = Object.values(dayGroups).sort((a, b) => a.date.localeCompare(b.date));

  return {
    tripName: trip.name || "Trip Itinerary",
    origin,
    destination,
    startDate: formatDate(trip.startDate),
    endDate: formatDate(trip.endDate),
    durationDays: totalDays,
    travellersCount,
    organizer,
    coverPhoto: trip.coverImage || trip.coverPhoto,
    totalDistance,
    totalTransportCost,
    transportCounts,
    segments: trip.segments || [],
    activities: trip.timeline || [],
    hotels: trip.hotels || [],
    sortedDays,
  };
}

/**
 * Generates slide structures for UI Preview
 */
export function generatePreviewSlides(trip: Trip, options: PresentationOptions): PreviewSlide[] {
  const data = collectTripData(trip);
  const slides: PreviewSlide[] = [];
  let slideId = 1;

  // 1. COVER
  if (options.sections.cover) {
    slides.push({
      id: slideId++,
      title: "Cover",
      category: "Cover",
      content: {
        heading: data.tripName.toUpperCase(),
        subheading: `${data.origin} → ${data.destination}`,
        badge: `${data.startDate} — ${data.endDate}`,
        metrics: [
          { label: "Duration", value: `${data.durationDays} Days` },
          { label: "Travellers", value: `${data.travellersCount} People` },
          { label: "Organizer", value: data.organizer },
        ],
      },
    });
  }

  // 2. TRIP OVERVIEW
  if (options.sections.overview) {
    slides.push({
      id: slideId++,
      title: "Trip at a Glance",
      category: "Overview",
      content: {
        heading: "TRIP AT A GLANCE",
        subheading: `${data.origin} to ${data.destination}`,
        metrics: [
          { label: "Route", value: `${data.origin} → ${data.destination}` },
          { label: "Departure", value: data.startDate || "TBD" },
          { label: "Return", value: data.endDate || "TBD" },
          { label: "Duration", value: `${data.durationDays} Days` },
          { label: "Travellers", value: `${data.travellersCount} Travellers` },
          { label: "Est. Distance", value: `${data.totalDistance} KM` },
        ],
      },
    });
  }

  // 3. MASTER JOURNEY TIMELINE (Paginated)
  if (options.sections.timeline && data.segments.length > 0) {
    const chunkSize = 4;
    for (let i = 0; i < data.segments.length; i += chunkSize) {
      const chunk = data.segments.slice(i, i + chunkSize);
      const pageNum = Math.floor(i / chunkSize) + 1;
      const totalPages = Math.ceil(data.segments.length / chunkSize);

      slides.push({
        id: slideId++,
        title: `Journey Timeline ${totalPages > 1 ? `(${pageNum}/${totalPages})` : ""}`,
        category: "Timeline",
        content: {
          heading: "MASTER JOURNEY TIMELINE",
          subheading: totalPages > 1 ? `Segment Route ${i + 1} to ${i + chunk.length}` : "Connected Segment Itinerary",
          timelineItems: chunk.map((seg) => ({
            date: seg.departure ? formatDate(seg.departure.split("T")[0]) : "",
            title: `${seg.from} → ${seg.to}`,
            subtitle: `${seg.transportType.toUpperCase()} ${seg.operator ? `• ${seg.operator}` : ""} ${seg.busNumber || seg.bookingNumber || ""}`,
            time: `${seg.departure ? seg.departure.split("T")[1]?.substring(0, 5) || "" : ""} - ${seg.arrival ? seg.arrival.split("T")[1]?.substring(0, 5) || "" : ""}`,
            type: seg.transportType,
            cost: seg.fare ? `₹${seg.fare}` : undefined,
            detail: seg.notes || (seg.seatNumber ? `Seat: ${seg.seatNumber}` : undefined),
          })),
        },
      });
    }
  }

  // 4. ROUTE VISUALIZATION
  if (options.sections.routeVisual && data.segments.length > 0) {
    const routeStops = [data.segments[0].from];
    data.segments.forEach((s) => {
      if (s.to && routeStops[routeStops.length - 1] !== s.to) {
        routeStops.push(s.to);
      }
    });

    slides.push({
      id: slideId++,
      title: "Route Map Flow",
      category: "Route",
      content: {
        heading: "TRIP ROUTE FLOW",
        subheading: `${routeStops.length} Major Waypoints`,
        cards: routeStops.map((stop, idx) => ({
          title: `Stop 0${idx + 1}`,
          subtitle: stop,
          badge: idx === 0 ? "START" : idx === routeStops.length - 1 ? "DESTINATION" : "WAYPOINT",
        })),
      },
    });
  }

  // 5. DAILY ITINERARY SLIDES
  if (options.sections.dailyItinerary && data.sortedDays.length > 0) {
    data.sortedDays.forEach((day, idx) => {
      const dayDate = formatDate(day.date);
      const items = [
        ...day.segments.map((s) => ({
          time: s.departure ? s.departure.split("T")[1]?.substring(0, 5) || "Departure" : "Travel",
          title: `${s.transportType}: ${s.from} → ${s.to}`,
          subtitle: `${s.operator || s.transportType} ${s.duration ? `(${s.duration})` : ""}`,
          type: "segment",
        })),
        ...day.activities.map((a) => ({
          time: a.time || "Activity",
          title: a.title,
          subtitle: `${a.location || a.category} ${a.description ? `• ${a.description}` : ""}`,
          type: "activity",
        })),
      ];

      slides.push({
        id: slideId++,
        title: `Day 0${idx + 1} - ${dayDate}`,
        category: "Daily Itinerary",
        content: {
          heading: `DAY 0${idx + 1} — ${dayDate.toUpperCase()}`,
          subheading: "DAILY SCHEDULE & ITINERARY",
          timelineItems: items.length > 0 ? items.map((it) => ({
            time: it.time,
            title: it.title,
            subtitle: it.subtitle,
          })) : [{ title: "Free Exploration & Leisure Day", subtitle: "No scheduled transport segments" }],
        },
      });
    });
  }

  // 6. TRANSPORTATION SUMMARY
  if (options.sections.transportation && data.segments.length > 0) {
    const transportTypes = Object.entries(data.transportCounts).map(([type, count]) => ({
      title: type,
      subtitle: `${count} ${count === 1 ? "Segment" : "Segments"}`,
      badge: "TRANSPORT",
    }));

    slides.push({
      id: slideId++,
      title: "Transportation Breakdown",
      category: "Transport",
      content: {
        heading: "GETTING THERE — TRANSPORT SUMMARY",
        subheading: `${data.segments.length} Total Journey Segments`,
        cards: transportTypes,
        metrics: [
          { label: "Total Distance", value: `${data.totalDistance} KM` },
          { label: "Transport Cost", value: data.totalTransportCost ? `₹${data.totalTransportCost}` : "Included" },
          { label: "Total Segments", value: `${data.segments.length}` },
        ],
      },
    });
  }

  // 7. ACTIVITIES
  if (options.sections.activities && data.activities.length > 0) {
    slides.push({
      id: slideId++,
      title: "Activities & Sightseeing",
      category: "Activities",
      content: {
        heading: "THINGS WE'RE DOING",
        subheading: `${data.activities.length} Planned Highlights`,
        cards: data.activities.slice(0, 6).map((act) => ({
          title: act.title,
          subtitle: act.location ? `📍 ${act.location}` : act.category,
          desc: act.description || act.notes,
          badge: act.time || "Scheduled",
        })),
      },
    });
  }

  // 8. HOTELS
  if (options.sections.hotels && data.hotels.length > 0) {
    slides.push({
      id: slideId++,
      title: "Accommodations & Stays",
      category: "Hotels",
      content: {
        heading: "OUR STAYS & HOTELS",
        subheading: `${data.hotels.length} Saved Places`,
        cards: data.hotels.map((h) => ({
          title: h.hotelName,
          subtitle: h.address || "Accommodation",
          desc: `Check-in: ${formatDate(h.checkIn)} • Check-out: ${formatDate(h.checkOut)}`,
          badge: h.status || "Booked",
          detail: h.bookingId ? `Booking ID: ${h.bookingId}` : undefined,
        })),
      },
    });
  }

  // 9. SUMMARY / CLOSING
  if (options.sections.summary) {
    slides.push({
      id: slideId++,
      title: "Closing Slide",
      category: "Summary",
      content: {
        heading: "READY FOR THE JOURNEY?",
        subheading: data.tripName,
        badge: `${data.origin} → ${data.destination}`,
        footerText: "Have a safe & unforgettable journey! • Powered by TripPro",
      },
    });
  }

  return slides;
}

/**
 * Builds and downloads a real .pptx file using pptxgenjs
 */
export async function downloadPowerPointPresentation(trip: Trip, options: PresentationOptions): Promise<string> {
  const data = collectTripData(trip);
  const pptx = new pptxgen();

  // Color theme definitions
  const PRIMARY_HEX = "1B3EBF";
  const PRIMARY_DARK = "0E227A";
  const LIGHT_BG = "F0F4FF";
  const WHITE = "FFFFFF";
  const TEXT_DARK = "0F172A";
  const TEXT_MUTED = "64748B";
  const ACCENT_BORDER = "C7D2FE";

  // Widescreen 16:9 layout (13.33 x 7.5 inches)
  pptx.layout = "LAYOUT_16x9";

  // -------------------------------------------------------------
  // SLIDE 1: COVER
  // -------------------------------------------------------------
  if (options.sections.cover) {
    const slide = pptx.addSlide();
    slide.background = { color: PRIMARY_HEX };

    // Decorative subtle banner shape
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8,
      y: 0.8,
      w: 11.73,
      h: 5.9,
      fill: { color: PRIMARY_DARK },
      line: { color: "3B82F6", width: 1.5 },
      rectRadius: 0.2,
    });

    // Header Title
    slide.addText(data.tripName.toUpperCase(), {
      x: 1.2,
      y: 1.4,
      w: 10.9,
      h: 1.2,
      fontSize: 38,
      bold: true,
      color: WHITE,
      fontFace: "Calibri",
      wrap: true,
    });

    // Subtitle / Route
    slide.addText(`ROUTE: ${data.origin.toUpperCase()} → ${data.destination.toUpperCase()}`, {
      x: 1.2,
      y: 2.7,
      w: 10.9,
      h: 0.6,
      fontSize: 22,
      bold: true,
      color: "93C5FD",
      fontFace: "Calibri",
    });

    // Divider
    slide.addShape(pptx.ShapeType.line, {
      x: 1.2,
      y: 3.5,
      w: 10.9,
      h: 0,
      line: { color: "60A5FA", width: 2 },
    });

    // Metrics Row
    const metricsY = 4.0;
    // Dates Box
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 1.2,
      y: metricsY,
      w: 3.4,
      h: 1.8,
      fill: { color: PRIMARY_HEX },
      line: { color: "60A5FA", width: 1 },
      rectRadius: 0.15,
    });
    slide.addText("DATES", { x: 1.4, y: metricsY + 0.2, w: 3.0, h: 0.3, fontSize: 12, bold: true, color: "93C5FD" });
    slide.addText(`${data.startDate}\nto ${data.endDate}`, { x: 1.4, y: metricsY + 0.5, w: 3.0, h: 1.0, fontSize: 18, bold: true, color: WHITE });

    // Duration Box
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 4.9,
      y: metricsY,
      w: 3.4,
      h: 1.8,
      fill: { color: PRIMARY_HEX },
      line: { color: "60A5FA", width: 1 },
      rectRadius: 0.15,
    });
    slide.addText("DURATION", { x: 5.1, y: metricsY + 0.2, w: 3.0, h: 0.3, fontSize: 12, bold: true, color: "93C5FD" });
    slide.addText(`${data.durationDays} Days`, { x: 5.1, y: metricsY + 0.6, w: 3.0, h: 0.8, fontSize: 24, bold: true, color: WHITE });

    // Travellers Box
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 8.6,
      y: metricsY,
      w: 3.5,
      h: 1.8,
      fill: { color: PRIMARY_HEX },
      line: { color: "60A5FA", width: 1 },
      rectRadius: 0.15,
    });
    slide.addText("TRAVELLERS", { x: 8.8, y: metricsY + 0.2, w: 3.1, h: 0.3, fontSize: 12, bold: true, color: "93C5FD" });
    slide.addText(`${data.travellersCount} People`, { x: 8.8, y: metricsY + 0.6, w: 3.1, h: 0.8, fontSize: 24, bold: true, color: WHITE });

    // Footer badge
    slide.addText("TripPro Presentation Generator", {
      x: 1.2,
      y: 6.2,
      w: 10.9,
      h: 0.4,
      fontSize: 11,
      color: "93C5FD",
      align: "right",
    });
  }

  // Helper function to create standard header on slides
  const addSlideHeader = (slide: any, title: string, subtitle: string) => {
    slide.background = { color: "F8FAFC" };

    // Top Header Banner
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.6,
      y: 0.5,
      w: 12.13,
      h: 1.1,
      fill: { color: PRIMARY_HEX },
      rectRadius: 0.15,
    });

    slide.addText(title.toUpperCase(), {
      x: 0.9,
      y: 0.6,
      w: 10.0,
      h: 0.5,
      fontSize: 22,
      bold: true,
      color: WHITE,
      fontFace: "Calibri",
    });

    slide.addText(subtitle, {
      x: 0.9,
      y: 1.0,
      w: 10.0,
      h: 0.4,
      fontSize: 13,
      color: "93C5FD",
      fontFace: "Calibri",
    });

    // Logo / Branding on top right
    slide.addText("TripPro", {
      x: 10.8,
      y: 0.7,
      w: 1.6,
      h: 0.6,
      fontSize: 16,
      bold: true,
      color: WHITE,
      align: "right",
    });
  };

  // -------------------------------------------------------------
  // SLIDE 2: TRIP AT A GLANCE
  // -------------------------------------------------------------
  if (options.sections.overview) {
    const slide = pptx.addSlide();
    addSlideHeader(slide, "Trip at a Glance", `${data.origin} → ${data.destination}`);

    const cards = [
      { title: "ORIGIN & DESTINATION", val: `${data.origin} → ${data.destination}`, icon: "📍" },
      { title: "DEPARTURE DATE", val: data.startDate || "Not Specified", icon: "📅" },
      { title: "RETURN DATE", val: data.endDate || "Not Specified", icon: "🏁" },
      { title: "TOTAL DURATION", val: `${data.durationDays} Days`, icon: "⏱️" },
      { title: "TRAVELLERS", val: `${data.travellersCount} Person(s)`, icon: "👥" },
      { title: "ORGANIZER", val: data.organizer, icon: "👤" },
    ];

    cards.forEach((card, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const x = 0.6 + col * 4.1;
      const y = 1.9 + row * 2.5;

      slide.addShape(pptx.ShapeType.roundRect, {
        x,
        y,
        w: 3.9,
        h: 2.2,
        fill: { color: WHITE },
        line: { color: ACCENT_BORDER, width: 1 },
        rectRadius: 0.15,
      });

      slide.addText(card.icon, { x: x + 0.3, y: y + 0.3, w: 0.8, h: 0.5, fontSize: 24 });
      slide.addText(card.title, {
        x: x + 0.3,
        y: y + 0.9,
        w: 3.3,
        h: 0.3,
        fontSize: 11,
        bold: true,
        color: PRIMARY_HEX,
      });

      slide.addText(card.val, {
        x: x + 0.3,
        y: y + 1.2,
        w: 3.3,
        h: 0.8,
        fontSize: 16,
        bold: true,
        color: TEXT_DARK,
        wrap: true,
      });
    });
  }

  // -------------------------------------------------------------
  // SLIDE 3: MASTER JOURNEY TIMELINE (Paginated)
  // -------------------------------------------------------------
  if (options.sections.timeline && data.segments.length > 0) {
    const chunkSize = 4;
    for (let i = 0; i < data.segments.length; i += chunkSize) {
      const chunk = data.segments.slice(i, i + chunkSize);
      const pageNum = Math.floor(i / chunkSize) + 1;
      const totalPages = Math.ceil(data.segments.length / chunkSize);

      const slide = pptx.addSlide();
      addSlideHeader(
        slide,
        "Master Journey Timeline",
        `Segment Itinerary Flow ${totalPages > 1 ? `(Page ${pageNum} of ${totalPages})` : ""}`
      );

      // Main vertical connector line
      slide.addShape(pptx.ShapeType.line, {
        x: 1.2,
        y: 2.1,
        w: 0,
        h: chunk.length * 1.2,
        line: { color: PRIMARY_HEX, width: 3 },
      });

      chunk.forEach((seg, idx) => {
        const y = 2.0 + idx * 1.2;

        // Node circle
        slide.addShape(pptx.ShapeType.ellipse, {
          x: 1.08,
          y: y + 0.1,
          w: 0.24,
          h: 0.24,
          fill: { color: PRIMARY_HEX },
          line: { color: WHITE, width: 2 },
        });

        // Content Card
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 1.6,
          y: y,
          w: 11.0,
          h: 1.0,
          fill: { color: WHITE },
          line: { color: ACCENT_BORDER, width: 1 },
          rectRadius: 0.12,
        });

        // Transport Type Badge
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 1.8,
          y: y + 0.15,
          w: 1.4,
          h: 0.35,
          fill: { color: LIGHT_BG },
          rectRadius: 0.08,
        });
        slide.addText(seg.transportType.toUpperCase(), {
          x: 1.8,
          y: y + 0.15,
          w: 1.4,
          h: 0.35,
          fontSize: 10,
          bold: true,
          color: PRIMARY_HEX,
          align: "center",
          valign: "middle",
        });

        // Route Title
        slide.addText(`${seg.from} → ${seg.to}`, {
          x: 3.4,
          y: y + 0.12,
          w: 5.5,
          h: 0.4,
          fontSize: 15,
          bold: true,
          color: TEXT_DARK,
        });

        // Details line
        const details = [
          seg.departure ? `Dep: ${seg.departure.split("T")[1]?.substring(0, 5) || seg.departure}` : "",
          seg.arrival ? `Arr: ${seg.arrival.split("T")[1]?.substring(0, 5) || seg.arrival}` : "",
          seg.operator ? `Operator: ${seg.operator}` : "",
          seg.busNumber || seg.bookingNumber ? `Ref: ${seg.busNumber || seg.bookingNumber}` : "",
        ]
          .filter(Boolean)
          .join(" • ");

        slide.addText(details || "Scheduled Journey Segment", {
          x: 3.4,
          y: y + 0.52,
          w: 5.5,
          h: 0.35,
          fontSize: 11,
          color: TEXT_MUTED,
        });

        // Fare Badge if exists
        if (seg.fare) {
          slide.addShape(pptx.ShapeType.roundRect, {
            x: 10.0,
            y: y + 0.25,
            w: 2.3,
            h: 0.5,
            fill: { color: "DCFCE7" },
            line: { color: "86EFAC", width: 1 },
            rectRadius: 0.1,
          });
          slide.addText(`Fare: ₹${seg.fare}`, {
            x: 10.0,
            y: y + 0.25,
            w: 2.3,
            h: 0.5,
            fontSize: 12,
            bold: true,
            color: "166534",
            align: "center",
            valign: "middle",
          });
        }
      });
    }
  }

  // -------------------------------------------------------------
  // SLIDE 4: ROUTE VISUALIZATION
  // -------------------------------------------------------------
  if (options.sections.routeVisual && data.segments.length > 0) {
    const routeStops = [data.segments[0].from];
    data.segments.forEach((s) => {
      if (s.to && routeStops[routeStops.length - 1] !== s.to) {
        routeStops.push(s.to);
      }
    });

    const slide = pptx.addSlide();
    addSlideHeader(slide, "Trip Route Flowchart", `${routeStops.length} Main Locations`);

    const maxCol = Math.min(routeStops.length, 5);
    const stopWidth = 2.1;
    const gap = 0.3;

    routeStops.slice(0, 5).forEach((stop, idx) => {
      const x = 0.8 + idx * (stopWidth + gap);
      const y = 3.0;

      // Stop Box
      slide.addShape(pptx.ShapeType.roundRect, {
        x,
        y,
        w: stopWidth,
        h: 1.8,
        fill: { color: idx === 0 || idx === routeStops.length - 1 ? PRIMARY_HEX : WHITE },
        line: { color: PRIMARY_HEX, width: 1.5 },
        rectRadius: 0.15,
      });

      slide.addText(`STOP 0${idx + 1}`, {
        x,
        y: y + 0.2,
        w: stopWidth,
        h: 0.3,
        fontSize: 11,
        bold: true,
        color: idx === 0 || idx === routeStops.length - 1 ? "93C5FD" : PRIMARY_HEX,
        align: "center",
      });

      slide.addText(stop, {
        x: x + 0.1,
        y: y + 0.6,
        w: stopWidth - 0.2,
        h: 1.0,
        fontSize: 14,
        bold: true,
        color: idx === 0 || idx === routeStops.length - 1 ? WHITE : TEXT_DARK,
        align: "center",
        wrap: true,
      });

      // Connecting arrow
      if (idx < maxCol - 1) {
        slide.addText("➔", {
          x: x + stopWidth,
          y: y + 0.6,
          w: gap,
          h: 0.5,
          fontSize: 20,
          color: PRIMARY_HEX,
          align: "center",
        });
      }
    });
  }

  // -------------------------------------------------------------
  // SLIDE 5: DAILY ITINERARY SLIDES
  // -------------------------------------------------------------
  if (options.sections.dailyItinerary && data.sortedDays.length > 0) {
    data.sortedDays.forEach((day, idx) => {
      const dayDate = formatDate(day.date);
      const slide = pptx.addSlide();
      addSlideHeader(slide, `Day 0${idx + 1} Itinerary`, dayDate);

      const items = [
        ...day.segments.map((s) => ({
          time: s.departure ? s.departure.split("T")[1]?.substring(0, 5) || "Departure" : "Travel",
          title: `${s.transportType}: ${s.from} → ${s.to}`,
          subtitle: `${s.operator || s.transportType} ${s.duration ? `(${s.duration})` : ""}`,
          tag: "TRANSPORT",
        })),
        ...day.activities.map((a) => ({
          time: a.time || "Activity",
          title: a.title,
          subtitle: `${a.location || a.category} ${a.description ? `• ${a.description}` : ""}`,
          tag: "ACTIVITY",
        })),
      ];

      if (items.length === 0) {
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 1.5,
          y: 2.2,
          w: 10.33,
          h: 3.5,
          fill: { color: WHITE },
          line: { color: ACCENT_BORDER, width: 1 },
          rectRadius: 0.2,
        });

        slide.addText("🌴 FREE EXPLORATION & LEISURE DAY", {
          x: 1.5,
          y: 3.2,
          w: 10.33,
          h: 0.6,
          fontSize: 20,
          bold: true,
          color: PRIMARY_HEX,
          align: "center",
        });
        slide.addText("No scheduled transport segments or formal activities.", {
          x: 1.5,
          y: 3.8,
          w: 10.33,
          h: 0.4,
          fontSize: 14,
          color: TEXT_MUTED,
          align: "center",
        });
      } else {
        items.slice(0, 5).forEach((item, itemIdx) => {
          const y = 1.9 + itemIdx * 1.05;

          slide.addShape(pptx.ShapeType.roundRect, {
            x: 0.8,
            y,
            w: 11.73,
            h: 0.9,
            fill: { color: WHITE },
            line: { color: ACCENT_BORDER, width: 1 },
            rectRadius: 0.12,
          });

          // Time pill
          slide.addShape(pptx.ShapeType.roundRect, {
            x: 1.0,
            y: y + 0.15,
            w: 1.5,
            h: 0.6,
            fill: { color: LIGHT_BG },
            rectRadius: 0.1,
          });
          slide.addText(item.time, {
            x: 1.0,
            y: y + 0.15,
            w: 1.5,
            h: 0.6,
            fontSize: 12,
            bold: true,
            color: PRIMARY_HEX,
            align: "center",
            valign: "middle",
          });

          // Title
          slide.addText(item.title, {
            x: 2.7,
            y: y + 0.12,
            w: 7.5,
            h: 0.35,
            fontSize: 14,
            bold: true,
            color: TEXT_DARK,
          });

          // Subtitle
          slide.addText(item.subtitle, {
            x: 2.7,
            y: y + 0.45,
            w: 7.5,
            h: 0.35,
            fontSize: 11,
            color: TEXT_MUTED,
          });

          // Category Tag
          slide.addShape(pptx.ShapeType.roundRect, {
            x: 10.5,
            y: y + 0.2,
            w: 1.8,
            h: 0.5,
            fill: { color: item.tag === "TRANSPORT" ? "E0E7FF" : "FEF3C7" },
            rectRadius: 0.08,
          });
          slide.addText(item.tag, {
            x: 10.5,
            y: y + 0.2,
            w: 1.8,
            h: 0.5,
            fontSize: 10,
            bold: true,
            color: item.tag === "TRANSPORT" ? PRIMARY_HEX : "B45309",
            align: "center",
            valign: "middle",
          });
        });
      }
    });
  }

  // -------------------------------------------------------------
  // SLIDE 6: TRANSPORTATION SUMMARY
  // -------------------------------------------------------------
  if (options.sections.transportation && data.segments.length > 0) {
    const slide = pptx.addSlide();
    addSlideHeader(slide, "Transportation Breakdown", `${data.segments.length} Total Journey Segments`);

    // Top metrics
    const metrics = [
      { label: "TOTAL DISTANCE", val: `${data.totalDistance} KM` },
      { label: "TOTAL FARE COST", val: data.totalTransportCost ? `₹${data.totalTransportCost}` : "Included" },
      { label: "TOTAL SEGMENTS", val: `${data.segments.length}` },
    ];

    metrics.forEach((m, idx) => {
      const x = 0.8 + idx * 4.0;
      slide.addShape(pptx.ShapeType.roundRect, {
        x,
        y: 1.9,
        w: 3.7,
        h: 1.2,
        fill: { color: PRIMARY_HEX },
        rectRadius: 0.15,
      });
      slide.addText(m.label, { x: x + 0.2, y: 2.1, w: 3.3, h: 0.3, fontSize: 10, bold: true, color: "93C5FD" });
      slide.addText(m.val, { x: x + 0.2, y: 2.4, w: 3.3, h: 0.5, fontSize: 20, bold: true, color: WHITE });
    });

    // Breakdown grid
    const transportList = Object.entries(data.transportCounts);
    transportList.forEach(([type, count], idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const x = 0.8 + col * 3.0;
      const y = 3.4 + row * 1.8;

      slide.addShape(pptx.ShapeType.roundRect, {
        x,
        y,
        w: 2.8,
        h: 1.5,
        fill: { color: WHITE },
        line: { color: ACCENT_BORDER, width: 1 },
        rectRadius: 0.15,
      });

      slide.addText(type.toUpperCase(), { x: x + 0.2, y: y + 0.3, w: 2.4, h: 0.3, fontSize: 12, bold: true, color: PRIMARY_HEX });
      slide.addText(`${count} Segments`, { x: x + 0.2, y: y + 0.7, w: 2.4, h: 0.5, fontSize: 16, bold: true, color: TEXT_DARK });
    });
  }

  // -------------------------------------------------------------
  // SLIDE 7: ACTIVITIES SLIDE
  // -------------------------------------------------------------
  if (options.sections.activities && data.activities.length > 0) {
    const slide = pptx.addSlide();
    addSlideHeader(slide, "Things We're Doing", `${data.activities.length} Planned Highlights`);

    data.activities.slice(0, 6).forEach((act, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const x = 0.8 + col * 4.0;
      const y = 1.9 + row * 2.5;

      slide.addShape(pptx.ShapeType.roundRect, {
        x,
        y,
        w: 3.8,
        h: 2.3,
        fill: { color: WHITE },
        line: { color: ACCENT_BORDER, width: 1 },
        rectRadius: 0.15,
      });

      // Time tag
      slide.addShape(pptx.ShapeType.roundRect, {
        x: x + 0.2,
        y: y + 0.2,
        w: 1.8,
        h: 0.35,
        fill: { color: LIGHT_BG },
        rectRadius: 0.08,
      });
      slide.addText(act.time || "Scheduled", {
        x: x + 0.2,
        y: y + 0.2,
        w: 1.8,
        h: 0.35,
        fontSize: 10,
        bold: true,
        color: PRIMARY_HEX,
        align: "center",
        valign: "middle",
      });

      // Title
      slide.addText(act.title, {
        x: x + 0.2,
        y: y + 0.7,
        w: 3.4,
        h: 0.5,
        fontSize: 14,
        bold: true,
        color: TEXT_DARK,
        wrap: true,
      });

      // Location / Category
      slide.addText(act.location ? `📍 ${act.location}` : `Category: ${act.category}`, {
        x: x + 0.2,
        y: y + 1.25,
        w: 3.4,
        h: 0.35,
        fontSize: 11,
        color: PRIMARY_HEX,
      });

      // Description
      if (act.description || act.notes) {
        slide.addText(act.description || act.notes || "", {
          x: x + 0.2,
          y: y + 1.6,
          w: 3.4,
          h: 0.5,
          fontSize: 10,
          color: TEXT_MUTED,
          wrap: true,
        });
      }
    });
  }

  // -------------------------------------------------------------
  // SLIDE 8: HOTELS SLIDE
  // -------------------------------------------------------------
  if (options.sections.hotels && data.hotels.length > 0) {
    const slide = pptx.addSlide();
    addSlideHeader(slide, "Our Stays & Accommodations", `${data.hotels.length} Saved Places`);

    data.hotels.slice(0, 4).forEach((h, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = 0.8 + col * 6.0;
      const y = 1.9 + row * 2.5;

      slide.addShape(pptx.ShapeType.roundRect, {
        x,
        y,
        w: 5.7,
        h: 2.3,
        fill: { color: WHITE },
        line: { color: ACCENT_BORDER, width: 1 },
        rectRadius: 0.15,
      });

      slide.addText("🏨", { x: x + 0.3, y: y + 0.3, w: 0.6, h: 0.5, fontSize: 24 });
      slide.addText(h.hotelName, {
        x: x + 1.0,
        y: y + 0.3,
        w: 4.4,
        h: 0.5,
        fontSize: 16,
        bold: true,
        color: TEXT_DARK,
      });

      if (h.address) {
        slide.addText(`📍 ${h.address}`, {
          x: x + 1.0,
          y: y + 0.8,
          w: 4.4,
          h: 0.35,
          fontSize: 11,
          color: TEXT_MUTED,
        });
      }

      const dates = `Check-in: ${formatDate(h.checkIn)} • Check-out: ${formatDate(h.checkOut)}`;
      slide.addText(dates, {
        x: x + 0.3,
        y: y + 1.3,
        w: 5.1,
        h: 0.35,
        fontSize: 11,
        bold: true,
        color: PRIMARY_HEX,
      });

      if (h.bookingId) {
        slide.addText(`Booking Reference: ${h.bookingId}`, {
          x: x + 0.3,
          y: y + 1.7,
          w: 5.1,
          h: 0.35,
          fontSize: 11,
          color: TEXT_MUTED,
        });
      }
    });
  }

  // -------------------------------------------------------------
  // SLIDE 9: SUMMARY & CLOSING
  // -------------------------------------------------------------
  if (options.sections.summary) {
    const slide = pptx.addSlide();
    slide.background = { color: PRIMARY_HEX };

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 1.0,
      y: 1.0,
      w: 11.33,
      h: 5.5,
      fill: { color: PRIMARY_DARK },
      line: { color: "60A5FA", width: 1.5 },
      rectRadius: 0.2,
    });

    slide.addText("READY FOR THE JOURNEY?", {
      x: 1.2,
      y: 2.0,
      w: 10.93,
      h: 0.8,
      fontSize: 36,
      bold: true,
      color: WHITE,
      align: "center",
      fontFace: "Calibri",
    });

    slide.addText(data.tripName, {
      x: 1.2,
      y: 2.9,
      w: 10.93,
      h: 0.5,
      fontSize: 22,
      bold: true,
      color: "93C5FD",
      align: "center",
      fontFace: "Calibri",
    });

    slide.addText(`${data.origin.toUpperCase()} → ${data.destination.toUpperCase()}`, {
      x: 1.2,
      y: 3.5,
      w: 10.93,
      h: 0.5,
      fontSize: 18,
      color: WHITE,
      align: "center",
      fontFace: "Calibri",
    });

    slide.addText("Have a safe & unforgettable journey!", {
      x: 1.2,
      y: 4.8,
      w: 10.93,
      h: 0.5,
      fontSize: 16,
      color: "93C5FD",
      align: "center",
      fontFace: "Calibri",
    });

    slide.addText("TripPro • Automatic Presentation Generator", {
      x: 1.2,
      y: 5.6,
      w: 10.93,
      h: 0.4,
      fontSize: 12,
      color: "60A5FA",
      align: "center",
      fontFace: "Calibri",
    });
  }

  // Save PPTX
  const fileName = `${sanitizeFileName(trip.name)}.pptx`;
  await pptx.writeFile({ fileName });

  return fileName;
}
