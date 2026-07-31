/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import {
  Trip,
  TransportSegment,
  TransportType,
  VehicleDetails,
  FuelLog,
  FlightDetail,
  TrainDetail,
  BusDetail,
  HotelModule,
} from "../types";
import { TrainDetailsModule } from "./TrainDetailsModule";
import { StationAutocomplete } from "./StationAutocomplete";
import {
  Luggage,
  Plus,
  Car,
  Plane,
  Train,
  Bus,
  Building,
  Fuel,
  Navigation,
  Clock,
  Ticket,
  Shield,
  ArrowRight,
  CheckCircle2,
  Calendar,
  X,
  Footprints,
  Ship,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Share2,
  ChevronDown,
} from "lucide-react";

interface JourneyBuilderProps {
  trip: Trip;
  onUpdateTrip: (updatedTrip: Trip) => void;
  role?: string;
}

const transportTypesList: { type: TransportType; iconName: string; color: string }[] = [
  { type: "Walking", iconName: "Footprints", color: "#10b981" },
  { type: "Cycle", iconName: "Bike", color: "#14b8a6" },
  { type: "Bike", iconName: "Bike", color: "#06b6d4" },
  { type: "Car", iconName: "Car", color: "#2563eb" },
  { type: "Taxi", iconName: "Taxi", color: "#3b82f6" },
  { type: "Auto", iconName: "Auto", color: "#f59e0b" },
  { type: "Bus", iconName: "Bus", color: "#8b5cf6" },
  { type: "Metro", iconName: "Train", color: "#6366f1" },
  { type: "Train", iconName: "Train", color: "#4f46e5" },
  { type: "Flight", iconName: "Plane", color: "#0284c7" },
  { type: "Ship", iconName: "Ship", color: "#0d9488" },
  { type: "Ferry", iconName: "Ship", color: "#0f766e" },
  { type: "Helicopter", iconName: "Plane", color: "#e11d48" },
];

export const JourneyBuilder: React.FC<JourneyBuilderProps> = ({
  trip,
  onUpdateTrip,
  role,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    "route" | "vehicles" | "fuel" | "flights" | "trains" | "buses" | "hotels"
  >("route");

  const [isSegmentModalOpen, setIsSegmentModalOpen] = useState(false);
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);

  // Quick Action States
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [editingSegment, setEditingSegment] = useState<TransportSegment | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Close three-dot menu on scroll, resize, or escape key
  useEffect(() => {
    if (activeMenuId) {
      const handleClose = () => {
        setActiveMenuId(null);
        setMenuCoords(null);
      };

      // true captures scroll on any parent scroll containers
      window.addEventListener("scroll", handleClose, true);
      window.addEventListener("resize", handleClose);

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          handleClose();
        }
      };
      window.addEventListener("keydown", handleEscape);

      return () => {
        window.removeEventListener("scroll", handleClose, true);
        window.removeEventListener("resize", handleClose);
        window.removeEventListener("keydown", handleEscape);
      };
    }
  }, [activeMenuId]);

  // Position and dimension calculation for the portal three-dot menu
  const dropdownStyle = useMemo(() => {
    if (!menuCoords) return {};

    const dropdownWidth = 144; // w-36 in Tailwind = 9rem = 144px
    const dropdownHeight = 250; // estimate of menu height with 6 items + divider

    const spaceBelow = window.innerHeight - (menuCoords.top + menuCoords.height);
    const spaceAbove = menuCoords.top;
    const openDownward = spaceBelow >= dropdownHeight || spaceBelow > spaceAbove;

    let topVal = 0;
    if (openDownward) {
      topVal = menuCoords.top + menuCoords.height + 4; // 4px margin below trigger
    } else {
      topVal = Math.max(8, menuCoords.top - dropdownHeight - 4); // 4px margin above trigger
    }

    let leftVal = menuCoords.left + menuCoords.width - dropdownWidth; // align left of the menu with right of trigger
    if (leftVal < 8) {
      leftVal = menuCoords.left; // align left of the menu with left of trigger
    }
    // Clamp to viewport
    leftVal = Math.max(8, Math.min(window.innerWidth - dropdownWidth - 8, leftVal));

    return {
      position: "fixed" as const,
      top: `${topVal}px`,
      left: `${leftVal}px`,
      width: `${dropdownWidth}px`,
    };
  }, [menuCoords]);

  // New/Edit Segment Form
  const [transType, setTransType] = useState<TransportType>("Taxi");
  const [fromLoc, setFromLoc] = useState("");
  const [toLoc, setToLoc] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  
  // Helper to format Date to datetime-local string (YYYY-MM-DDTHH:mm)
  const toDateTimeLocal = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // Helper to parse datetime-local string to Date
  const fromDateTimeLocal = (s: string) => s ? new Date(s) : new Date();

  // Handle overnight travel automatically
  useEffect(() => {
    if (departureTime && arrivalTime) {
      const dep = new Date(departureTime);
      const arr = new Date(arrivalTime);
      
      // If arrival is before departure on the same day (or strictly before)
      // and we want to auto-handle "overnight", we check if time only is smaller
      // However, datetime-local has full date. 
      // If user JUST changed the time and it resulted in arr < dep, we might want to shift arr date.
      if (arr < dep) {
        // Auto increment arrival by 1 day
        const nextDay = new Date(dep);
        nextDay.setDate(dep.getDate() + 1);
        nextDay.setHours(arr.getHours(), arr.getMinutes());
        setArrivalTime(toDateTimeLocal(nextDay));
      }
    }
  }, [departureTime, arrivalTime]);

  const [distKm, setDistKm] = useState(20);
  const [durationStr, setDurationStr] = useState("45m");
  const [fareAmt, setFareAmt] = useState(500);
  const [seatNo, setSeatNo] = useState("");
  const [bookingNo, setBookingNo] = useState("");
  const [operatorName, setOperatorName] = useState("");
  
  // Simplified form state additions
  const [busNumber, setBusNumber] = useState("");
  const [ticketUrl, setTicketUrl] = useState("");
  const [coach, setCoach] = useState("");
  const [pnr, setPnr] = useState("");
  const [driverName, setDriverName] = useState("");
  const [fuelCost, setFuelCost] = useState<number>(0);
  const [tollParking, setTollParking] = useState<number>(0);
  const [bookingStatus, setBookingStatus] = useState<"Booked" | "Pending" | "Cancelled">("Booked");
  const [segmentNotes, setSegmentNotes] = useState("");
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  const transportCategory = useMemo(() => {
    if (transType === "Bus") return "Bus";
    if (transType === "Train" || transType === "Metro") return "Train";
    if (transType === "Flight" || transType === "Helicopter") return "Flight";
    if (transType === "Taxi" || transType === "Auto") return "Taxi";
    if (transType === "Car" || transType === "Bike") return "PersonalVehicle";
    return "Walking";
  }, [transType]);

  // Fuel Form
  const [fuelPrice, setFuelPrice] = useState(102.5);
  const [fuelLitres, setFuelLitres] = useState(25);
  const [fuelDist, setFuelDist] = useState(320);
  const [fuelStation, setFuelStation] = useState("Shell Highway Pump");

  // Hotel Form
  const [hotelName, setHotelName] = useState("");
  const [roomType, setRoomType] = useState("Deluxe Room");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [hotelAmount, setHotelAmount] = useState(8500);

  // Toast feedback helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Action Handlers
  const handleDeleteSegment = (segId: string) => {
    const updatedSegments = trip.segments.filter((s) => s.id !== segId);
    const totalDist = updatedSegments.reduce((acc, s) => acc + s.distanceKm, 0);
    onUpdateTrip({
      ...trip,
      segments: updatedSegments,
      totalDistanceKm: totalDist,
    });
    showToast("Segment deleted successfully");
  };

  const handleDuplicateSegment = (segId: string) => {
    const seg = trip.segments.find((s) => s.id === segId);
    if (!seg) return;
    const duplicated: TransportSegment = {
      ...seg,
      id: `seg_dup_${Date.now()}`,
    };
    const updatedSegments = [...trip.segments, duplicated];
    const totalDist = updatedSegments.reduce((acc, s) => acc + s.distanceKm, 0);
    onUpdateTrip({
      ...trip,
      segments: updatedSegments,
      totalDistanceKm: totalDist,
    });
    showToast("Segment duplicated successfully");
  };

  const handleMoveUpSegment = (index: number) => {
    if (index === 0) return;
    const updatedSegments = [...trip.segments];
    const temp = updatedSegments[index];
    updatedSegments[index] = updatedSegments[index - 1];
    updatedSegments[index - 1] = temp;
    onUpdateTrip({
      ...trip,
      segments: updatedSegments,
    });
    showToast("Segment moved up");
  };

  const handleMoveDownSegment = (index: number) => {
    if (index === trip.segments.length - 1) return;
    const updatedSegments = [...trip.segments];
    const temp = updatedSegments[index];
    updatedSegments[index] = updatedSegments[index + 1];
    updatedSegments[index + 1] = temp;
    onUpdateTrip({
      ...trip,
      segments: updatedSegments,
    });
    showToast("Segment moved down");
  };

  const renderTicketUploader = () => {
    return (
      <div className="space-y-1">
        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">
          Ticket (PDF or Image, max 2MB)
        </label>
        {ticketUrl ? (
          <div className="flex items-center justify-between p-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/60 rounded-xl">
            <div className="flex items-center gap-2 overflow-hidden">
              <Ticket className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-xs text-emerald-800 dark:text-emerald-300 truncate font-semibold">
                {ticketUrl.startsWith("data:") ? "Uploaded Ticket Attachment" : ticketUrl}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setTicketUrl("")}
              className="text-[10px] font-extrabold text-rose-500 hover:text-rose-600 px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/30 rounded-lg"
            >
              Remove
            </button>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                const file = e.dataTransfer.files[0];
                const reader = new FileReader();
                reader.onload = (event) => {
                  if (event.target?.result) {
                    setTicketUrl(event.target.result as string);
                  }
                };
                reader.readAsDataURL(file);
              }
            }}
            className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center transition-all cursor-pointer hover:border-cyan-500 dark:hover:border-cyan-600 bg-slate-50/50 dark:bg-slate-900/50"
          >
            <input
              type="file"
              id="ticket-file-input"
              className="hidden"
              accept="image/*,application/pdf"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0];
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    if (event.target?.result) {
                      setTicketUrl(event.target.result as string);
                    }
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            <label htmlFor="ticket-file-input" className="cursor-pointer space-y-1 block">
              <Ticket className="w-5 h-5 mx-auto text-slate-400" />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Drag & drop ticket or <span className="text-cyan-600 font-bold hover:underline">browse</span>
              </p>
            </label>
          </div>
        )}
      </div>
    );
  };

  const renderCollapsibleTrigger = (customLabel?: string) => {
    return (
      <button
        type="button"
        onClick={() => setShowMoreDetails(!showMoreDetails)}
        className="w-full flex items-center justify-between py-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-all border-t border-slate-100 dark:border-slate-800 mt-2"
      >
        <span>{showMoreDetails ? "Hide Optional Details" : (customLabel || "Show More Details")}</span>
        <ChevronDown className={`w-4 h-4 transform transition-transform ${showMoreDetails ? "rotate-180" : ""}`} />
      </button>
    );
  };

  const handleOpenEdit = (seg: TransportSegment) => {
    setEditingSegment(seg);
    setTransType(seg.transportType);
    setFromLoc(seg.from);
    setToLoc(seg.to);
    setDepartureTime(seg.departure);
    setArrivalTime(seg.arrival);
    setDistKm(seg.distanceKm);
    setDurationStr(seg.duration);
    setFareAmt(seg.fare);
    setSeatNo(seg.seatNumber || "");
    setBookingNo(seg.bookingNumber || "");
    setOperatorName(seg.operator || "");
    
    // Set simplified fields
    setBusNumber(seg.busNumber || "");
    setTicketUrl(seg.ticketUrl || "");
    setCoach(seg.coach || "");
    setPnr(seg.pnr || "");
    setDriverName(seg.driverName || "");
    setFuelCost(seg.fuelCost || 0);
    setTollParking(seg.tollParking || 0);
    setBookingStatus(seg.bookingStatus || "Booked");
    setSegmentNotes(seg.notes || "");
    setShowMoreDetails(false);
    
    setIsSegmentModalOpen(true);
  };

  const handleOpenAddSegment = () => {
    setEditingSegment(null);
    setTransType("Taxi");
    setFromLoc("");
    setToLoc("");
    
    // Smart Prefill Logic (Requirement 2 & 3)
    let defaultDep = new Date();
    if (trip.segments.length > 0) {
      // Use last segment's arrival (Requirement 3: Auto Continue Timeline)
      const lastSeg = trip.segments[trip.segments.length - 1];
      defaultDep = lastSeg.arrivalDateTime ? new Date(lastSeg.arrivalDateTime) : new Date(lastSeg.arrival);
    } else if (trip.startDate) {
      // Use trip start date (Requirement 2: Auto Date for first segment)
      defaultDep = new Date(trip.startDate);
      defaultDep.setHours(8, 0, 0, 0); // Default to 8 AM
    }
    
    const defaultArr = new Date(defaultDep);
    defaultArr.setHours(defaultDep.getHours() + 1);
    
    setDepartureTime(toDateTimeLocal(defaultDep));
    setArrivalTime(toDateTimeLocal(defaultArr));
    
    setDistKm(20);
    setDurationStr("45m");
    setFareAmt(500);
    setSeatNo("");
    setBookingNo("");
    setOperatorName("");
    
    // Reset simplified fields
    setBusNumber("");
    setTicketUrl("");
    setCoach("");
    setPnr("");
    setDriverName("");
    setFuelCost(0);
    setTollParking(0);
    setBookingStatus("Booked");
    setSegmentNotes("");
    setShowMoreDetails(false);
    
    setIsSegmentModalOpen(true);
  };

  const handleAddStop = (segId: string) => {
    const seg = trip.segments.find((s) => s.id === segId);
    if (!seg) return;
    showToast(`Added intermediate stop for ${seg.from} ➔ ${seg.to}`);
  };

  const handleShareSegment = (seg: TransportSegment) => {
    const shareText = `Journey Segment: ${seg.transportType} from ${seg.from} to ${seg.to}. Departure: ${seg.departure}. Fare: ${trip.currency}${seg.fare}`;
    if (navigator.share) {
      navigator.share({
        title: "Trip Segment Share",
        text: shareText,
      }).catch((err) => console.log(err));
    } else {
      navigator.clipboard.writeText(shareText);
      showToast("Segment details copied to clipboard!");
    }
  };

  const handleAddSegment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromLoc || !toLoc) return;

    if (editingSegment) {
      // Edit mode
      const updatedSegments = trip.segments.map((s) => {
        if (s.id === editingSegment.id) {
          const depDate = new Date(departureTime);
          const arrDate = new Date(arrivalTime);
          
          return {
            ...s,
            transportType: transType,
            from: fromLoc,
            to: toLoc,
            departure: depDate.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
            arrival: arrDate.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
            departureDateTime: depDate.toISOString(),
            arrivalDateTime: arrDate.toISOString(),
            distanceKm: Number(distKm) || 0,
            duration: durationStr || "1h",
            fare: Number(fareAmt) || 0,
            seatNumber: seatNo,
            bookingNumber: bookingNo,
            operator: operatorName,
            busNumber: busNumber,
            ticketUrl: ticketUrl,
            coach: coach,
            pnr: pnr,
            driverName: driverName,
            fuelCost: Number(fuelCost) || 0,
            tollParking: Number(tollParking) || 0,
            bookingStatus: bookingStatus,
            notes: segmentNotes,
          };
        }
        return s;
      });
      const totalDist = updatedSegments.reduce((acc, s) => acc + s.distanceKm, 0);
      onUpdateTrip({
        ...trip,
        segments: updatedSegments,
        totalDistanceKm: totalDist,
      });
      showToast("Segment updated successfully");
      setEditingSegment(null);
    } else {
      // Add Mode
      const depDate = new Date(departureTime);
      const arrDate = new Date(arrivalTime);

      const newSeg: TransportSegment = {
        id: `seg_${Date.now()}`,
        transportType: transType,
        from: fromLoc,
        to: toLoc,
        departure: depDate.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        arrival: arrDate.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        departureDateTime: depDate.toISOString(),
        arrivalDateTime: arrDate.toISOString(),
        distanceKm: Number(distKm) || 0,
        duration: durationStr || "1h",
        fare: Number(fareAmt) || 0,
        seatNumber: seatNo,
        bookingNumber: bookingNo,
        operator: operatorName,
        status: "Confirmed",
        busNumber: busNumber,
        ticketUrl: ticketUrl,
        coach: coach,
        pnr: pnr,
        driverName: driverName,
        fuelCost: Number(fuelCost) || 0,
        tollParking: Number(tollParking) || 0,
        bookingStatus: bookingStatus,
        notes: segmentNotes,
      };

      const updatedSegments = [...trip.segments, newSeg];
      const totalDist = updatedSegments.reduce((acc, s) => acc + s.distanceKm, 0);

      onUpdateTrip({
        ...trip,
        segments: updatedSegments,
        totalDistanceKm: totalDist,
      });
      showToast("Segment added successfully");
    }

    setIsSegmentModalOpen(false);
  };

  const handleAddFuel = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = fuelPrice * fuelLitres;
    const mileage = fuelLitres > 0 ? Math.round((fuelDist / fuelLitres) * 10) / 10 : 0;

    const newFuel: FuelLog = {
      id: `fuel_${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      fuelPricePerLitre: fuelPrice,
      litres: fuelLitres,
      distanceKm: fuelDist,
      totalCost: cost,
      mileageAchieved: mileage,
      stationName: fuelStation,
    };

    onUpdateTrip({
      ...trip,
      fuelLogs: [...trip.fuelLogs, newFuel],
    });

    setIsFuelModalOpen(false);
  };

  const handleAddHotel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotelName) return;

    const newHtl: HotelModule = {
      id: `htl_${Date.now()}`,
      hotelName,
      roomTypeNumber: roomType,
      checkIn: checkInDate || "2026-08-01 02:00 PM",
      checkOut: checkOutDate || "2026-08-04 11:00 AM",
      guestsCount: trip.travellers.length || 2,
      bookingId: `HTL-${Math.floor(100000 + Math.random() * 900000)}`,
      amount: Number(hotelAmount) || 0,
      status: "Booked",
    };

    onUpdateTrip({
      ...trip,
      hotels: [...trip.hotels, newHtl],
    });

    setIsHotelModalOpen(false);
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Module Navigation Sub-Tabs */}
      <div className="bg-white dark:bg-slate-900 p-2 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:flex-wrap lg:items-center gap-1.5 w-full">
          {[
            { id: "route", label: "Multi-Segment", labelDesktop: "Multi-Segment Route", icon: Navigation },
            { id: "vehicles", label: "Vehicles", icon: Car },
            { id: "fuel", label: "Fuel Tracker", icon: Fuel },
            { id: "flights", label: "Flights", icon: Plane },
            { id: "trains", label: "Trains", icon: Train },
            { id: "buses", label: "Buses", icon: Bus },
            { id: "hotels", label: "Hotels", icon: Building },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 h-[42px] text-[11px] sm:text-xs font-bold rounded-lg transition-all justify-start sm:justify-center border ${
                  isActive
                    ? "bg-cyan-600 text-white shadow-sm border-cyan-600"
                    : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-100 dark:border-slate-800"
                } ${tab.id === 'route' ? 'col-span-2 sm:col-span-1' : ''}`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-cyan-500" />
                <span className="truncate">{tab.label === "Multi-Segment" && activeSubTab === "route" ? "Multi-Segment Route" : tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. MULTI-SEGMENT ROUTE BUILDER (Requirement 6) */}
      {activeSubTab === "route" && (
        <div className="space-y-3 sm:space-y-6">
          <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600 shrink-0" />
                  <span className="truncate">Journey Builder ({trip.segments.length} Segments)</span>
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5 leading-none">
                  End-to-end transport chain: Walking → Bike → Taxi → Train → Flight → Taxi → Hotel
                </p>
              </div>

              {role !== "traveller" && (
                <button
                  onClick={handleOpenAddSegment}
                  className="flex items-center gap-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] sm:text-xs font-bold h-8 sm:h-10 px-2.5 sm:px-4 rounded-lg sm:rounded-xl shadow-sm transition-all shrink-0 animate-fadeIn"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Segment</span>
                </button>
              )}
            </div>
          </div>

          {/* Connected Visual Timeline Chain */}
          <div className="space-y-3 sm:space-y-4 relative">
            {trip.segments.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
                <Luggage className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No transport segments added yet.</p>
                <p className="text-xs mt-1">Click '+ Add Segment' to start building your route.</p>
              </div>
            ) : (
              trip.segments.map((seg, idx) => (
                <div key={seg.id} className="relative pl-5 sm:pl-10">
                  {/* Vertical Connecting Line */}
                  {idx < trip.segments.length - 1 && (
                    <div className="absolute left-2.5 sm:left-[19px] top-8 bottom-0 w-0.5 bg-cyan-300 dark:bg-cyan-800 -mb-4 z-0" />
                  )}

                  {/* Timeline Dot */}
                  <div className="absolute left-[7px] sm:left-[15px] top-4.5 w-2 h-2 rounded-full bg-cyan-500 border border-white dark:border-slate-900 z-10" />

                  {/* Segment Card */}
                  <div className="relative z-10 p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-cyan-500 transition-all">
                    {/* Mode Icon & Details */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Mode Icon Badge */}
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-100 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 font-bold flex items-center justify-center shrink-0 border border-cyan-200 dark:border-cyan-800">
                        {seg.transportType === "Flight" ? (
                          <Plane className="w-4 h-4 sm:w-5 sm:h-5" />
                        ) : seg.transportType === "Train" ? (
                          <Train className="w-4 h-4 sm:w-5 sm:h-5" />
                        ) : seg.transportType === "Bus" ? (
                          <Bus className="w-4 h-4 sm:w-5 sm:h-5" />
                        ) : seg.transportType === "Walking" ? (
                          <Footprints className="w-4 h-4 sm:w-5 sm:h-5" />
                        ) : (
                          <Car className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border border-cyan-100 dark:border-cyan-800">
                              {seg.transportType}
                            </span>
                            <span className="text-[10px] sm:text-xs text-slate-500 font-medium">• {seg.distanceKm} km</span>
                            <span className="text-[10px] sm:text-xs text-slate-500 font-medium">• {seg.duration}</span>
                          </div>
                          
                          <span className="text-[9px] sm:text-xs font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 leading-none">
                            {seg.status}
                          </span>
                        </div>

                        {/* Route Display */}
                        <div className="flex items-center gap-1.5 text-xs sm:text-base font-extrabold text-slate-900 dark:text-white pt-1 pb-0.5">
                          <span className="truncate max-w-[100px] sm:max-w-[150px]">{seg.from}</span>
                          <ArrowRight className="w-3 h-3 text-cyan-500 shrink-0" />
                          <span className="truncate max-w-[100px] sm:max-w-[150px]">{seg.to}</span>
                        </div>

                        {/* Dep & Arr Times */}
                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 leading-none mt-0.5">
                          <span>Dep: {seg.departure}</span>
                          <span className="text-slate-300 dark:text-slate-800">|</span>
                          <span>Arr: {seg.arrival}</span>
                        </p>

                        {/* Custom metadata display for the simplified fields */}
                        <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-2 space-y-1 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800/80">
                          {seg.transportType === "Bus" && (
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                              {seg.operator && <div><span className="text-slate-400">Operator:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{seg.operator}</span></div>}
                              {seg.busNumber && <div><span className="text-slate-400">Bus Number:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{seg.busNumber}</span></div>}
                              {seg.seatNumber && <div><span className="text-slate-400">Seat:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{seg.seatNumber}</span></div>}
                              {seg.bookingStatus && <div><span className="text-slate-400">Booking Status:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{seg.bookingStatus}</span></div>}
                            </div>
                          )}
                          {(seg.transportType === "Train" || seg.transportType === "Metro") && (
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                              {seg.operator && <div><span className="text-slate-400">Train Info:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{seg.operator}</span></div>}
                              {seg.coach && <div><span className="text-slate-400">Coach:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{seg.coach}</span></div>}
                              {seg.seatNumber && <div><span className="text-slate-400">Seat/Berth:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{seg.seatNumber}</span></div>}
                              {seg.pnr && <div><span className="text-slate-400">PNR:</span> <span className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono">{seg.pnr}</span></div>}
                            </div>
                          )}
                          {(seg.transportType === "Flight" || seg.transportType === "Helicopter") && (
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                              {seg.operator && <div><span className="text-slate-400">Airline:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{seg.operator}</span></div>}
                              {seg.bookingNumber && <div><span className="text-slate-400">Flight No:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{seg.bookingNumber}</span></div>}
                              {seg.seatNumber && <div><span className="text-slate-400">Seat:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{seg.seatNumber}</span></div>}
                            </div>
                          )}
                          {(seg.transportType === "Taxi" || seg.transportType === "Auto") && (
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                              {seg.operator && <div><span className="text-slate-400">Provider:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{seg.operator}</span></div>}
                              {seg.driverName && <div><span className="text-slate-400">Driver:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{seg.driverName}</span></div>}
                            </div>
                          )}
                          {(seg.transportType === "Car" || seg.transportType === "Bike") && (
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                              {seg.operator && <div><span className="text-slate-400">Vehicle:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{seg.operator}</span></div>}
                              {seg.fuelCost && seg.fuelCost > 0 ? <div><span className="text-slate-400">Fuel Cost:</span> <span className="font-semibold text-emerald-600 dark:text-emerald-400">{trip.currency}{seg.fuelCost}</span></div> : null}
                              {seg.tollParking && seg.tollParking > 0 ? <div><span className="text-slate-400">Tolls/Parking:</span> <span className="font-semibold text-slate-700 dark:text-slate-200">{trip.currency}{seg.tollParking}</span></div> : null}
                            </div>
                          )}
                          {seg.ticketUrl && (
                            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5">
                              <Ticket className="w-3.5 h-3.5 text-cyan-600" />
                              <a
                                href={seg.ticketUrl}
                                download="ticket"
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                              >
                                View Ticket Attachment
                              </a>
                            </div>
                          )}
                          {seg.notes && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 italic mt-1 bg-slate-100/50 dark:bg-slate-800/50 p-1.5 rounded">
                              Note: {seg.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Fare & Quick Actions */}
                    <div className="flex sm:flex-col justify-between items-center sm:items-end self-stretch pl-1 sm:pl-4 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/50 pt-2 sm:pt-0">
                      {/* Three Dot Actions Menu */}
                      <div className="relative order-2 sm:order-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeMenuId === seg.id) {
                              setActiveMenuId(null);
                              setMenuCoords(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setActiveMenuId(seg.id);
                              setMenuCoords({
                                top: rect.top,
                                left: rect.left,
                                width: rect.width,
                                height: rect.height,
                              });
                            }
                          }}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 transition-all shrink-0"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        
                        {activeMenuId === seg.id && menuCoords && createPortal(
                          <>
                            {/* Backdrop overlay to close when clicking outside */}
                            <div
                              className="fixed inset-0 z-[9998]"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                setMenuCoords(null);
                              }}
                            />
                            
                            {/* Positioned Dropdown with scale & fade animation */}
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              style={dropdownStyle}
                              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[9999] py-1 text-left text-xs text-slate-700 dark:text-slate-200 pointer-events-auto"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  handleOpenEdit(seg);
                                  setActiveMenuId(null);
                                  setMenuCoords(null);
                                }}
                                className="w-full px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 text-left font-semibold"
                              >
                                <Edit className="w-3.5 h-3.5 text-cyan-500" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleDuplicateSegment(seg.id);
                                  setActiveMenuId(null);
                                  setMenuCoords(null);
                                }}
                                className="w-full px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 text-left font-semibold"
                              >
                                <Copy className="w-3.5 h-3.5 text-purple-500" /> Duplicate
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleMoveUpSegment(idx);
                                  setActiveMenuId(null);
                                  setMenuCoords(null);
                                }}
                                disabled={idx === 0}
                                className="w-full px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 text-left font-semibold disabled:opacity-40"
                              >
                                <ArrowUp className="w-3.5 h-3.5 text-slate-500" /> Move Up
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleMoveDownSegment(idx);
                                  setActiveMenuId(null);
                                  setMenuCoords(null);
                                }}
                                disabled={idx === trip.segments.length - 1}
                                className="w-full px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 text-left font-semibold disabled:opacity-40"
                              >
                                <ArrowDown className="w-3.5 h-3.5 text-slate-500" /> Move Down
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleAddStop(seg.id);
                                  setActiveMenuId(null);
                                  setMenuCoords(null);
                                }}
                                className="w-full px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 text-left font-semibold"
                              >
                                <Plus className="w-3.5 h-3.5 text-emerald-500" /> Add Stop
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleShareSegment(seg);
                                  setActiveMenuId(null);
                                  setMenuCoords(null);
                                }}
                                className="w-full px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 text-left font-semibold"
                              >
                                <Share2 className="w-3.5 h-3.5 text-blue-500" /> Share
                              </button>
                              <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
                              <button
                                type="button"
                                onClick={() => {
                                  handleDeleteSegment(seg.id);
                                  setActiveMenuId(null);
                                  setMenuCoords(null);
                                }}
                                className="w-full px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 flex items-center gap-1.5 text-left font-semibold"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </motion.div>
                          </>,
                          document.body
                        )}
                      </div>

                      {/* Fare */}
                      <div className="text-left sm:text-right order-1 sm:order-2 mt-0 sm:mt-auto flex items-baseline sm:flex-col gap-1 sm:gap-0">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block leading-none sm:hidden">Fare:</span>
                        <span className="text-sm sm:text-lg font-black text-slate-900 dark:text-white block leading-none">
                          {trip.currency}{seg.fare.toLocaleString()}
                        </span>
                        <span className="text-[9px] sm:text-[11px] text-slate-400 font-bold block leading-none mt-1 hidden sm:block">Fare</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. VEHICLES (Requirement 7) */}
      {activeSubTab === "vehicles" && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-600" />
            Registered Vehicles & Service Reminders
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trip.vehicles.map((v) => (
              <div
                key={v.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">
                    {v.vehicleName}
                  </h4>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {v.registrationNumber}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-1">
                  <div>Fuel Type: <span className="font-bold text-slate-900 dark:text-white">{v.fuelType}</span></div>
                  <div>Mileage: <span className="font-bold text-slate-900 dark:text-white">{v.mileageKmPerLitre} km/L</span></div>
                  <div>Tank Capacity: <span className="font-bold text-slate-900 dark:text-white">{v.fuelCapacityLitres} L</span></div>
                  <div>Insurance: <span className="font-bold text-slate-900 dark:text-white">{v.insuranceExpiry}</span></div>
                  <div>PUC Expiry: <span className="font-bold text-slate-900 dark:text-white">{v.pucExpiry}</span></div>
                  <div>Service Due: <span className="font-bold text-amber-600 dark:text-amber-400">{v.serviceReminderDate}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. FUEL TRACKER (Requirement 8) */}
      {activeSubTab === "fuel" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Fuel className="w-5 h-5 text-amber-500" />
                Fuel Logs & Average Mileage Tracker
              </h3>
              <p className="text-xs text-slate-500">Track fuel refill receipts, cost per litre, and km mileage.</p>
            </div>

          {role !== "traveller" && (
            <button
              onClick={() => setIsFuelModalOpen(true)}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              + Log Fuel Refill
            </button>
          )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500">Total Fuel Spent</span>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                {trip.currency}
                {trip.fuelLogs.reduce((acc, f) => acc + f.totalCost, 0).toLocaleString()}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500">Total Litres</span>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                {trip.fuelLogs.reduce((acc, f) => acc + f.litres, 0)} L
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500">Average Trip Mileage</span>
              <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                14.1 km/L
              </p>
            </div>
          </div>

          {/* Desktop Table view (hidden on mobile) */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Station</th>
                  <th className="p-3">Price/L</th>
                  <th className="p-3">Litres</th>
                  <th className="p-3">Distance</th>
                  <th className="p-3">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {trip.fuelLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="p-3">{log.date}</td>
                    <td className="p-3 font-semibold">{log.stationName}</td>
                    <td className="p-3">{trip.currency}{log.fuelPricePerLitre}</td>
                    <td className="p-3">{log.litres} L</td>
                    <td className="p-3">{log.distanceKm} km</td>
                    <td className="p-3 font-bold">{trip.currency}{log.totalCost.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card view (hidden on desktop) */}
          <div className="block md:hidden space-y-3">
            {trip.fuelLogs.map((log) => (
              <div key={log.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{log.stationName}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">{log.date}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 dark:border-slate-800/60 pt-2.5">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Price / Litre</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{trip.currency}{log.fuelPricePerLitre}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Litres Filed</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{log.litres} L</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Distance</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{log.distanceKm} km</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Total Cost</span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400">{trip.currency}{log.totalCost.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. FLIGHTS (Requirement 9) */}
      {activeSubTab === "flights" && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Plane className="w-5 h-5 text-sky-500" />
            Flight Bookings & Boarding Passes
          </h3>

          {trip.flights.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              No flights logged for this trip.
            </p>
          ) : (
            trip.flights.map((flt) => (
              <div
                key={flt.id}
                className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white border border-slate-700 shadow-md space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plane className="w-5 h-5 text-sky-400" />
                    <span className="font-extrabold text-base">{flt.airline}</span>
                    <span className="text-xs bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded border border-sky-500/30">
                      {flt.flightNumber}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">● {flt.status}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-slate-700/80 pt-3">
                  <div><span className="text-slate-400 block">Terminal / Gate:</span> <span className="font-bold">{flt.terminal}, {flt.gate}</span></div>
                  <div><span className="text-slate-400 block">Boarding Time:</span> <span className="font-bold">{flt.boardingTime}</span></div>
                  <div><span className="text-slate-400 block">Seat Assigned:</span> <span className="font-bold">{flt.seat}</span></div>
                  <div><span className="text-slate-400 block">Baggage:</span> <span className="font-bold">{flt.baggageAllowance}</span></div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 5. TRAINS (Requirement 10) */}
      {activeSubTab === "trains" && (
        <TrainDetailsModule
          trip={trip}
          onUpdateTrip={onUpdateTrip}
          onOpenAddSegment={handleOpenAddSegment}
          onEditSegment={handleOpenEdit}
        />
      )}

      {/* 6. BUSES (Requirement 11) */}
      {activeSubTab === "buses" && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bus className="w-5 h-5 text-purple-500" />
            Bus Operator & Seat Details
          </h3>

          {trip.buses.map((bus) => (
            <div
              key={bus.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">{bus.operator}</span>
                <span className="text-xs text-slate-500">{bus.busNumber}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Boarding: {bus.boardingPoint} → Drop: {bus.dropPoint} • Seat: {bus.seat}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 7. HOTELS (Requirement 12) */}
      {activeSubTab === "hotels" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-teal-600" />
                Hotels & Stays ({trip.hotels.length})
              </h3>
              <p className="text-xs text-slate-500">Check-in times, room numbers, and booking vouchers.</p>
            </div>

          {role !== "traveller" && (
            <button
              onClick={() => setIsHotelModalOpen(true)}
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              + Add Hotel Booking
            </button>
          )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trip.hotels.map((htl) => (
              <div
                key={htl.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base">
                      {htl.hotelName}
                    </h4>
                    <p className="text-xs text-slate-500">{htl.roomTypeNumber}</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                    {htl.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div>Check-in: <span className="font-semibold text-slate-900 dark:text-white block">{htl.checkIn}</span></div>
                  <div>Check-out: <span className="font-semibold text-slate-900 dark:text-white block">{htl.checkOut}</span></div>
                  <div>Guests: <span className="font-semibold text-slate-900 dark:text-white">{htl.guestsCount} Persons</span></div>
                  <div>Amount Paid: <span className="font-bold text-teal-600">{trip.currency}{htl.amount.toLocaleString()}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

              {/* Segment Add Modal */}
      {isSegmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-[24px] sm:rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-4 mt-auto sm:mt-0 max-h-[90vh] sm:max-h-[95vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  {editingSegment ? "Edit Segment" : "Add Journey Segment"}
                </h3>
                <p className="text-[10px] text-slate-400">Complete standard fields in 30s. Expand for tickets or optional logs.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSegmentModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 dark:text-slate-500 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSegment} className="space-y-4">
              {/* Transport Mode Choice */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Transport Mode</label>
                <select
                  value={transType}
                  onChange={(e) => setTransType(e.target.value as TransportType)}
                  className="w-full h-11 px-3 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 font-medium transition-all"
                >
                  {transportTypesList.map((t) => (
                    <option key={t.type} value={t.type}>{t.type}</option>
                  ))}
                </select>
              </div>

              {/* Dynamic form body based on category */}
              <div className="space-y-3">
                {transportCategory === "Bus" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Operator Name *</label>
                      <input
                        type="text"
                        required
                        value={operatorName}
                        onChange={(e) => setOperatorName(e.target.value)}
                        placeholder="e.g. KSRTC, RedBus, VRL"
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Boarding Point *</label>
                        <input
                          type="text"
                          required
                          value={fromLoc}
                          onChange={(e) => setFromLoc(e.target.value)}
                          placeholder="e.g. Majestic BS"
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Drop Point *</label>
                        <input
                          type="text"
                          required
                          value={toLoc}
                          onChange={(e) => setToLoc(e.target.value)}
                          placeholder="e.g. Central Station"
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Departure Date & Time *</label>
                        <input
                          type="datetime-local"
                          required
                          value={departureTime}
                          onChange={(e) => setDepartureTime(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Arrival Date & Time *</label>
                        <input
                          type="datetime-local"
                          required
                          value={arrivalTime}
                          onChange={(e) => setArrivalTime(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Seat *</label>
                        <input
                          type="text"
                          required
                          value={seatNo}
                          onChange={(e) => setSeatNo(e.target.value)}
                          placeholder="e.g. 12A"
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Fare ({trip.currency}) *</label>
                        <input
                          type="number"
                          required
                          value={fareAmt || ""}
                          onChange={(e) => setFareAmt(Number(e.target.value))}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status *</label>
                        <select
                          value={bookingStatus}
                          onChange={(e) => setBookingStatus(e.target.value as any)}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                          <option value="Booked">Booked</option>
                          <option value="Pending">Pending</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowMoreDetails(!showMoreDetails)}
                      className="w-full flex items-center justify-between py-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-all border-t border-slate-100 dark:border-slate-800 mt-2"
                    >
                      <span>{showMoreDetails ? "Hide Optional Details" : "Show More Details (Bus Number, Ticket, Notes)"}</span>
                      <ChevronDown className={`w-4 h-4 transform transition-transform ${showMoreDetails ? "rotate-180" : ""}`} />
                    </button>

                    {showMoreDetails && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="space-y-3 pt-2"
                      >
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Bus Number (optional)</label>
                          <input
                            type="text"
                            value={busNumber}
                            onChange={(e) => setBusNumber(e.target.value)}
                            placeholder="e.g. KA-01-F-1234"
                            className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                          />
                        </div>

                        {renderTicketUploader()}

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes (optional)</label>
                          <textarea
                            value={segmentNotes}
                            onChange={(e) => setSegmentNotes(e.target.value)}
                            placeholder="e.g. Dinner break at highway hotel..."
                            rows={2}
                            className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                          />
                        </div>
                      </motion.div>
                    )}
                  </>
                )}

                {transportCategory === "Train" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Train Name/Number *</label>
                      <input
                        type="text"
                        required
                        value={operatorName}
                        onChange={(e) => setOperatorName(e.target.value)}
                        placeholder="e.g. Shatabdi Express (12002)"
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <StationAutocomplete
                        label="Boarding Station *"
                        required
                        value={fromLoc}
                        onChange={(formatted) => setFromLoc(formatted)}
                        placeholder="Search station or code (e.g. KBPR, CAN, YPR)..."
                      />
                      <StationAutocomplete
                        label="Destination Station *"
                        required
                        value={toLoc}
                        onChange={(formatted) => setToLoc(formatted)}
                        placeholder="Search station or code (e.g. NDLS, SBC)..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Departure Date & Time *</label>
                        <input
                          type="datetime-local"
                          required
                          value={departureTime}
                          onChange={(e) => setDepartureTime(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Arrival Date & Time *</label>
                        <input
                          type="datetime-local"
                          required
                          value={arrivalTime}
                          onChange={(e) => setArrivalTime(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Coach</label>
                        <input
                          type="text"
                          value={coach}
                          onChange={(e) => setCoach(e.target.value)}
                          placeholder="e.g. B1"
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Seat/Berth</label>
                        <input
                          type="text"
                          value={seatNo}
                          onChange={(e) => setSeatNo(e.target.value)}
                          placeholder="e.g. 24"
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Fare ({trip.currency}) *</label>
                        <input
                          type="number"
                          required
                          value={fareAmt || ""}
                          onChange={(e) => setFareAmt(Number(e.target.value))}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowMoreDetails(!showMoreDetails)}
                      className="w-full flex items-center justify-between py-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-all border-t border-slate-100 dark:border-slate-800 mt-2"
                    >
                      <span>{showMoreDetails ? "Hide Optional Details" : "Show More Details (PNR, Ticket, Notes)"}</span>
                      <ChevronDown className={`w-4 h-4 transform transition-transform ${showMoreDetails ? "rotate-180" : ""}`} />
                    </button>

                    {showMoreDetails && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="space-y-3 pt-2"
                      >
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">PNR Number</label>
                          <input
                            type="text"
                            value={pnr}
                            onChange={(e) => setPnr(e.target.value)}
                            placeholder="e.g. 423-1234567"
                            className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                          />
                        </div>

                        {renderTicketUploader()}

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes (optional)</label>
                          <textarea
                            value={segmentNotes}
                            onChange={(e) => setSegmentNotes(e.target.value)}
                            placeholder="e.g. Platform info or layout details..."
                            rows={2}
                            className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                          />
                        </div>
                      </motion.div>
                    )}
                  </>
                )}

                {transportCategory === "Flight" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Airline *</label>
                        <input
                          type="text"
                          required
                          value={operatorName}
                          onChange={(e) => setOperatorName(e.target.value)}
                          placeholder="e.g. Indigo"
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Flight Number *</label>
                        <input
                          type="text"
                          required
                          value={bookingNo}
                          onChange={(e) => setBookingNo(e.target.value)}
                          placeholder="e.g. 6E-2412"
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">From Airport *</label>
                        <input
                          type="text"
                          required
                          value={fromLoc}
                          onChange={(e) => setFromLoc(e.target.value)}
                          placeholder="e.g. DEL"
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">To Airport *</label>
                        <input
                          type="text"
                          required
                          value={toLoc}
                          onChange={(e) => setToLoc(e.target.value)}
                          placeholder="e.g. BOM"
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Departure Date & Time *</label>
                        <input
                          type="datetime-local"
                          required
                          value={departureTime}
                          onChange={(e) => setDepartureTime(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Arrival Date & Time *</label>
                        <input
                          type="datetime-local"
                          required
                          value={arrivalTime}
                          onChange={(e) => setArrivalTime(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Seat Number *</label>
                        <input
                          type="text"
                          required
                          value={seatNo}
                          onChange={(e) => setSeatNo(e.target.value)}
                          placeholder="e.g. 12F"
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Fare ({trip.currency}) *</label>
                        <input
                          type="number"
                          required
                          value={fareAmt || ""}
                          onChange={(e) => setFareAmt(Number(e.target.value))}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowMoreDetails(!showMoreDetails)}
                      className="w-full flex items-center justify-between py-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-all border-t border-slate-100 dark:border-slate-800 mt-2"
                    >
                      <span>{showMoreDetails ? "Hide Optional Details" : "Show More Details (Ticket, Notes)"}</span>
                      <ChevronDown className={`w-4 h-4 transform transition-transform ${showMoreDetails ? "rotate-180" : ""}`} />
                    </button>

                    {showMoreDetails && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="space-y-3 pt-2"
                      >
                        {renderTicketUploader()}

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes (optional)</label>
                          <textarea
                            value={segmentNotes}
                            onChange={(e) => setSegmentNotes(e.target.value)}
                            placeholder="e.g. Baggage details, terminal information..."
                            rows={2}
                            className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                          />
                        </div>
                      </motion.div>
                    )}
                  </>
                )}

                {transportCategory === "Taxi" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Provider (Uber, Ola, Local) *</label>
                      <input
                        type="text"
                        required
                        value={operatorName}
                        onChange={(e) => setOperatorName(e.target.value)}
                        placeholder="e.g. Uber, Ola, Local Cab"
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Pickup Point *</label>
                        <input
                          type="text"
                          required
                          value={fromLoc}
                          onChange={(e) => setFromLoc(e.target.value)}
                          placeholder="e.g. Hotel Main Entrance"
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Drop Point *</label>
                        <input
                          type="text"
                          required
                          value={toLoc}
                          onChange={(e) => setToLoc(e.target.value)}
                          placeholder="e.g. Gateway Mall"
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Departure Time *</label>
                        <input
                          type="datetime-local"
                          required
                          value={departureTime}
                          onChange={(e) => setDepartureTime(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Fare ({trip.currency}) *</label>
                        <input
                          type="number"
                          required
                          value={fareAmt || ""}
                          onChange={(e) => setFareAmt(Number(e.target.value))}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowMoreDetails(!showMoreDetails)}
                      className="w-full flex items-center justify-between py-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-all border-t border-slate-100 dark:border-slate-800 mt-2"
                    >
                      <span>{showMoreDetails ? "Hide Optional Details" : "Show More Details (Driver, Notes)"}</span>
                      <ChevronDown className={`w-4 h-4 transform transition-transform ${showMoreDetails ? "rotate-180" : ""}`} />
                    </button>

                    {showMoreDetails && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="space-y-3 pt-2"
                      >
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Driver Name (optional)</label>
                          <input
                            type="text"
                            value={driverName}
                            onChange={(e) => setDriverName(e.target.value)}
                            placeholder="e.g. Satish Kumar"
                            className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes (optional)</label>
                          <textarea
                            value={segmentNotes}
                            onChange={(e) => setSegmentNotes(e.target.value)}
                            placeholder="e.g. Cab color/number plates or driver OTP..."
                            rows={2}
                            className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                          />
                        </div>
                      </motion.div>
                    )}
                  </>
                )}

                {transportCategory === "PersonalVehicle" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Vehicle Name *</label>
                      <input
                        type="text"
                        required
                        value={operatorName}
                        onChange={(e) => setOperatorName(e.target.value)}
                        placeholder="e.g. Honda City, Pulsar 220"
                        className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">From *</label>
                        <input
                          type="text"
                          required
                          value={fromLoc}
                          onChange={(e) => setFromLoc(e.target.value)}
                          placeholder="e.g. Bangalore"
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">To *</label>
                        <input
                          type="text"
                          required
                          value={toLoc}
                          onChange={(e) => setToLoc(e.target.value)}
                          placeholder="e.g. Mysore"
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Departure Time *</label>
                        <input
                          type="datetime-local"
                          required
                          value={departureTime}
                          onChange={(e) => setDepartureTime(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Distance (km) *</label>
                        <input
                          type="number"
                          required
                          value={distKm || ""}
                          onChange={(e) => setDistKm(Number(e.target.value))}
                          placeholder="e.g. 145"
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowMoreDetails(!showMoreDetails)}
                      className="w-full flex items-center justify-between py-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-all border-t border-slate-100 dark:border-slate-800 mt-2"
                    >
                      <span>{showMoreDetails ? "Hide Optional Details" : "Show More Details (Fuel Costs, Tolls, Notes)"}</span>
                      <ChevronDown className={`w-4 h-4 transform transition-transform ${showMoreDetails ? "rotate-180" : ""}`} />
                    </button>

                    {showMoreDetails && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="space-y-3 pt-2"
                      >
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Fuel Cost ({trip.currency})</label>
                            <input
                              type="number"
                              value={fuelCost || ""}
                              onChange={(e) => setFuelCost(Number(e.target.value))}
                              placeholder="e.g. 1500"
                              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Toll & Parking ({trip.currency})</label>
                            <input
                              type="number"
                              value={tollParking || ""}
                              onChange={(e) => setTollParking(Number(e.target.value))}
                              placeholder="e.g. 240"
                              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes (optional)</label>
                          <textarea
                            value={segmentNotes}
                            onChange={(e) => setSegmentNotes(e.target.value)}
                            placeholder="e.g. Highway route chosen, road conditions..."
                            rows={2}
                            className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                          />
                        </div>
                      </motion.div>
                    )}
                  </>
                )}

                {transportCategory === "Walking" && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">From *</label>
                        <input
                          type="text"
                          required
                          value={fromLoc}
                          onChange={(e) => setFromLoc(e.target.value)}
                          placeholder="e.g. Gate A"
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">To *</label>
                        <input
                          type="text"
                          required
                          value={toLoc}
                          onChange={(e) => setToLoc(e.target.value)}
                          placeholder="e.g. Food Court"
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Distance (km) *</label>
                        <input
                          type="number"
                          step="0.1"
                          required
                          value={distKm || ""}
                          onChange={(e) => setDistKm(Number(e.target.value))}
                          placeholder="e.g. 0.8"
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Estimated Time *</label>
                        <input
                          type="text"
                          required
                          value={durationStr}
                          onChange={(e) => setDurationStr(e.target.value)}
                          placeholder="e.g. 10m, 45m"
                          className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowMoreDetails(!showMoreDetails)}
                      className="w-full flex items-center justify-between py-2 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-all border-t border-slate-100 dark:border-slate-800 mt-2"
                    >
                      <span>{showMoreDetails ? "Hide Optional Details" : "Show More Details (Notes)"}</span>
                      <ChevronDown className={`w-4 h-4 transform transition-transform ${showMoreDetails ? "rotate-180" : ""}`} />
                    </button>

                    {showMoreDetails && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="space-y-3 pt-2"
                      >
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes (optional)</label>
                          <textarea
                            value={segmentNotes}
                            onChange={(e) => setSegmentNotes(e.target.value)}
                            placeholder="e.g. Walking path description or sightseeing points..."
                            rows={2}
                            className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-900 dark:text-white"
                          />
                        </div>
                      </motion.div>
                    )}
                  </>
                )}
              </div>

              {/* Form Actions Footer */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSegmentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg shadow-md transition-all"
                >
                  Save Segment
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Fuel Log Modal */}
      {isFuelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-[24px] sm:rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4 mt-auto sm:mt-0"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white">Log Fuel Refill</h3>
              <button onClick={() => setIsFuelModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleAddFuel} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Station Name</label>
                <input type="text" value={fuelStation} onChange={(e) => setFuelStation(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border text-slate-900 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Price per Litre</label>
                  <input type="number" value={fuelPrice} onChange={(e) => setFuelPrice(Number(e.target.value))} className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Litres Filled</label>
                  <input type="number" value={fuelLitres} onChange={(e) => setFuelLitres(Number(e.target.value))} className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border text-slate-900 dark:text-white" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setIsFuelModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold bg-amber-500 text-slate-950 rounded-lg">Save Refill</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Hotel Modal */}
      {isHotelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-[24px] sm:rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4 mt-auto sm:mt-0"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-slate-900 dark:text-white">Add Hotel Booking</h3>
              <button onClick={() => setIsHotelModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleAddHotel} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Hotel Name *</label>
                <input type="text" required value={hotelName} onChange={(e) => setHotelName(e.target.value)} placeholder="e.g. Taj Exotica" className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border text-slate-950 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Room Details</label>
                  <input type="text" value={roomType} onChange={(e) => setRoomType(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border text-slate-950 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Amount ({trip.currency})</label>
                  <input type="number" value={hotelAmount} onChange={(e) => setHotelAmount(Number(e.target.value))} className="w-full px-3 py-2 text-sm rounded-lg bg-slate-50 dark:bg-slate-800 border text-slate-900 dark:text-white" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setIsHotelModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancel</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold bg-teal-600 text-white rounded-lg">Save Hotel</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg border border-slate-800 flex items-center gap-2 animate-fadeIn">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          {toastMessage}
        </div>
      )}
    </div>
  );
};
