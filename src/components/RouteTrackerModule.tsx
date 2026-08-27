import React, { useState, useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Trip, RouteSession, RoutePoint } from "../types";
import { User } from "firebase/auth";
import {
  MapPin,
  Play,
  Pause,
  Square,
  Navigation,
  Compass,
  Layers,
  Maximize2,
  Minimize2,
  RotateCcw,
  Clock,
  Gauge,
  ShieldCheck,
  AlertTriangle,
  History,
  Trash2,
  CheckCircle2,
  Check,
  X,
  Share2,
  Flag,
  ArrowRight,
  TrendingUp,
  Map as MapIcon,
  ChevronRight
} from "lucide-react";
import { db } from "../lib/firebase";
import { useConnectivity } from "../lib/useConnectivity";
import {
  saveActiveRouteToStorage,
  getActiveRouteFromStorage,
  clearActiveRouteFromStorage,
  saveCompletedRouteToStorage,
  getCompletedRoutesFromStorage,
  deleteCompletedRouteFromStorage
} from "../lib/routeStorage";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  where
} from "firebase/firestore";

interface RouteTrackerModuleProps {
  trip: Trip;
  currentUser: User | null;
}

export interface ActiveRouteSessionState {
  id: string;
  tripId: string;
  userId: string;
  status: "tracking" | "paused";
  startTimestamp: number;
  accumulatedPausedSeconds: number;
  pausedAtTimestamp: number | null;
  lastUpdateTimestamp: number;
  totalDistanceKm: number;
  currentSpeedKmh: number;
  maxSpeedKmh: number;
  lastKnownPosition: {
    lat: number;
    lng: number;
    accuracy: number;
    speed: number;
    heading: number | null;
    timestamp: number;
  } | null;
  points: {
    lat: number;
    lng: number;
    timestamp: string;
    accuracy: number;
    speed: number;
  }[];
  pauseLocations?: { lat: number; lng: number; time?: string }[];
}

interface StoredRouteSession {
  id: string;
  tripId: string;
  userId: string;
  title: string;
  startTime: string;
  endTime: string;
  status: "ended";
  totalDistanceKm: number;
  totalDurationSeconds: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  startLocationName?: string;
  endLocationName?: string;
  points: {
    lat: number;
    lng: number;
    timestamp: string;
    accuracy: number;
    speed: number;
  }[];
  createdAt: string;
}

// Compute accurate elapsed active tracking seconds (excludes paused duration)
function computeElapsedSeconds(
  startTimestamp: number | null,
  accumulatedPausedSeconds: number,
  pausedAtTimestamp: number | null
): number {
  if (!startTimestamp) return 0;
  const endTime = pausedAtTimestamp ? pausedAtTimestamp : Date.now();
  const rawElapsed = Math.floor((endTime - startTimestamp) / 1000);
  return Math.max(0, rawElapsed - accumulatedPausedSeconds);
}

// Calculate Haversine distance in KM
function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Format seconds into hh:mm:ss or Xh Xm
function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

// Format duration for Route Summary screen (e.g. 42m, 3h 42m, 1d 3h 20m)
function formatRouteDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return "0m";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDurationDigital(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

// Reverse geocode lat/lng to city/area name
async function fetchLocationName(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12`,
      { headers: { "Accept-Language": "en" } }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address;
      if (addr) {
        const name =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.suburb ||
          addr.municipality ||
          addr.county ||
          addr.state_district;
        if (name) return name;
        if (data.display_name) return data.display_name.split(",")[0].trim();
      }
    }
  } catch (e) {
    // fallback
  }
  return `Lat ${lat.toFixed(3)}°, Lon ${lng.toFixed(3)}°`;
}

// Lightweight static Leaflet route preview map for history cards
interface RouteCardMapPreviewProps {
  points: { lat: number; lng: number }[];
  className?: string;
}

const RouteCardMapPreview: React.FC<RouteCardMapPreviewProps> = ({ points, className = "" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
      attributionControl: false
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19
    }).addTo(map);

    mapRef.current = map;

    if (points && points.length > 0) {
      const latLngs: [number, number][] = points.map((p) => [p.lat, p.lng]);
      L.polyline(latLngs, {
        color: "#4f46e5",
        weight: 3.5,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round"
      }).addTo(map);

      // Start marker (green dot)
      L.circleMarker(latLngs[0], {
        radius: 5,
        fillColor: "#10b981",
        color: "#ffffff",
        weight: 2,
        fillOpacity: 1
      }).addTo(map);

      // End marker (red dot)
      if (latLngs.length > 1) {
        L.circleMarker(latLngs[latLngs.length - 1], {
          radius: 5,
          fillColor: "#f43f5e",
          color: "#ffffff",
          weight: 2,
          fillOpacity: 1
        }).addTo(map);
      }

      const bounds = L.latLngBounds(latLngs);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [12, 12], animate: false });
      }
    } else {
      map.setView([20, 0], 2);
    }

    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [points]);

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800 pointer-events-none bg-slate-100 dark:bg-slate-900 ${className}`}
    >
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

// Detailed full-size Leaflet map component for "View Route" detail view
const DetailedRouteLargeMap: React.FC<{ points: { lat: number; lng: number }[] }> = ({
  points
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19
    }).addTo(map);

    mapRef.current = map;

    if (points && points.length > 0) {
      const latLngs: [number, number][] = points.map((p) => [p.lat, p.lng]);
      L.polyline(latLngs, {
        color: "#2563eb",
        weight: 5,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round"
      }).addTo(map);

      // Start Marker
      const startPt = latLngs[0];
      const startIcon = L.divIcon({
        className: "custom-start-marker",
        html: `
          <div class="flex items-center gap-1 bg-emerald-600 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-lg border-2 border-white">
            START
          </div>
        `,
        iconSize: [60, 26],
        iconAnchor: [30, 13]
      });
      L.marker(startPt, { icon: startIcon }).addTo(map);

      // End Marker
      if (latLngs.length > 1) {
        const endPt = latLngs[latLngs.length - 1];
        const endIcon = L.divIcon({
          className: "custom-end-marker",
          html: `
            <div class="flex items-center gap-1 bg-rose-600 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-full shadow-lg border-2 border-white">
              END
            </div>
          `,
          iconSize: [52, 26],
          iconAnchor: [26, 13]
        });
        L.marker(endPt, { icon: endIcon }).addTo(map);
      }

      const bounds = L.latLngBounds(latLngs);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [35, 35], animate: false });
      }
    } else {
      map.setView([20, 0], 2);
    }

    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [points]);

  return (
    <div className="relative w-full h-64 sm:h-80 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 shadow-inner">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

export const RouteTrackerModule: React.FC<RouteTrackerModuleProps> = ({
  trip,
  currentUser
}) => {
  // Map and Tile states
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polylineLayerRef = useRef<L.Polyline | null>(null);
  const currentMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);
  const stopMarkersGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Map settings
  const [mapType, setMapType] = useState<"streets" | "satellite" | "voyager">("voyager");
  const [autoCenter, setAutoCenter] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Tracking state
  const [trackingState, setTrackingState] = useState<"idle" | "tracking" | "paused">("idle");
  const [currentPosition, setCurrentPosition] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    speed: number;
    heading: number | null;
    timestamp: number;
  } | null>(null);

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [routePoints, setRoutePoints] = useState<
    { lat: number; lng: number; timestamp: string; accuracy: number; speed: number }[]
  >([]);
  const [totalDistanceKm, setTotalDistanceKm] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState<number>(0);
  const [maxSpeedKmh, setMaxSpeedKmh] = useState<number>(0);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsPermissionState, setGpsPermissionState] = useState<
    "prompt" | "granted" | "denied" | "unavailable"
  >("prompt");
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const isOnline = useConnectivity();
  const [isGpsWeak, setIsGpsWeak] = useState<boolean>(false);
  const [recoveredNotice, setRecoveredNotice] = useState<boolean>(false);

  // Active session timestamps & pause tracking states for durable persistence
  const [startTimestamp, setStartTimestamp] = useState<number | null>(null);
  const [accumulatedPausedSeconds, setAccumulatedPausedSeconds] = useState<number>(0);
  const [pausedAtTimestamp, setPausedAtTimestamp] = useState<number | null>(null);
  const [pauseLocations, setPauseLocations] = useState<{ lat: number; lng: number; time?: string }[]>([]);

  // UI state
  const [activeViewTab, setActiveViewTab] = useState<"live" | "history">("live");
  const [savedSessions, setSavedSessions] = useState<StoredRouteSession[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [selectedSessionToView, setSelectedSessionToView] = useState<StoredRouteSession | null>(null);
  const [viewingDetailedRoute, setViewingDetailedRoute] = useState<StoredRouteSession | null>(null);
  const [showEndConfirmation, setShowEndConfirmation] = useState<boolean>(false);
  const [completedSummary, setCompletedSummary] = useState<StoredRouteSession | null>(null);
  const [isSavingRoute, setIsSavingRoute] = useState<boolean>(false);
  const [saveRouteError, setSaveRouteError] = useState<string | null>(null);
  const [showDiscardConfirmation, setShowDiscardConfirmation] = useState<boolean>(false);
  const [journeyToDelete, setJourneyToDelete] = useState<StoredRouteSession | null>(null);
  const [isDeletingJourney, setIsDeletingJourney] = useState<boolean>(false);
  const [showLocationInstructionModal, setShowLocationInstructionModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const trackingStateRef = useRef(trackingState);
  trackingStateRef.current = trackingState;

  const activeSessionIdRef = useRef<string | null>(activeSessionId);
  activeSessionIdRef.current = activeSessionId;

  const startTimestampRef = useRef<number | null>(startTimestamp);
  startTimestampRef.current = startTimestamp;

  const accumulatedPausedSecondsRef = useRef<number>(accumulatedPausedSeconds);
  accumulatedPausedSecondsRef.current = accumulatedPausedSeconds;

  const pausedAtTimestampRef = useRef<number | null>(pausedAtTimestamp);
  pausedAtTimestampRef.current = pausedAtTimestamp;

  const pauseLocationsRef = useRef<{ lat: number; lng: number; time?: string }[]>(pauseLocations);
  pauseLocationsRef.current = pauseLocations;

  const currentPositionRef = useRef(currentPosition);
  currentPositionRef.current = currentPosition;

  const currentSpeedKmhRef = useRef<number>(currentSpeedKmh);
  currentSpeedKmhRef.current = currentSpeedKmh;

  const maxSpeedKmhRef = useRef<number>(maxSpeedKmh);
  maxSpeedKmhRef.current = maxSpeedKmh;

  const stationaryCountRef = useRef<number>(0);
  const consecutiveMovementsRef = useRef<number>(0);

  const routePointsRef = useRef(routePoints);
  routePointsRef.current = routePoints;

  const totalDistanceKmRef = useRef(totalDistanceKm);
  totalDistanceKmRef.current = totalDistanceKm;

  const autoCenterRef = useRef(autoCenter);
  autoCenterRef.current = autoCenter;

  // Helper to dynamically adjust map viewport zoom/bounds to fit recorded route + current position
  const adjustMapToFitRoute = (
    points: { lat: number; lng: number }[],
    currentPos?: { lat: number; lng: number } | null,
    animate = true
  ) => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const rawCoords: [number, number][] = points.map((p) => [p.lat, p.lng]);
    if (
      currentPos &&
      !rawCoords.some(
        (c) => Math.abs(c[0] - currentPos.lat) < 0.00001 && Math.abs(c[1] - currentPos.lng) < 0.00001
      )
    ) {
      rawCoords.push([currentPos.lat, currentPos.lng]);
    }

    if (rawCoords.length >= 2) {
      const bounds = L.latLngBounds(rawCoords);
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 18,
          animate: animate,
          duration: 0.8
        });
      }
    } else if (rawCoords.length === 1) {
      const target = rawCoords[0];
      if (animate) {
        map.flyTo(target, Math.max(map.getZoom(), 16), { duration: 0.8 });
      } else {
        map.setView(target, 16);
      }
    } else if (currentPos) {
      if (animate) {
        map.flyTo([currentPos.lat, currentPos.lng], 16, { duration: 0.8 });
      } else {
        map.setView([currentPos.lat, currentPos.lng], 16);
      }
    }
  };

  const localStorageActiveKey = `triplan_active_session_${trip.id}`;

  const saveActiveSessionToStorage = async (forceFirestore = false) => {
    if (!activeSessionIdRef.current || trackingStateRef.current === "idle") {
      return;
    }

    const sessionData: ActiveRouteSessionState = {
      id: activeSessionIdRef.current,
      tripId: trip.id,
      userId: currentUser?.uid || "guest_user",
      status: trackingStateRef.current === "paused" ? "paused" : "tracking",
      startTimestamp: startTimestampRef.current || Date.now(),
      accumulatedPausedSeconds: accumulatedPausedSecondsRef.current,
      pausedAtTimestamp: pausedAtTimestampRef.current,
      lastUpdateTimestamp: Date.now(),
      totalDistanceKm: totalDistanceKmRef.current,
      currentSpeedKmh: currentSpeedKmhRef.current,
      maxSpeedKmh: maxSpeedKmhRef.current,
      lastKnownPosition: currentPositionRef.current,
      points: routePointsRef.current,
      pauseLocations: pauseLocationsRef.current
    };

    // 1. Save to IndexedDB & LocalStorage
    await saveActiveRouteToStorage(sessionData);

    // 2. Save to Firestore asynchronously if online
    if (typeof navigator !== "undefined" && navigator.onLine) {
      try {
        const activeDocRef = doc(
          db,
          "trips",
          trip.id,
          "activeRouteSessions",
          currentUser?.uid || "guest_user"
        );
        setDoc(activeDocRef, sessionData).catch((err) => {
          console.warn("Firestore background sync warning:", err);
        });
      } catch (err) {
        // Non-blocking warning
      }
    }
  };

  const clearActiveSessionFromStorage = async () => {
    await clearActiveRouteFromStorage(trip.id);
    if (typeof navigator !== "undefined" && navigator.onLine) {
      try {
        const activeDocRef = doc(
          db,
          "trips",
          trip.id,
          "activeRouteSessions",
          currentUser?.uid || "guest_user"
        );
        await deleteDoc(activeDocRef).catch((err) => {
          console.warn("Firestore active tracking delete warning:", err);
        });
      } catch (err) {
        console.warn("Firestore active tracking delete warning:", err);
      }
    }
  };

  const renderRestoredRouteOnMap = (
    pts: { lat: number; lng: number }[],
    pauses: { lat: number; lng: number; time?: string }[],
    lastPos: { lat: number; lng: number } | null
  ) => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Draw restored polyline
    if (polylineLayerRef.current && pts.length > 0) {
      polylineLayerRef.current.setLatLngs(pts.map((p) => [p.lat, p.lng]));
    }

    // Draw Start Marker
    if (pts.length > 0) {
      const firstPt = pts[0];
      const startIcon = L.divIcon({
        className: "custom-start-marker",
        html: `
          <div class="flex items-center gap-1 bg-emerald-600 text-white text-[11px] font-extrabold px-2 py-1 rounded-full shadow-lg border-2 border-white">
            <span class="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            START
          </div>
        `,
        iconSize: [60, 26],
        iconAnchor: [30, 13]
      });
      if (startMarkerRef.current) {
        startMarkerRef.current.remove();
      }
      startMarkerRef.current = L.marker([firstPt.lat, firstPt.lng], { icon: startIcon }).addTo(map);
    }

    // Draw Pause Markers
    if (stopMarkersGroupRef.current) {
      stopMarkersGroupRef.current.clearLayers();
      pauses.forEach((p) => {
        const pauseIcon = L.divIcon({
          className: "custom-pause-marker",
          html: `
            <div class="flex items-center justify-center w-6 h-6 bg-amber-500 text-white rounded-full shadow-md border-2 border-white text-[10px] font-bold">
              ⏸
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        L.marker([p.lat, p.lng], { icon: pauseIcon })
          .bindPopup(`<b>Paused</b> ${p.time ? `at ${p.time}` : ""}`)
          .addTo(stopMarkersGroupRef.current);
      });
    }

    // Render User Marker & Zoom View
    const centerLat = lastPos ? lastPos.lat : pts.length > 0 ? pts[pts.length - 1].lat : null;
    const centerLng = lastPos ? lastPos.lng : pts.length > 0 ? pts[pts.length - 1].lng : null;

    if (centerLat !== null && centerLng !== null) {
      const currentCustomIcon = L.divIcon({
        className: "custom-live-user-marker",
        html: `
          <div class="relative flex items-center justify-center w-8 h-8">
            <span class="absolute w-8 h-8 bg-blue-500/30 rounded-full animate-ping"></span>
            <span class="absolute w-5 h-5 bg-blue-600 border-2 border-white rounded-full shadow-lg"></span>
            <span class="w-2 h-2 bg-white rounded-full"></span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      if (!currentMarkerRef.current) {
        currentMarkerRef.current = L.marker([centerLat, centerLng], {
          icon: currentCustomIcon,
          zIndexOffset: 1000
        }).addTo(map);
      } else {
        currentMarkerRef.current.setLatLng([centerLat, centerLng]);
      }

      if (pts.length > 0 || lastPos) {
        adjustMapToFitRoute(pts, lastPos, false);
      }
    }
  };

  const restoreActiveSession = async () => {
    let activeData: ActiveRouteSessionState | null = await getActiveRouteFromStorage(trip.id);

    // 2. Firestore check if local active route was not found
    if (!activeData && typeof navigator !== "undefined" && navigator.onLine) {
      try {
        const activeDocRef = doc(
          db,
          "trips",
          trip.id,
          "activeRouteSessions",
          currentUser?.uid || "guest_user"
        );
        const snap = await getDoc(activeDocRef);
        if (snap.exists()) {
          activeData = snap.data() as ActiveRouteSessionState;
        }
      } catch (err) {
        console.warn("Firestore fetch active route session warning:", err);
      }
    }

    if (!activeData || (activeData as any).status === "ended") {
      return false;
    }

    const {
      id,
      status,
      startTimestamp: savedStartTs,
      accumulatedPausedSeconds: savedPausedSec,
      pausedAtTimestamp: savedPausedTs,
      totalDistanceKm: savedDist,
      currentSpeedKmh: savedSpeed,
      maxSpeedKmh: savedMaxSpeed,
      lastKnownPosition: savedPos,
      points: savedPoints,
      pauseLocations: savedPauseLocs
    } = activeData;

    setActiveSessionId(id);
    activeSessionIdRef.current = id;

    const validPoints = savedPoints || [];
    setRoutePoints(validPoints);
    routePointsRef.current = validPoints;

    const validPauseLocs = savedPauseLocs || [];
    setPauseLocations(validPauseLocs);
    pauseLocationsRef.current = validPauseLocs;

    const dist = savedDist || 0;
    setTotalDistanceKm(dist);
    totalDistanceKmRef.current = dist;

    const speed = savedSpeed || 0;
    setCurrentSpeedKmh(speed);
    currentSpeedKmhRef.current = speed;

    const maxSpd = savedMaxSpeed || 0;
    setMaxSpeedKmh(maxSpd);
    maxSpeedKmhRef.current = maxSpd;

    const startTs = savedStartTs || Date.now();
    setStartTimestamp(startTs);
    startTimestampRef.current = startTs;

    const pausedSec = savedPausedSec || 0;
    setAccumulatedPausedSeconds(pausedSec);
    accumulatedPausedSecondsRef.current = pausedSec;

    setPausedAtTimestamp(savedPausedTs || null);
    pausedAtTimestampRef.current = savedPausedTs || null;

    const calculatedSec = computeElapsedSeconds(startTs, pausedSec, savedPausedTs || null);
    setElapsedSeconds(calculatedSec);

    if (savedPos) {
      setCurrentPosition(savedPos);
      currentPositionRef.current = savedPos;
    }

    const restoredStatus = status === "paused" ? "paused" : "tracking";
    setTrackingState(restoredStatus);
    trackingStateRef.current = restoredStatus;

    renderRestoredRouteOnMap(validPoints, validPauseLocs, savedPos);

    if (restoredStatus === "tracking") {
      startWatchingLocation();
    }

    setRecoveredNotice(true);

    setToastMessage({
      type: "success",
      text: `Active route tracking recovered (${dist.toFixed(2)} KM in progress).`
    });

    return true;
  };

  // Save active tracking state on window close/backgrounding/visibilitychange
  useEffect(() => {
    const handleAppBackground = () => {
      if (trackingStateRef.current !== "idle") {
        saveActiveSessionToStorage(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleAppBackground();
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handleAppBackground);
    window.addEventListener("beforeunload", handleAppBackground);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handleAppBackground);
      window.removeEventListener("beforeunload", handleAppBackground);
    };
  }, []);

  // Auto-hide toast message
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  // Clean up location watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, []);

  // Key for local storage persistence
  const localStorageDraftKey = `triplan_tracker_draft_${trip.id}`;

  // 1. Load Past Saved Routes from LocalStorage / IndexedDB & Firestore
  const loadSavedRoutes = async () => {
    setIsLoadingHistory(true);
    try {
      const routesList: StoredRouteSession[] = await getCompletedRoutesFromStorage(trip.id);

      // Firestore check if online
      if (typeof navigator !== "undefined" && navigator.onLine) {
        try {
          const routesCol = collection(db, "trips", trip.id, "routeSessions");
          const q = query(routesCol, orderBy("createdAt", "desc"));
          const snap = await getDocs(q);
          snap.forEach((docSnap) => {
            const data = { id: docSnap.id, ...(docSnap.data() as any) };
            if (!routesList.some((r) => r.id === data.id)) {
              routesList.push(data);
            }
          });
        } catch (err) {
          console.warn("Firestore fetch routeSessions fallback to local:", err);
        }
      }

      // Sort by creation time desc
      routesList.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      setSavedSessions(routesList);
    } catch (err) {
      console.error("Failed to load route history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadSavedRoutes();
  }, [trip.id]);

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default to user's destination or coordinates
      const defaultCenter: [number, number] = [12.9716, 77.5946]; // Bangalore fallback

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 13,
        zoomControl: false,
        attributionControl: false
      });

      // Add zoom control to top-right
      L.control.zoom({ position: "topright" }).addTo(map);

      // Tile layer
      const getTileUrl = (type: "streets" | "satellite" | "voyager") => {
        if (type === "satellite") {
          return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
        }
        if (type === "streets") {
          return "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
        }
        return "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
      };

      const tileLayer = L.tileLayer(getTileUrl(mapType), {
        maxZoom: 19,
        subdomains: "abcd"
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      // Group for stops
      stopMarkersGroupRef.current = L.layerGroup().addTo(map);

      // Polyline for active route
      polylineLayerRef.current = L.polyline([], {
        color: "#2563eb",
        weight: 5,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round"
      }).addTo(map);

      mapInstanceRef.current = map;

      // Disable autoCenter if user manually pans/drags map canvas
      map.on("dragstart", () => {
        setAutoCenter(false);
        autoCenterRef.current = false;
      });

      // Check and restore active tracking session if any existed before reload
      restoreActiveSession().then((restored) => {
        if (restored) {
          detectAndShowCurrentLocation(false, false);
        } else {
          detectAndShowCurrentLocation(true, true);
        }
      });
    }

    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map tiles when mapType changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const getTileUrl = (type: "streets" | "satellite" | "voyager") => {
      if (type === "satellite") {
        return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
      }
      if (type === "streets") {
        return "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
      }
      return "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
    };

    tileLayerRef.current = L.tileLayer(getTileUrl(mapType), {
      maxZoom: 19,
      subdomains: "abcd"
    }).addTo(mapInstanceRef.current);
  }, [mapType]);

  // Handle map resize on fullscreen toggle or container change
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [isFullscreen, activeViewTab]);

  // 3. Timer interval calculating dynamic active seconds & background save
  useEffect(() => {
    if (trackingState === "tracking") {
      timerIntervalRef.current = setInterval(() => {
        const elapsed = computeElapsedSeconds(
          startTimestampRef.current,
          accumulatedPausedSecondsRef.current,
          pausedAtTimestampRef.current
        );
        setElapsedSeconds(elapsed);

        // Periodically trigger active session storage save every ~10 seconds
        if (elapsed > 0 && elapsed % 10 === 0) {
          saveActiveSessionToStorage();
        }
      }, 1000);
    } else if (trackingState === "paused") {
      const elapsed = computeElapsedSeconds(
        startTimestampRef.current,
        accumulatedPausedSecondsRef.current,
        pausedAtTimestampRef.current
      );
      setElapsedSeconds(elapsed);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [trackingState]);

  // 4. GPS Position Watcher with filtering and live route drawing
  const handleGpsUpdate = (position: GeolocationPosition) => {
    const { latitude, longitude, accuracy, speed, heading } = position.coords;
    setGpsPermissionState("granted");
    setGpsError(null);
    setIsGpsWeak(false);
    setShowLocationInstructionModal(false);

    const pointAccuracy = Math.round(accuracy || 15);
    const rawSpeedKmh = speed !== null && speed >= 0 ? speed * 3.6 : 0;

    const newPos = {
      lat: latitude,
      lng: longitude,
      accuracy: pointAccuracy,
      speed: rawSpeedKmh,
      heading,
      timestamp: position.timestamp
    };
    setCurrentPosition(newPos);

    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Render / update Current User Marker (Pulsing blue radar dot)
    const currentCustomIcon = L.divIcon({
      className: "custom-live-user-marker",
      html: `
        <div class="relative flex items-center justify-center w-8 h-8">
          <span class="absolute w-8 h-8 bg-blue-500/30 rounded-full animate-ping"></span>
          <span class="absolute w-5 h-5 bg-blue-600 border-2 border-white rounded-full shadow-lg"></span>
          <span class="w-2 h-2 bg-white rounded-full"></span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    if (!currentMarkerRef.current) {
      currentMarkerRef.current = L.marker([latitude, longitude], {
        icon: currentCustomIcon,
        zIndexOffset: 1000
      }).addTo(map);
    } else {
      currentMarkerRef.current.setLatLng([latitude, longitude]);
    }

    // Render / update Accuracy Circle
    if (!accuracyCircleRef.current) {
      accuracyCircleRef.current = L.circle([latitude, longitude], {
        radius: pointAccuracy,
        color: "#3b82f6",
        weight: 1,
        fillColor: "#3b82f6",
        fillOpacity: 0.12
      }).addTo(map);
    } else {
      accuracyCircleRef.current.setLatLng([latitude, longitude]);
      accuracyCircleRef.current.setRadius(pointAccuracy);
    }

    // If autoCenter is enabled, dynamically adjust map viewport zoom/bounds to fit entire recorded route
    if (autoCenterRef.current) {
      adjustMapToFitRoute(routePointsRef.current, newPos, true);
    }

    // IF TRACKING IS NOT ACTIVE (e.g. idle or paused): Force current speed to 0 km/h
    if (trackingStateRef.current !== "tracking") {
      setCurrentSpeedKmh(0);
      stationaryCountRef.current = 0;
      consecutiveMovementsRef.current = 0;
      return;
    }

    // TRACKING IS ACTIVE:
    // 1. FILTER UNRELIABLE / POOR GPS ACCURACY (accuracy > 35 meters)
    if (pointAccuracy > 35) {
      setCurrentSpeedKmh(0);
      return;
    }

    const prevPoints = routePointsRef.current;
    const pointTimestamp = new Date(position.timestamp || Date.now()).toISOString();

    if (prevPoints.length === 0) {
      // FIRST ACCEPTED POINT: Set official Start Point
      const firstPoint = {
        lat: latitude,
        lng: longitude,
        timestamp: pointTimestamp,
        accuracy: pointAccuracy,
        speed: 0
      };

      const updatedPoints = [firstPoint];
      setRoutePoints(updatedPoints);
      setTotalDistanceKm(0);
      setCurrentSpeedKmh(0);
      stationaryCountRef.current = 0;
      consecutiveMovementsRef.current = 0;

      // Add Emerald Start Marker
      const startIcon = L.divIcon({
        className: "custom-start-marker",
        html: `
          <div class="flex items-center gap-1 bg-emerald-600 text-white text-[11px] font-extrabold px-2 py-1 rounded-full shadow-lg border-2 border-white">
            <span class="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            START
          </div>
        `,
        iconSize: [60, 26],
        iconAnchor: [30, 13]
      });

      if (startMarkerRef.current) {
        startMarkerRef.current.remove();
      }
      startMarkerRef.current = L.marker([latitude, longitude], { icon: startIcon }).addTo(map);

      if (polylineLayerRef.current) {
        polylineLayerRef.current.setLatLngs([[latitude, longitude]]);
      }
    } else {
      // SUBSEQUENT POINTS: Apply Strict GPS Filtering & Noise Rejection
      const lastPoint = prevPoints[prevPoints.length - 1];

      // A. Calculate distance delta between last accepted point and new coordinate
      const distDeltaKm = haversineDistanceKm(
        lastPoint.lat,
        lastPoint.lng,
        latitude,
        longitude
      );
      const distDeltaMeters = distDeltaKm * 1000;

      // B. Calculate time delta (seconds)
      const lastTimeMs = new Date(lastPoint.timestamp).getTime();
      const currTimeMs = position.timestamp || Date.now();
      const timeDeltaSec = Math.max(0.5, (currTimeMs - lastTimeMs) / 1000);

      // C. Accuracy-Aware Minimum Movement Threshold
      // minimumMovement = Math.max(5, Math.min(20, Math.max(previousAccuracy, currentAccuracy)))
      const previousAccuracy = lastPoint.accuracy || 15;
      const currentAccuracy = pointAccuracy;
      const minimumMovementMeters = Math.max(
        5,
        Math.min(20, Math.max(previousAccuracy, currentAccuracy))
      );

      // D. Detect Spurious Jumps & Impossible Speed (> 180 km/h or sudden massive jump with bad accuracy)
      const impliedSpeedKmh = distDeltaKm / (timeDeltaSec / 3600);
      const isSpuriousJump =
        impliedSpeedKmh > 180 ||
        (distDeltaMeters > 70 && pointAccuracy > 20 && timeDeltaSec < 5) ||
        (distDeltaMeters > 150 && timeDeltaSec < 10);

      if (isSpuriousJump) {
        setCurrentSpeedKmh(0);
        return;
      }

      // E. Evaluate Minimum Movement Threshold (Stationary & Drift Filter)
      if (distDeltaMeters < minimumMovementMeters) {
        // GPS DRIFT / STATIONARY NOISE:
        stationaryCountRef.current += 1;
        consecutiveMovementsRef.current = 0;

        // Force speed to 0 km/h, keep Total Distance unchanged, do not add point to route
        setCurrentSpeedKmh(0);
        return;
      }

      // F. Stationary Recovery Guard: Require consecutive or clear movement if previously stationary
      if (
        stationaryCountRef.current >= 2 &&
        consecutiveMovementsRef.current === 0 &&
        distDeltaMeters < minimumMovementMeters * 1.4
      ) {
        consecutiveMovementsRef.current = 1;
        setCurrentSpeedKmh(0);
        return;
      }

      // G. REAL MOVEMENT CONFIRMED!
      stationaryCountRef.current = 0;
      consecutiveMovementsRef.current += 1;

      // Calculate speed from genuine movement
      let effectiveSpeedKmh = Math.round(impliedSpeedKmh * 10) / 10;
      if (rawSpeedKmh > 0 && Math.abs(rawSpeedKmh - impliedSpeedKmh) < 25) {
        effectiveSpeedKmh = Math.round(rawSpeedKmh * 10) / 10;
      }
      if (effectiveSpeedKmh > 180) effectiveSpeedKmh = 0;

      const newPoint = {
        lat: latitude,
        lng: longitude,
        timestamp: new Date(currTimeMs).toISOString(),
        accuracy: pointAccuracy,
        speed: effectiveSpeedKmh
      };

      const newPointsList = [...prevPoints, newPoint];
      setRoutePoints(newPointsList);

      const newTotalDist = totalDistanceKmRef.current + distDeltaKm;
      setTotalDistanceKm(newTotalDist);

      setCurrentSpeedKmh(effectiveSpeedKmh);
      if (effectiveSpeedKmh > maxSpeedKmh) {
        setMaxSpeedKmh(Math.round(effectiveSpeedKmh * 10) / 10);
      }

      // Update polyline on map & dynamically adjust viewport zoom
      if (polylineLayerRef.current) {
        const latLngs = newPointsList.map((p) => [p.lat, p.lng] as [number, number]);
        polylineLayerRef.current.setLatLngs(latLngs);
      }

      if (autoCenterRef.current) {
        adjustMapToFitRoute(newPointsList, newPos, true);
      }

      // Persist active session to local storage & Firestore immediately
      saveActiveSessionToStorage();
    }
  };

  const handleGpsError = (error: GeolocationPositionError) => {
    console.warn("GPS Error:", error);
    if (trackingStateRef.current === "tracking") {
      setIsGpsWeak(true);
    }
    if (error.code === error.PERMISSION_DENIED) {
      setGpsPermissionState("denied");
      setGpsError(
        "Location access blocked. Please allow location permission in your browser settings (tap 🔒 in address bar) and tap 'Enable Location'."
      );
      setShowLocationInstructionModal(true);
    } else if (error.code === error.POSITION_UNAVAILABLE) {
      setGpsPermissionState("unavailable");
      setGpsError("GPS signal weak or unavailable. Attempting to reconnect...");
    } else if (error.code === error.TIMEOUT) {
      setGpsError("GPS signal timeout. Retrying...");
    } else {
      setGpsError("Unable to acquire location coordinates. Retrying...");
    }
  };

  // Immediate location detection for page mount and view center
  const detectAndShowCurrentLocation = (animate = true, forceCenter = true) => {
    if (!navigator.geolocation) {
      setGpsPermissionState("unavailable");
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }

    if (typeof window !== "undefined" && !window.isSecureContext && window.location.hostname !== "localhost") {
      setGpsPermissionState("denied");
      setGpsError("Geolocation requires a secure HTTPS connection.");
      setShowLocationInstructionModal(true);
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        setGpsPermissionState("granted");
        setGpsError(null);
        setShowLocationInstructionModal(false);

        handleGpsUpdate(position);

        const { latitude, longitude } = position.coords;
        if (mapInstanceRef.current && (forceCenter || autoCenterRef.current)) {
          if (animate) {
            mapInstanceRef.current.flyTo([latitude, longitude], 15, { duration: 1 });
          } else {
            mapInstanceRef.current.setView([latitude, longitude], 15);
          }
        }
      },
      (error) => {
        setIsLocating(false);
        handleGpsError(error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      }
    );
  };

  // Explicit Location Request via native navigator.geolocation.getCurrentPosition
  const handleRequestLocationPermission = (onSuccessCallback?: (pos: GeolocationPosition) => void) => {
    if (!navigator.geolocation) {
      setGpsPermissionState("unavailable");
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }

    if (typeof window !== "undefined" && !window.isSecureContext && window.location.hostname !== "localhost") {
      setGpsPermissionState("denied");
      setGpsError("Geolocation requires a secure HTTPS connection.");
      setShowLocationInstructionModal(true);
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        setGpsPermissionState("granted");
        setGpsError(null);
        setShowLocationInstructionModal(false);
        handleGpsUpdate(position);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([position.coords.latitude, position.coords.longitude], 15, {
            duration: 1
          });
        }

        if (trackingStateRef.current === "tracking") {
          startWatchingLocation();
        }

        if (onSuccessCallback) {
          onSuccessCallback(position);
        }
      },
      (error) => {
        setIsLocating(false);
        handleGpsError(error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      }
    );
  };

  // Dedicated Enable Location button click handler
  const handleEnableLocationClick = async () => {
    // If permissions API is available, check state
    if (typeof navigator !== "undefined" && navigator.permissions && navigator.permissions.query) {
      try {
        const perm = await navigator.permissions.query({ name: "geolocation" });
        if (perm.state === "denied") {
          setShowLocationInstructionModal(true);
        }
      } catch (e) {
        // Query not supported for geolocation in some contexts
      }
    }

    detectAndShowCurrentLocation(true, true);
  };

  // Start continuous GPS tracking watcher
  const startWatchingLocation = () => {
    if (!navigator.geolocation) {
      setGpsPermissionState("unavailable");
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }

    // Clear existing watcher to prevent duplicates
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          handleGpsUpdate(pos);
        },
        (err) => {
          handleGpsError(err);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 15000
        }
      );
    } catch (err) {
      console.error("Error starting watchPosition:", err);
    }
  };

  // 5. Track Actions: START, PAUSE, RESUME, END
  const handleStartRoute = () => {
    // Request permission & get initial accurate position before tracking starts
    handleRequestLocationPermission((initialPos) => {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = Date.now();

      setActiveSessionId(newSessionId);
      activeSessionIdRef.current = newSessionId;

      setStartTimestamp(now);
      startTimestampRef.current = now;

      setAccumulatedPausedSeconds(0);
      accumulatedPausedSecondsRef.current = 0;

      setPausedAtTimestamp(null);
      pausedAtTimestampRef.current = null;

      setPauseLocations([]);
      pauseLocationsRef.current = [];

      setRoutePoints([]);
      routePointsRef.current = [];

      setTotalDistanceKm(0);
      totalDistanceKmRef.current = 0;

      setElapsedSeconds(0);

      setCurrentSpeedKmh(0);
      currentSpeedKmhRef.current = 0;

      setMaxSpeedKmh(0);
      maxSpeedKmhRef.current = 0;

      stationaryCountRef.current = 0;
      consecutiveMovementsRef.current = 0;
      setCompletedSummary(null);
      setSelectedSessionToView(null);

      setTrackingState("tracking");
      trackingStateRef.current = "tracking";

      // Clear old polyline & start marker
      if (polylineLayerRef.current) {
        polylineLayerRef.current.setLatLngs([]);
      }
      if (startMarkerRef.current) {
        startMarkerRef.current.remove();
        startMarkerRef.current = null;
      }
      if (stopMarkersGroupRef.current) {
        stopMarkersGroupRef.current.clearLayers();
      }

      saveActiveSessionToStorage(true);
      startWatchingLocation();
    });
  };

  const handlePauseTracking = () => {
    const now = Date.now();
    setTrackingState("paused");
    trackingStateRef.current = "paused";

    setPausedAtTimestamp(now);
    pausedAtTimestampRef.current = now;

    setCurrentSpeedKmh(0);
    currentSpeedKmhRef.current = 0;

    stationaryCountRef.current = 0;
    consecutiveMovementsRef.current = 0;

    // Add a pause marker on the map if we have points
    if (mapInstanceRef.current && currentPositionRef.current && stopMarkersGroupRef.current) {
      const pos = currentPositionRef.current;
      const pauseIcon = L.divIcon({
        className: "custom-pause-marker",
        html: `
          <div class="flex items-center justify-center w-6 h-6 bg-amber-500 text-white rounded-full shadow-md border-2 border-white text-[10px] font-bold">
            ⏸
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      L.marker([pos.lat, pos.lng], { icon: pauseIcon })
        .bindPopup(`<b>Paused</b> at ${new Date().toLocaleTimeString()}`)
        .addTo(stopMarkersGroupRef.current);

      const newPauses = [
        ...pauseLocationsRef.current,
        { lat: pos.lat, lng: pos.lng, time: new Date().toLocaleTimeString() }
      ];
      setPauseLocations(newPauses);
      pauseLocationsRef.current = newPauses;
    }

    saveActiveSessionToStorage(true);
  };

  const handleResumeTracking = () => {
    const now = Date.now();
    if (pausedAtTimestampRef.current) {
      const pauseDurationSec = Math.floor((now - pausedAtTimestampRef.current) / 1000);
      const totalPaused = accumulatedPausedSecondsRef.current + pauseDurationSec;
      setAccumulatedPausedSeconds(totalPaused);
      accumulatedPausedSecondsRef.current = totalPaused;
    }
    setPausedAtTimestamp(null);
    pausedAtTimestampRef.current = null;

    setTrackingState("tracking");
    trackingStateRef.current = "tracking";

    saveActiveSessionToStorage(true);
    startWatchingLocation();
  };

  const handleConfirmEndRoute = async () => {
    setShowEndConfirmation(false);
    setTrackingState("idle");
    trackingStateRef.current = "idle";
    setCurrentSpeedKmh(0);
    currentSpeedKmhRef.current = 0;
    stationaryCountRef.current = 0;
    consecutiveMovementsRef.current = 0;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    const endTime = new Date().toISOString();
    const finalPoints = [...routePoints];
    const finalDistance = Math.round(totalDistanceKm * 100) / 100;
    const finalDuration = elapsedSeconds;

    // Edge case: handle insufficient GPS coordinates
    if (finalPoints.length < 2) {
      setToastMessage({
        type: "error",
        text: "Route could not be completed. Not enough GPS data was recorded to create a route."
      });
      await clearActiveSessionFromStorage();
      setActiveSessionId(null);
      activeSessionIdRef.current = null;
      setStartTimestamp(null);
      startTimestampRef.current = null;
      setRoutePoints([]);
      setTotalDistanceKm(0);
      totalDistanceKmRef.current = 0;
      setElapsedSeconds(0);
      return;
    }

    const avgSpeed =
      finalDuration > 0 ? Math.round((finalDistance / (finalDuration / 3600)) * 10) / 10 : 0;

    const validSpeeds = finalPoints.map((p) => p.speed || 0).filter((s) => s > 0 && s < 220);
    const maxSpeedFromPoints = validSpeeds.length > 0 ? Math.max(...validSpeeds) : 0;
    const topSpeed = Math.round(Math.max(maxSpeedKmh, maxSpeedFromPoints) * 10) / 10;

    const startPoint = finalPoints[0];
    const endPoint = finalPoints[finalPoints.length - 1];

    let startLocationName = startPoint
      ? `Lat ${startPoint.lat.toFixed(3)}°, Lon ${startPoint.lng.toFixed(3)}°`
      : "Start Point";
    let endLocationName = endPoint
      ? `Lat ${endPoint.lat.toFixed(3)}°, Lon ${endPoint.lng.toFixed(3)}°`
      : "Destination";

    if (startPoint) {
      try {
        const name = await fetchLocationName(startPoint.lat, startPoint.lng);
        if (name) startLocationName = name;
      } catch (e) {}
    }
    if (endPoint) {
      try {
        const name = await fetchLocationName(endPoint.lat, endPoint.lng);
        if (name) endLocationName = name;
      } catch (e) {}
    }

    const routeTitle =
      startLocationName && endLocationName && startLocationName !== "Start Point"
        ? `${startLocationName} → ${endLocationName}`
        : `${trip.name} - Route ${new Date().toLocaleDateString()}`;

    const sessionData: StoredRouteSession = {
      id: activeSessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tripId: trip.id,
      userId: currentUser?.uid || "guest_user",
      title: routeTitle,
      startTime: startPoint ? startPoint.timestamp : new Date().toISOString(),
      endTime,
      status: "ended",
      totalDistanceKm: finalDistance,
      totalDurationSeconds: finalDuration,
      avgSpeedKmh: avgSpeed,
      maxSpeedKmh: topSpeed,
      startLocationName,
      endLocationName,
      points: finalPoints,
      createdAt: new Date().toISOString()
    };

    // Save to completed summary state (COMPLETED — UNSAVED state)
    setCompletedSummary(sessionData);
    setSaveRouteError(null);

    // Add Red End Marker on map preview
    if (mapInstanceRef.current && endPoint) {
      const endIcon = L.divIcon({
        className: "custom-end-marker",
        html: `
          <div class="flex items-center gap-1 bg-rose-600 text-white text-[11px] font-extrabold px-2 py-1 rounded-full shadow-lg border-2 border-white">
            <span class="w-2 h-2 bg-white rounded-full"></span>
            END
          </div>
        `,
        iconSize: [52, 26],
        iconAnchor: [26, 13]
      });
      L.marker([endPoint.lat, endPoint.lng], { icon: endIcon }).addTo(mapInstanceRef.current);
    }
  };

  // Explicit action to permanently save completed route to My Routes
  const handleSaveCompletedRoute = async () => {
    if (!completedSummary) return;
    setIsSavingRoute(true);
    setSaveRouteError(null);

    try {
      const sessionData = completedSummary;

      // 1. Save to local storage & IndexedDB
      await saveCompletedRouteToStorage(sessionData);

      // 2. Save to Firestore if online
      if (typeof navigator !== "undefined" && navigator.onLine) {
        try {
          await setDoc(
            doc(db, "trips", trip.id, "routeSessions", sessionData.id),
            sessionData
          );
        } catch (err) {
          console.warn("Firestore save failed:", err);
        }
      }

      // 3. Clear active tracking session state & active tracking storage
      await clearActiveSessionFromStorage();

      setActiveSessionId(null);
      activeSessionIdRef.current = null;
      setStartTimestamp(null);
      startTimestampRef.current = null;
      setAccumulatedPausedSeconds(0);
      accumulatedPausedSecondsRef.current = 0;
      setPausedAtTimestamp(null);
      pausedAtTimestampRef.current = null;
      setPauseLocations([]);
      pauseLocationsRef.current = [];
      setRoutePoints([]);
      setTotalDistanceKm(0);
      totalDistanceKmRef.current = 0;
      setElapsedSeconds(0);
      setMaxSpeedKmh(0);

      // 4. Reload history list (updates My Routes count immediately)
      await loadSavedRoutes();

      // 5. Success Toast & Close modal
      setToastMessage({
        type: "success",
        text: "Route saved successfully."
      });
      setCompletedSummary(null);
      setIsSavingRoute(false);

      // Navigate to My Routes view
      setActiveViewTab("history");
    } catch (error) {
      console.error("Failed to save route:", error);
      setSaveRouteError("Couldn't save this route. Your route is still available. Please try again.");
      setIsSavingRoute(false);
    }
  };

  // Explicit action to discard unsaved completed route
  const handleConfirmDiscardRoute = async () => {
    setShowDiscardConfirmation(false);

    // Clear active session from storage & state
    await clearActiveSessionFromStorage();

    setActiveSessionId(null);
    activeSessionIdRef.current = null;
    setStartTimestamp(null);
    startTimestampRef.current = null;
    setAccumulatedPausedSeconds(0);
    accumulatedPausedSecondsRef.current = 0;
    setPausedAtTimestamp(null);
    pausedAtTimestampRef.current = null;
    setPauseLocations([]);
    pauseLocationsRef.current = [];
    setRoutePoints([]);
    setTotalDistanceKm(0);
    totalDistanceKmRef.current = 0;
    setElapsedSeconds(0);
    setMaxSpeedKmh(0);

    // Clear map layers
    if (polylineLayerRef.current) {
      polylineLayerRef.current.setLatLngs([]);
    }
    if (stopMarkersGroupRef.current) {
      stopMarkersGroupRef.current.clearLayers();
    }
    if (startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
    }

    setCompletedSummary(null);
    setToastMessage({
      type: "success",
      text: "Route discarded."
    });
  };

  // View a completed saved route on the map
  const handleViewSavedRouteOnMap = (sess: StoredRouteSession) => {
    setSelectedSessionToView(sess);
    setActiveViewTab("live");

    if (!mapInstanceRef.current || !sess.points || sess.points.length === 0) return;
    const map = mapInstanceRef.current;

    // Clear active layers
    if (polylineLayerRef.current) {
      const latLngs = sess.points.map((p) => [p.lat, p.lng] as [number, number]);
      polylineLayerRef.current.setLatLngs(latLngs);
    }

    if (stopMarkersGroupRef.current) {
      stopMarkersGroupRef.current.clearLayers();
    }
    if (startMarkerRef.current) {
      startMarkerRef.current.remove();
    }

    const firstPoint = sess.points[0];
    const lastPoint = sess.points[sess.points.length - 1];

    const startIcon = L.divIcon({
      className: "custom-start-marker",
      html: `
        <div class="flex items-center gap-1 bg-emerald-600 text-white text-[11px] font-extrabold px-2 py-1 rounded-full shadow-lg border-2 border-white">
          START
        </div>
      `,
      iconSize: [56, 26],
      iconAnchor: [28, 13]
    });
    startMarkerRef.current = L.marker([firstPoint.lat, firstPoint.lng], { icon: startIcon }).addTo(map);

    const endIcon = L.divIcon({
      className: "custom-end-marker",
      html: `
        <div class="flex items-center gap-1 bg-rose-600 text-white text-[11px] font-extrabold px-2 py-1 rounded-full shadow-lg border-2 border-white">
          END
        </div>
      `,
      iconSize: [48, 26],
      iconAnchor: [24, 13]
    });
    L.marker([lastPoint.lat, lastPoint.lng], { icon: endIcon }).addTo(map);

    // Fit map bounds to show complete route
    const bounds = L.latLngBounds(sess.points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
    setAutoCenter(false);
  };

  // Delete saved route with real database & local storage execution
  const handleConfirmDeleteJourney = async () => {
    if (!journeyToDelete) return;
    const targetId = journeyToDelete.id;
    setIsDeletingJourney(true);

    try {
      // 1. Delete from IndexedDB and LocalStorage
      await deleteCompletedRouteFromStorage(targetId, trip.id);

      // 2. Delete from Firestore if online
      if (typeof navigator !== "undefined" && navigator.onLine) {
        try {
          await deleteDoc(doc(db, "trips", trip.id, "routeSessions", targetId));
        } catch (fsErr) {
          console.warn("Firestore delete warning:", fsErr);
        }
      }

      // 3. Update React state immediately
      setSavedSessions((prev) => prev.filter((s) => s.id !== targetId));

      // 4. If this session was currently displayed on map, clear it
      if (selectedSessionToView?.id === targetId) {
        setSelectedSessionToView(null);
        if (polylineLayerRef.current) {
          polylineLayerRef.current.setLatLngs([]);
        }
        if (startMarkerRef.current) {
          startMarkerRef.current.remove();
          startMarkerRef.current = null;
        }
      }

      setToastMessage({ type: "success", text: "Completed journey deleted successfully." });
      setJourneyToDelete(null);
    } catch (err) {
      console.error("Delete error:", err);
      setToastMessage({ type: "error", text: "Failed to delete journey. Please try again." });
    } finally {
      setIsDeletingJourney(false);
    }
  };

  // Recenter map on user's current location
  const handleRecenter = () => {
    setAutoCenter(true);
    autoCenterRef.current = true;
    if (currentPositionRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(
        [currentPositionRef.current.lat, currentPositionRef.current.lng],
        Math.max(mapInstanceRef.current.getZoom(), 15),
        { duration: 0.8 }
      );
    }
    detectAndShowCurrentLocation(true, true);
  };

  // Fit all points in view
  const handleFitRouteBounds = () => {
    if (!mapInstanceRef.current) return;
    setAutoCenter(true);
    autoCenterRef.current = true;
    const pointsToFit = routePoints.length > 0 ? routePoints : selectedSessionToView?.points || [];
    adjustMapToFitRoute(pointsToFit, currentPositionRef.current, true);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-2.5 sm:space-y-4 px-1.5 sm:px-4 pb-20 md:pb-12 select-none">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 bg-white dark:bg-slate-900 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-xs">
            <Navigation className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Route Tracker
              </h1>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                Live GPS
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
              Track your journey in real time for <span className="font-bold text-slate-700 dark:text-slate-300">{trip.name}</span>
            </p>
          </div>
        </div>

        {/* View Toggle Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 self-start sm:self-auto bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveViewTab("live")}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeViewTab === "live"
                ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Live Map</span>
          </button>
          <button
            onClick={() => setActiveViewTab("history")}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeViewTab === "history"
                ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>My Routes ({savedSessions.length})</span>
          </button>
        </div>
      </div>

      {/* 2. GPS Permission / Warning Banners */}
      {gpsError && (
        <div className="flex items-center justify-between p-2.5 sm:p-3.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 rounded-xl text-amber-900 dark:text-amber-200 text-xs font-medium animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{gpsError}</span>
          </div>
          <button
            type="button"
            onClick={handleEnableLocationClick}
            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
          >
            Enable Location
          </button>
        </div>
      )}

      {currentPosition && currentPosition.accuracy > 35 && (
        <div className="flex items-center gap-2 p-2 sm:p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl text-blue-800 dark:text-blue-300 text-[11px] sm:text-xs">
          <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
          <span>
            GPS accuracy is low (±{currentPosition.accuracy}m). Move to an open area for high precision tracking.
          </span>
        </div>
      )}

      {/* 3. MAIN LIVE MAP VIEW */}
      {activeViewTab === "live" && (
        <div className="space-y-2.5 sm:space-y-3">
          {/* Active Route Recovered Notification Banner */}
          {recoveredNotice && trackingState !== "idle" && (
            <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-emerald-900 dark:text-emerald-200 text-xs font-medium animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Active Route Recovered:</strong> Tracking session ({totalDistanceKm.toFixed(2)} KM · {formatDurationDigital(elapsedSeconds)}) is saved locally & active.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setRecoveredNotice(false)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}
          {/* Real-time Telemetry Stats Grid - Compact 2x2 Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
            {/* Total Distance */}
            <div className="bg-white dark:bg-slate-900 px-3 py-2 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                <span>Total Distance</span>
                <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 shrink-0" />
              </div>
              <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1">
                <span className="text-base sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {totalDistanceKm.toFixed(2)}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-500">KM</span>
              </div>
            </div>

            {/* Tracking Duration */}
            <div className="bg-white dark:bg-slate-900 px-3 py-2 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                <span>Tracking Time</span>
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
              </div>
              <div className="mt-0.5 sm:mt-1">
                <span className="text-base sm:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                  {formatDurationDigital(elapsedSeconds)}
                </span>
              </div>
            </div>

            {/* Current Speed */}
            <div className="bg-white dark:bg-slate-900 px-3 py-2 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                <span>Current Speed</span>
                <Gauge className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 shrink-0" />
              </div>
              <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1">
                <span className="text-base sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {currentSpeedKmh.toFixed(1)}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-500">km/h</span>
              </div>
            </div>

            {/* GPS Accuracy */}
            <div className="bg-white dark:bg-slate-900 px-3 py-2 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                <span>GPS Accuracy</span>
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
              </div>
              <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1">
                <span className="text-base sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  ±{currentPosition ? currentPosition.accuracy : "--"}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-500">m</span>
              </div>
            </div>
          </div>

          {/* Interactive Map Canvas Container */}
          <div
            className={`relative w-full rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 transition-all ${
              isFullscreen
                ? "fixed inset-0 z-50 rounded-none h-[100dvh] w-screen"
                : "h-[clamp(200px,34dvh,480px)] sm:h-[clamp(320px,45dvh,540px)]"
            }`}
          >
            {/* The Leaflet Div */}
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Locating You Overlay */}
            {isLocating && !currentPosition && (
              <div className="absolute inset-0 z-20 bg-slate-900/10 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
                <div className="bg-white/95 dark:bg-slate-900/95 px-4 py-2.5 rounded-full shadow-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 text-xs font-extrabold text-slate-800 dark:text-slate-100 animate-fadeIn">
                  <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
                  <span>Locating you…</span>
                </div>
              </div>
            )}

            {/* Permission Denied Overlay */}
            {!isLocating && !currentPosition && gpsPermissionState === "denied" && (
              <div className="absolute inset-0 z-20 bg-slate-900/30 backdrop-blur-[2px] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3 max-w-xs pointer-events-auto">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                      Location Access Required
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Allow location access to show your current position on the map.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleEnableLocationClick}
                    className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    Enable Location
                  </button>
                </div>
              </div>
            )}

            {/* Position Unavailable Overlay */}
            {!isLocating && !currentPosition && gpsPermissionState === "unavailable" && (
              <div className="absolute inset-0 z-20 bg-slate-900/30 backdrop-blur-[2px] flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3 max-w-xs pointer-events-auto">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center mx-auto">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                      Unable to Determine Location
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Please check that GPS / Location services are enabled on your device.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => detectAndShowCurrentLocation(true, true)}
                    className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry Location</span>
                  </button>
                </div>
              </div>
            )}

            {/* Floating Top Bar (Active Tracking Indicator & Controls) */}
            <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 right-12 sm:right-14 z-10 flex items-center justify-between pointer-events-none">
              {trackingState === "tracking" && (
                <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 bg-slate-900/90 dark:bg-slate-900/95 backdrop-blur text-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg border border-slate-700/60 text-[10px] sm:text-xs font-bold animate-fadeIn">
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-400 rounded-full animate-ping" />
                  <span>TRACKING ACTIVE</span>
                  <span className="text-slate-400">|</span>
                  <span className="text-emerald-400">{routePoints.length} pts</span>
                </div>
              )}

              {trackingState === "paused" && (
                <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 bg-amber-500/95 backdrop-blur text-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg text-[10px] sm:text-xs font-extrabold animate-fadeIn">
                  <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>PAUSED</span>
                </div>
              )}

              {selectedSessionToView && (
                <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 bg-indigo-600/95 text-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg text-[10px] sm:text-xs font-bold">
                  <span>Saved Route ({selectedSessionToView.totalDistanceKm} KM)</span>
                  <button
                    onClick={() => setSelectedSessionToView(null)}
                    className="p-0.5 hover:bg-white/20 rounded-full"
                  >
                    <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>
              )}

              {autoCenter && (trackingState === "tracking" || routePoints.length > 0) && (
                <div className="pointer-events-auto flex items-center gap-1.5 bg-indigo-600/90 dark:bg-indigo-700/90 text-white px-2.5 py-1 rounded-full shadow-md text-[10px] sm:text-xs font-bold border border-indigo-400/30 backdrop-blur animate-fadeIn">
                  <Maximize2 className="w-3 h-3 text-indigo-200" />
                  <span>AUTO-FIT ROUTE</span>
                </div>
              )}
            </div>

            {/* Floating Map Utility Buttons (Right Side) */}
            <div className="absolute top-10 sm:top-14 right-2.5 sm:right-3 z-10 flex flex-col gap-1.5 sm:gap-2">
              {/* My Location / Recenter */}
              <button
                onClick={handleRecenter}
                title="Center on My Location"
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md border transition-all active:scale-95 ${
                  autoCenter
                    ? "bg-indigo-600 text-white border-indigo-700 shadow-indigo-500/20"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                }`}
              >
                <Compass className={`w-4 h-4 sm:w-5 sm:h-5 ${autoCenter ? "animate-spin" : ""}`} />
              </button>

              {/* Fit Entire Route Bounds */}
              {(routePoints.length > 1 || selectedSessionToView) && (
                <button
                  onClick={handleFitRouteBounds}
                  title="Fit Complete Route"
                  className="w-8 h-8 sm:w-10 sm:h-10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md border border-slate-200 dark:border-slate-700 active:scale-95 transition-all"
                >
                  <Navigation className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 rotate-45" />
                </button>
              )}

              {/* Tile layer switcher */}
              <button
                onClick={() =>
                  setMapType((prev) =>
                    prev === "voyager" ? "streets" : prev === "streets" ? "satellite" : "voyager"
                  )
                }
                title="Switch Map Layers"
                className="w-8 h-8 sm:w-10 sm:h-10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md border border-slate-200 dark:border-slate-700 active:scale-95 transition-all"
              >
                <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 dark:text-slate-300" />
              </button>

              {/* Fullscreen Toggle */}
              <button
                onClick={() => setIsFullscreen((prev) => !prev)}
                title="Toggle Fullscreen"
                className="w-8 h-8 sm:w-10 sm:h-10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md border border-slate-200 dark:border-slate-700 active:scale-95 transition-all"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 dark:text-slate-300" />
                ) : (
                  <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 dark:text-slate-300" />
                )}
              </button>
            </div>

            {/* Floating Bottom Control Panel */}
            <div className="absolute bottom-2.5 sm:bottom-4 left-2.5 sm:left-3 right-2.5 sm:right-3 z-10 flex items-center justify-center pointer-events-none">
              <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xl flex items-center gap-2 sm:gap-3 max-w-lg w-full justify-between">
                {trackingState === "idle" ? (
                  <button
                    onClick={handleStartRoute}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 sm:py-3.5 px-4 sm:px-6 rounded-lg sm:rounded-xl shadow-md transition-all active:scale-98 text-sm sm:text-base cursor-pointer min-h-[44px]"
                  >
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
                    <span>START ROUTE</span>
                  </button>
                ) : (
                  <>
                    {trackingState === "tracking" ? (
                      <button
                        onClick={handlePauseTracking}
                        className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl shadow-xs transition-all active:scale-95 text-xs sm:text-sm cursor-pointer min-h-[44px]"
                      >
                        <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" />
                        <span>PAUSE TRACKING</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleResumeTracking}
                        className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl shadow-xs transition-all active:scale-95 text-xs sm:text-sm cursor-pointer min-h-[44px]"
                      >
                        <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" />
                        <span>RESUME TRACKING</span>
                      </button>
                    )}

                    <button
                      onClick={() => setShowEndConfirmation(true)}
                      className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg sm:rounded-xl shadow-xs transition-all active:scale-95 text-xs sm:text-sm cursor-pointer min-h-[44px]"
                    >
                      <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" />
                      <span>END ROUTE</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. HISTORY TAB (SAVED ROUTES FOR THIS TRIP) */}
      {activeViewTab === "history" && (
        <div className="space-y-4">
          {trackingState !== "idle" && (
            <div className="bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-blue-500/10 dark:from-emerald-950/40 dark:via-indigo-950/40 dark:to-blue-950/40 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Navigation className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wide bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                      {trackingState === "paused" ? "PAUSED" : "ACTIVE ROUTE IN PROGRESS"}
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {routePoints.length} GPS Points recorded
                    </span>
                  </div>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                    {totalDistanceKm.toFixed(2)} KM · {formatDurationDigital(elapsedSeconds)} elapsed
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveViewTab("live")}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <span>Return to Live Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                Saved Routes ({savedSessions.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Completed travel history for <span className="font-bold text-slate-700 dark:text-slate-300">{trip.name}</span>
              </p>
            </div>
            <button
              onClick={loadSavedRoutes}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-100 dark:border-indigo-900/60 transition-all active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span>Loading saved routes...</span>
            </div>
          ) : savedSessions.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3.5 my-2">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center border border-indigo-100 dark:border-indigo-900/60 shadow-xs">
                <MapIcon className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
                  No routes yet
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Your completed journeys will appear here.
                </p>
              </div>
              <button
                onClick={() => setActiveViewTab("live")}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Start a Route</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedSessions.map((sess) => (
                <div
                  key={sess.id}
                  className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all flex flex-col justify-between gap-3.5"
                >
                  {/* Title & Delete */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                        {sess.title || `${sess.startLocationName || 'Start'} → ${sess.endLocationName || 'Destination'}`}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        {new Date(sess.createdAt || sess.startTime).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setJourneyToDelete(sess);
                      }}
                      disabled={isDeletingJourney && journeyToDelete?.id === sess.id}
                      title="Delete Route"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Main Stats Block */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                        {sess.totalDistanceKm.toFixed(1)} km
                      </div>
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
                        {formatDuration(sess.totalDurationSeconds)} · {sess.avgSpeedKmh.toFixed(1)} km/h avg
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">GPS Points</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{sess.points?.length || 0} pts</span>
                    </div>
                  </div>

                  {/* Interactive static preview map */}
                  <RouteCardMapPreview points={sess.points || []} className="h-36" />

                  {/* Card Action Buttons */}
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setViewingDetailedRoute(sess)}
                      className="w-full flex items-center justify-between text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer py-1"
                    >
                      <span>View Route →</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. End Route Confirmation Dialog */}
      {showEndConfirmation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 max-w-sm w-full rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center mx-auto">
              <Square className="w-6 h-6 fill-rose-600" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                End Route Tracking?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to stop tracking this journey? Your path (
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {totalDistanceKm.toFixed(2)} KM
                </span>
                ) will be calculated and presented in a summary.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowEndConfirmation(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEndRoute}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                End Route
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Route Completed Summary Modal (COMPLETED — UNSAVED State) */}
      {completedSummary && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-3xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 my-auto max-h-[95dvh] overflow-y-auto">
            
            {/* Header with Checkmark */}
            <div className="text-center space-y-1.5 pt-1">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border-4 border-emerald-50 dark:border-emerald-900/40 shadow-xs">
                <CheckCircle2 className="w-8 h-8 sm:w-9 sm:h-9" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Route Completed
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                Your journey has been recorded successfully.
              </p>
            </div>

            {/* 4 Prominent Main Statistics */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
              {/* Distance */}
              <div className="bg-slate-50 dark:bg-slate-800/70 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center flex flex-col justify-center">
                <span className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 block tracking-tight">
                  {completedSummary.totalDistanceKm.toFixed(1)} km
                </span>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5 block">
                  Distance
                </span>
              </div>

              {/* Duration */}
              <div className="bg-slate-50 dark:bg-slate-800/70 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center flex flex-col justify-center">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white block tracking-tight font-mono">
                  {formatRouteDuration(completedSummary.totalDurationSeconds)}
                </span>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5 block">
                  Duration
                </span>
              </div>

              {/* Average Speed */}
              <div className="bg-slate-50 dark:bg-slate-800/70 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center flex flex-col justify-center">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white block tracking-tight">
                  {completedSummary.avgSpeedKmh.toFixed(1)} km/h
                </span>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5 block">
                  Average Speed
                </span>
              </div>

              {/* Top Speed */}
              <div className="bg-slate-50 dark:bg-slate-800/70 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center flex flex-col justify-center">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white block tracking-tight">
                  {completedSummary.maxSpeedKmh ? completedSummary.maxSpeedKmh.toFixed(1) : completedSummary.avgSpeedKmh.toFixed(1)} km/h
                </span>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5 block">
                  Top Speed
                </span>
              </div>
            </div>

            {/* Optional Metadata Row */}
            <div className="bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-500">Trip</span>
                <span className="font-extrabold text-slate-900 dark:text-white truncate max-w-[220px]">
                  {trip.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-500">Start Location</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
                  {completedSummary.startLocationName || "Start Point"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-500">Destination</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
                  {completedSummary.endLocationName || "Destination"}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                <span className="font-medium text-slate-500">Recorded Data</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {completedSummary.points.length} GPS Points
                </span>
              </div>
            </div>

            {/* Mini Route Map Preview */}
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Route Map Preview
              </span>
              <RouteCardMapPreview points={completedSummary.points} className="h-40 sm:h-48 rounded-2xl shadow-inner border border-slate-200 dark:border-slate-800" />
            </div>

            {/* Save Error Alert */}
            {saveRouteError && (
              <div className="bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800/80 p-3.5 rounded-2xl flex items-start gap-2.5 text-amber-800 dark:text-amber-300 text-xs font-medium">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>{saveRouteError}</span>
              </div>
            )}

            {/* Primary Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleSaveCompletedRoute}
                disabled={isSavingRoute}
                className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl text-sm sm:text-base shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSavingRoute ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving Route...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 stroke-[3]" />
                    <span>{saveRouteError ? "Try Again" : "Save Route"}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowDiscardConfirmation(true)}
                disabled={isSavingRoute}
                className="w-full py-2.5 px-4 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 font-bold text-xs transition-colors cursor-pointer text-center"
              >
                Discard Route
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 7. Discard Route Confirmation Modal */}
      {showDiscardConfirmation && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 max-w-sm w-full rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Discard this route?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your recorded route and statistics will be lost.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDiscardConfirmation(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDiscardRoute}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Discard Route
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Delete Journey Confirmation Dialog */}
      {journeyToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 max-w-sm w-full rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-rose-600" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Delete this route?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This route and its recorded GPS data will be permanently removed.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!isDeletingJourney) setJourneyToDelete(null);
                }}
                disabled={isDeletingJourney}
                className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteJourney}
                disabled={isDeletingJourney}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeletingJourney ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Route</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Route View Modal */}
      {viewingDetailedRoute && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
            {/* Modal Top Bar */}
            <div className="flex items-center justify-between p-3.5 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setViewingDetailedRoute(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  <span>Back to My Routes</span>
                </button>
                <div className="hidden sm:block h-5 w-px bg-slate-300 dark:bg-slate-700" />
                <div className="hidden sm:block">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    {viewingDetailedRoute.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Recorded on {new Date(viewingDetailedRoute.createdAt || viewingDetailedRoute.startTime).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingDetailedRoute(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Content Area */}
            <div className="p-3.5 sm:p-5 overflow-y-auto space-y-4">
              {/* Large Map Canvas */}
              <DetailedRouteLargeMap points={viewingDetailedRoute.points || []} />

              {/* Detailed Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Total Distance</span>
                  <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
                    {viewingDetailedRoute.totalDistanceKm.toFixed(2)} KM
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Duration</span>
                  <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
                    {formatDuration(viewingDetailedRoute.totalDurationSeconds)}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Avg Speed</span>
                  <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {viewingDetailedRoute.avgSpeedKmh.toFixed(1)} <span className="text-xs font-bold text-slate-500">km/h</span>
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Max Speed</span>
                  <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {viewingDetailedRoute.maxSpeedKmh ? viewingDetailedRoute.maxSpeedKmh.toFixed(1) : viewingDetailedRoute.avgSpeedKmh.toFixed(1)} <span className="text-xs font-bold text-slate-500">km/h</span>
                  </span>
                </div>
              </div>

              {/* Start / End Locations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 font-extrabold flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Start Location</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">{viewingDetailedRoute.startLocationName || "Start Point"}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 font-extrabold flex items-center justify-center shrink-0">
                    <Flag className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">End Location</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">{viewingDetailedRoute.endLocationName || "Destination"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Location Access Instruction Modal */}
      {showLocationInstructionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/80 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Location Access Blocked
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Browser location permission is required
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLocationInstructionModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <p className="font-medium text-slate-800 dark:text-slate-200">
                Location access is blocked for this site in your browser settings. To allow location access:
              </p>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                    1
                  </span>
                  <span>
                    Tap the <strong>Lock 🔒</strong> or <strong>Tune/Settings</strong> icon in your browser address bar.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                    2
                  </span>
                  <span>
                    Go to <strong>Permissions</strong> or <strong>Site Settings</strong> &rarr; <strong>Location</strong>.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                    3
                  </span>
                  <span>
                    Change the location setting to <strong>Allow</strong>.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-[10px] shrink-0">
                    4
                  </span>
                  <span>
                    Tap <strong>Retry Location Access</strong> below.
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowLocationInstructionModal(false)}
                className="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={handleEnableLocationClick}
                className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Compass className="w-4 h-4" />
                <span>Retry Location Access</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Toast Feedback Message */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-bold animate-fadeIn ${
            toastMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/90 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
};
