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
  X,
  Share2,
  Flag,
  ArrowRight,
  TrendingUp,
  Map as MapIcon,
  ChevronRight
} from "lucide-react";
import { db } from "../lib/firebase";
import {
  collection,
  doc,
  setDoc,
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

function formatDurationDigital(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

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

  // UI state
  const [activeViewTab, setActiveViewTab] = useState<"live" | "history">("live");
  const [savedSessions, setSavedSessions] = useState<StoredRouteSession[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [selectedSessionToView, setSelectedSessionToView] = useState<StoredRouteSession | null>(null);
  const [showEndConfirmation, setShowEndConfirmation] = useState<boolean>(false);
  const [completedSummary, setCompletedSummary] = useState<StoredRouteSession | null>(null);
  const [journeyToDelete, setJourneyToDelete] = useState<StoredRouteSession | null>(null);
  const [isDeletingJourney, setIsDeletingJourney] = useState<boolean>(false);
  const [showLocationInstructionModal, setShowLocationInstructionModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const trackingStateRef = useRef(trackingState);
  trackingStateRef.current = trackingState;

  const stationaryCountRef = useRef<number>(0);
  const consecutiveMovementsRef = useRef<number>(0);

  const routePointsRef = useRef(routePoints);
  routePointsRef.current = routePoints;

  const totalDistanceKmRef = useRef(totalDistanceKm);
  totalDistanceKmRef.current = totalDistanceKm;

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
  const localStorageDraftKey = `trippro_tracker_draft_${trip.id}`;

  // 1. Load Past Saved Routes from Firestore & LocalStorage
  const loadSavedRoutes = async () => {
    setIsLoadingHistory(true);
    try {
      const routesList: StoredRouteSession[] = [];
      // Firestore check
      try {
        const routesCol = collection(db, "trips", trip.id, "routeSessions");
        const q = query(routesCol, orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        snap.forEach((docSnap) => {
          routesList.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
      } catch (err) {
        console.warn("Firestore fetch routeSessions fallback to local:", err);
      }

      // Also merge with localStorage saved sessions for this trip
      try {
        const localSaved = localStorage.getItem(`trippro_saved_routes_${trip.id}`);
        if (localSaved) {
          const parsed: StoredRouteSession[] = JSON.parse(localSaved);
          parsed.forEach((p) => {
            if (!routesList.some((r) => r.id === p.id)) {
              routesList.push(p);
            }
          });
        }
      } catch (e) {
        console.error("Local storage read error", e);
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

      // Quick initial location check
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            if (mapInstanceRef.current) {
              mapInstanceRef.current.setView([latitude, longitude], 15);
            }
          },
          () => {},
          { timeout: 5000 }
        );
      }
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

  // 3. Timer interval for elapsed time during tracking
  useEffect(() => {
    if (trackingState === "tracking") {
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
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

    // If autoCenter is enabled, pan map smoothly to current position
    if (autoCenter) {
      map.panTo([latitude, longitude], { animate: true, duration: 0.8 });
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

      // Update polyline on map
      if (polylineLayerRef.current) {
        const latLngs = newPointsList.map((p) => [p.lat, p.lng] as [number, number]);
        polylineLayerRef.current.setLatLngs(latLngs);
      }

      // Persist draft to local storage
      try {
        localStorage.setItem(
          localStorageDraftKey,
          JSON.stringify({
            sessionId: activeSessionId,
            points: newPointsList,
            totalDistanceKm: newTotalDist,
            elapsedSeconds
          })
        );
      } catch (e) {}
    }
  };

  const handleGpsError = (error: GeolocationPositionError) => {
    console.warn("GPS Error:", error);
    if (error.code === error.PERMISSION_DENIED) {
      setGpsPermissionState("denied");
      setGpsError(
        "Location access blocked. Please allow location permission in your browser settings (tap 🔒 in address bar) and tap 'Enable Location'."
      );
      setShowLocationInstructionModal(true);
    } else if (error.code === error.POSITION_UNAVAILABLE) {
      setGpsPermissionState("unavailable");
      setGpsError("GPS position unavailable. Please ensure device location is turned on and try again.");
    } else if (error.code === error.TIMEOUT) {
      setGpsError("GPS request timed out. Please tap 'Enable Location' to retry.");
    } else {
      setGpsError("Unable to acquire location coordinates.");
    }
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

    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
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

    handleRequestLocationPermission((pos) => {
      setShowLocationInstructionModal(false);
      setToastMessage({ type: "success", text: "Location access granted! GPS tracking ready." });
      startWatchingLocation();
    });
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
      setActiveSessionId(newSessionId);
      setRoutePoints([]);
      setTotalDistanceKm(0);
      setElapsedSeconds(0);
      setCurrentSpeedKmh(0);
      setMaxSpeedKmh(0);
      stationaryCountRef.current = 0;
      consecutiveMovementsRef.current = 0;
      setCompletedSummary(null);
      setSelectedSessionToView(null);
      setTrackingState("tracking");

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

      startWatchingLocation();
    });
  };

  const handlePauseTracking = () => {
    setTrackingState("paused");
    setCurrentSpeedKmh(0);
    stationaryCountRef.current = 0;
    consecutiveMovementsRef.current = 0;
    // Add a pause marker on the map if we have points
    if (mapInstanceRef.current && currentPosition && stopMarkersGroupRef.current) {
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
      L.marker([currentPosition.lat, currentPosition.lng], { icon: pauseIcon })
        .bindPopup(`<b>Paused</b> at ${new Date().toLocaleTimeString()}`)
        .addTo(stopMarkersGroupRef.current);
    }
  };

  const handleResumeTracking = () => {
    setTrackingState("tracking");
  };

  const handleConfirmEndRoute = async () => {
    setShowEndConfirmation(false);
    setTrackingState("idle");
    setCurrentSpeedKmh(0);
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
    const avgSpeed =
      finalDuration > 0 ? Math.round((finalDistance / (finalDuration / 3600)) * 10) / 10 : 0;

    const startPoint = finalPoints[0];
    const endPoint = finalPoints[finalPoints.length - 1];

    const sessionData: StoredRouteSession = {
      id: activeSessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tripId: trip.id,
      userId: currentUser?.uid || "guest_user",
      title: `${trip.name} - Route ${new Date().toLocaleDateString()}`,
      startTime: startPoint ? startPoint.timestamp : new Date().toISOString(),
      endTime,
      status: "ended",
      totalDistanceKm: finalDistance,
      totalDurationSeconds: finalDuration,
      avgSpeedKmh: avgSpeed,
      maxSpeedKmh,
      startLocationName: startPoint
        ? `Lat ${startPoint.lat.toFixed(4)}, Lon ${startPoint.lng.toFixed(4)}`
        : "Current Location",
      endLocationName: endPoint
        ? `Lat ${endPoint.lat.toFixed(4)}, Lon ${endPoint.lng.toFixed(4)}`
        : "Final Stop",
      points: finalPoints,
      createdAt: new Date().toISOString()
    };

    // Save to completed state for modal summary
    setCompletedSummary(sessionData);

    // Save to Firestore
    try {
      await setDoc(
        doc(db, "trips", trip.id, "routeSessions", sessionData.id),
        sessionData
      );
    } catch (err) {
      console.warn("Firestore save failed, saving to localStorage:", err);
    }

    // Save to LocalStorage
    try {
      const localKey = `trippro_saved_routes_${trip.id}`;
      const existing = localStorage.getItem(localKey);
      const parsed: StoredRouteSession[] = existing ? JSON.parse(existing) : [];
      const updated = [sessionData, ...parsed.filter((s) => s.id !== sessionData.id)];
      localStorage.setItem(localKey, JSON.stringify(updated));
      localStorage.removeItem(localStorageDraftKey);
    } catch (e) {}

    // Reload history list
    await loadSavedRoutes();

    // Add Red End Marker on map
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
      // 1. Delete from Firestore if available
      try {
        await deleteDoc(doc(db, "trips", trip.id, "routeSessions", targetId));
      } catch (fsErr) {
        console.warn("Firestore delete warning (may be guest or offline):", fsErr);
      }

      // 2. Delete from LocalStorage
      try {
        const localKey = `trippro_saved_routes_${trip.id}`;
        const existing = localStorage.getItem(localKey);
        if (existing) {
          const parsed: StoredRouteSession[] = JSON.parse(existing);
          const filtered = parsed.filter((s) => s.id !== targetId);
          localStorage.setItem(localKey, JSON.stringify(filtered));
        }
      } catch (lsErr) {
        console.error("LocalStorage delete error:", lsErr);
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

  // Recenter to current position
  const handleRecenter = () => {
    setAutoCenter(true);
    if (mapInstanceRef.current && currentPosition) {
      mapInstanceRef.current.flyTo([currentPosition.lat, currentPosition.lng], 16, {
        duration: 1
      });
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([pos.coords.latitude, pos.coords.longitude], 16, {
            duration: 1
          });
        }
      });
    }
  };

  // Fit all points in view
  const handleFitRouteBounds = () => {
    if (!mapInstanceRef.current) return;
    setAutoCenter(false);
    if (routePoints.length > 0) {
      const bounds = L.latLngBounds(routePoints.map((p) => [p.lat, p.lng]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
    } else if (selectedSessionToView?.points?.length) {
      const bounds = L.latLngBounds(selectedSessionToView.points.map((p) => [p.lat, p.lng]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
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
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Completed Journeys for {trip.name}
            </h2>
            <button
              onClick={loadSavedRoutes}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span>Loading saved journeys...</span>
            </div>
          ) : savedSessions.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 mx-auto flex items-center justify-center">
                <Navigation className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  No routes recorded yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Tap "Live Map" and press START ROUTE to record your real-world travel via GPS.
                </p>
              </div>
              <button
                onClick={() => setActiveViewTab("live")}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Go to Tracker
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {savedSessions.map((sess) => (
                <div
                  key={sess.id}
                  onClick={() => handleViewSavedRouteOnMap(sess)}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {sess.title || "Journey Session"}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {new Date(sess.createdAt || sess.startTime).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short"
                          })}
                        </p>
                      </div>
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

                  {/* Metrics Badge Row */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">
                        Distance
                      </span>
                      <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                        {sess.totalDistanceKm.toFixed(2)} KM
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">
                        Duration
                      </span>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                        {formatDuration(sess.totalDurationSeconds)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase block">
                        GPS Points
                      </span>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                        {sess.points?.length || 0}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span>View on Interactive Map</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
                Are you sure you want to finish tracking this journey? Your completed path (
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {totalDistanceKm.toFixed(2)} KM
                </span>
                ) will be saved to your trip history.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowEndConfirmation(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEndRoute}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95"
              >
                End & Save Route
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Completed Journey Summary Modal */}
      {completedSummary && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Journey Completed!
                </h3>
              </div>
              <button
                onClick={() => setCompletedSummary(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Trip</span>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  {trip.name}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Total Distance
                  </span>
                  <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                    {completedSummary.totalDistanceKm} KM
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Total Duration
                  </span>
                  <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                    {formatDuration(completedSummary.totalDurationSeconds)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Average Speed</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {completedSummary.avgSpeedKmh} km/h
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">GPS Points</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {completedSummary.points.length} recorded
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCompletedSummary(null);
                  setActiveViewTab("history");
                }}
                className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs text-center transition-colors"
              >
                View in My Routes
              </button>
              <button
                onClick={() => setCompletedSummary(null)}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs text-center shadow-md transition-all active:scale-95"
              >
                Done
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

            <div className="text-center space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Delete this completed journey?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to permanently delete this route (
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {journeyToDelete.totalDistanceKm.toFixed(2)} KM
                </span>
                )? This action cannot be undone.
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
                  <span>Delete</span>
                )}
              </button>
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
