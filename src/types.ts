/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TripStatus = "Upcoming" | "Ongoing" | "Completed" | "Cancelled";
export type TripPurpose =
  | "Vacation"
  | "Business"
  | "Pilgrimage"
  | "Education"
  | "Family"
  | "Adventure"
  | "Other";

export type TravellerRole = "Organizer" | "Traveller" | "Driver" | "Guest" | "Guide";

export type TransportType =
  | "Walking"
  | "Cycle"
  | "Bike"
  | "Car"
  | "Taxi"
  | "Auto"
  | "Bus"
  | "Metro"
  | "Train"
  | "Flight"
  | "Ship"
  | "Ferry"
  | "Helicopter";

export type ExpenseCategory =
  | "Fuel"
  | "Food"
  | "Hotel"
  | "Taxi"
  | "Bus"
  | "Train"
  | "Flight"
  | "Shopping"
  | "Parking"
  | "Toll"
  | "Medical"
  | "Entertainment"
  | "Emergency"
  | "Others";

export type SplitType = "equal" | "percentage" | "custom";

export type PaymentMethod = "Cash" | "UPI" | "Bank Transfer" | "Card" | "Other";
export type CollectionStatus = "Paid" | "Partial" | "Unpaid";

export interface PaymentRecord {
  id: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  notes?: string;
  recordedBy?: string;
  createdAt?: string;
}

export interface Traveller {
  id: string;
  profilePhoto?: string;
  profilePhotoUrl?: string;
  fullName: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  phone: string;
  email: string;
  emergencyContact: string;
  bloodGroup: string;
  passportNumber?: string;
  drivingLicense?: string;
  role: TravellerRole;
  allocatedBudget: number; // Individual budget
  paidAmount?: number; // Total amount collected so far
  paymentHistory?: PaymentRecord[]; // History of payments
  status?: string;
}

export interface TransportSegment {
  id: string;
  transportType: TransportType;
  from: string;
  to: string;
  departure: string; // ISO datetime or formatted
  arrival: string;   // ISO datetime or formatted
  departureDateTime?: string; // ISO datetime string for sorting/filtering
  arrivalDateTime?: string;   // ISO datetime string for sorting/filtering
  distanceKm: number;
  duration: string;  // e.g., "3h 45m"
  fare: number;
  seatNumber?: string;
  bookingNumber?: string;
  operator?: string;
  status: "Confirmed" | "Pending" | "In Transit" | "Completed" | "Cancelled";
  notes?: string;
  
  // Simplified form specific fields
  busNumber?: string;
  ticketUrl?: string;
  coach?: string;
  pnr?: string;
  driverName?: string;
  fuelCost?: number;
  tollParking?: number;
  bookingStatus?: "Booked" | "Pending" | "Cancelled";
}

export interface VehicleDetails {
  id: string;
  vehicleName: string;
  registrationNumber: string;
  fuelType: "Petrol" | "Diesel" | "Electric" | "CNG" | "Hybrid";
  mileageKmPerLitre: number;
  fuelCapacityLitres: number;
  insuranceExpiry: string;
  serviceReminderDate: string;
  pucExpiry: string;
}

export interface FuelLog {
  id: string;
  date: string;
  fuelPricePerLitre: number;
  litres: number;
  distanceKm: number;
  totalCost: number;
  mileageAchieved: number;
  stationName?: string;
  notes?: string;
}

export interface FlightDetail {
  id: string;
  airline: string;
  flightNumber: string;
  terminal: string;
  gate: string;
  boardingTime: string;
  seat: string;
  ticketNumber: string;
  baggageAllowance: string;
  status: "On Time" | "Boarding" | "Delayed" | "Landed";
}

export interface TrainDetail {
  id: string;
  trainName: string;
  trainNumber: string;
  pnr: string;
  coach: string;
  seat: string;
  platform: string;
  status: "Confirmed" | "RAC" | "WL" | "Departed";
}

export interface BusDetail {
  id: string;
  operator: string;
  busNumber: string;
  seat: string;
  boardingPoint: string;
  dropPoint: string;
}

export interface HotelModule {
  id: string;
  hotelName: string;
  roomTypeNumber: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  bookingId: string;
  amount: number;
  address?: string;
  status: "Booked" | "Checked In" | "Checked Out" | "Cancelled";
  notes?: string;
}

export interface Expense {
  id: string;
  tripId: string;
  description: string;
  amount: number;
  whoPaidId: string; // Traveller ID who paid
  whoUsedIds: string[]; // Traveller IDs sharing this expense
  category: ExpenseCategory;
  accountUsedId: string; // Cash, HDFC, SBI, Credit Card, Wallet
  splitType: SplitType;
  splits: Record<string, number>; // travellerId -> amount
  receiptUrl?: string;
  date: string;
  notes?: string;
  // Smart amount entry fields
  enteredAmount?: number;
  amountMode?: "per_person" | "total";
  travellerCount?: number;
  calculatedTotal?: number;
}

export interface PersonalExpense {
  id: string;
  tripId: string;
  travellerUid: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  notes: string;
  createdAt: string;
}

export interface DocumentItem {
  id: string;
  tripId: string;
  travellerId?: string;
  title: string;
  docType:
    | "Passport"
    | "Visa"
    | "Driving License"
    | "Tickets"
    | "Hotel Booking"
    | "Insurance"
    | "Receipts"
    | "Other"
    | string;
  fileUrl: string; // Data URL or external image/pdf URL
  notes?: string;
  uploadedAt: string;
  fileSize?: string;
}

export interface ChecklistItem {
  id: string;
  tripId: string;
  title: string;
  category: string;
  isPacked: boolean;
  assignedTravellerId?: string;
  ownerUid?: string;
}

export type ActivityCategory =
  | "Flights"
  | "Hotel Check-in"
  | "Transport"
  | "Meals"
  | "Sightseeing"
  | "Shopping"
  | "Events"
  | "Meetings"
  | "Photography"
  | "Personal Notes"
  | "Emergency"
  | "Tickets"
  | "Custom Activity"
  | string;

export type ActivityStatus = "Upcoming" | "In Progress" | "Completed" | "Cancelled";

export type ReminderOption = "15m" | "30m" | "1h" | "1d" | "none";

export interface ActivityAttachment {
  id: string;
  name: string;
  url: string;
  size?: string;
  type?: string;
}

export interface TimelineActivity {
  id: string;
  tripId: string;
  time: string;
  endTime?: string;
  activityDateTime?: string; // ISO datetime string
  activityEndDateTime?: string; // ISO datetime string
  title: string;
  description: string;
  category: ActivityCategory;
  transportType?: TransportType;
  location?: string;
  date?: string; // YYYY-MM-DD or Day descriptor
  dayIndex?: number; // 1-indexed day number
  assignedTravellerIds?: string[]; // IDs of assigned travellers
  estimatedCost?: number;
  status?: ActivityStatus;
  notes?: string;
  attachments?: ActivityAttachment[];
  reminder?: ReminderOption;
  distanceFromPreviousKm?: number;
  travelTimeFromPreviousMinutes?: number;
}

export interface FinanceAccount {
  id: string;
  name: string;
  type: "bank" | "cash" | "credit_card" | "wallet" | "Cash in Hand" | "Bank Account" | "Savings Account" | "Current Account" | "Credit Card" | "Debit Card" | "Wallet" | "UPI Account" | "Foreign Currency Account" | "Investment Account" | "Other" | string;
  balance: number;
  
  // Basic Information
  bankName?: string;
  nickname?: string;
  accountHolderName?: string;
  
  // Banking Information
  accountNumber?: string;
  ifscCode?: string;
  branch?: string;
  upiId?: string;
  swiftCode?: string;
  
  // Financial Information
  openingBalance?: number;
  currentBalance?: number;
  currency?: string;
  creditLimit?: number;
  minimumBalance?: number;
  interestRate?: number;
  
  // Settings
  autoDeductExpenses?: boolean;
  includeInDashboard?: boolean;
  active?: boolean; // Active / Inactive
  isDefaultPayment?: boolean;
  
  // Customization
  color: string;
  iconName: string;
  notes?: string;
}

export interface CashbookEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "debit" | "credit";
  accountId: string;
  category: string;
  tripId?: string;
  travellerId?: string;
  auditTrail: string; // Timestamp & user details
}

export interface PendingTravellerRegistration {
  id: string;
  submissionDate: string; // ISO or formatted date string
  fullName: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  role: TravellerRole;
  allocatedBudget: number;
  phone: string;
  emergencyContact: string;
  bloodGroup: string;
  email: string;
  passportNumber?: string;
  drivingLicense?: string;
  profilePhoto?: string;
  profilePhotoUrl?: string;
  accuracyConfirmed: boolean;
  status: "Pending" | "Approved" | "Rejected";
}

export interface GoogleFormConfig {
  formId: string;
  responderUri: string;
  spreadsheetId?: string;
  createdAt: string;
}

export type AppRole = "traveller" | "organizer" | "super_admin";

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export interface AppUser {
  uid: string;
  email: string;
  fullName: string;
  phone?: string;
  role: AppRole;
  organizationId?: string;
  city?: string;
  country?: string;
  createdAt: string;
}

export interface InviteLink {
  id: string;
  tripId: string;
  organizationId: string;
  code: string; // Unique Trip ID like GOA8F3A
  isActive: boolean;
  createdAt: string;
}

export interface JoinRequest {
  id: string;
  tripId: string;
  fullName: string;
  mobileNumber: string;
  email?: string;
  age?: number;
  gender?: string;
  emergencyContact?: string;
  profilePhoto?: string;
  profilePhotoUrl?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  type: string;
  startDate: string;
  endDate: string;
  coverImage?: string;
  organizerId: string;
  organizationId: string;
  expectedTravellers?: number;
  expectedBudget?: number;
  currency: string;
  defaultExpenseSplit: "Equal" | "Manual" | "Percentage";
  approvalRequired: boolean;
  inviteCode: string;
  tripCode?: string;
  createdAt: string;
  
  // Existing fields for compatibility
  purpose: TripPurpose;
  color: string;
  coverPhoto: string;
  notes: string;
  status: TripStatus;
  travelCategory: string;
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  totalDistanceKm: number;
  totalDuration: string;
  currentJourneyStatus: string;
  
  travellers: Traveller[];
  segments: TransportSegment[];
  vehicles: VehicleDetails[];
  fuelLogs: FuelLog[];
  flights: FlightDetail[];
  trains: TrainDetail[];
  buses: BusDetail[];
  hotels: HotelModule[];
  expenses: Expense[];
  documents: DocumentItem[];
  checklist: ChecklistItem[];
  customCategories?: string[];
  timeline: TimelineActivity[];
  
  organizerUid?: string;
  memberUids?: string[];
  members?: Record<string, any>;
  pendingRegistrations?: PendingTravellerRegistration[];
}

export interface AIInsightsResponse {
  cheaperRoutes: string[];
  predictedFuelCost: number;
  predictedTotalCost: number;
  budgetWarning: string | null;
  hotelSuggestions: string[];
  restaurantSuggestions: string[];
  travelInsights: string[];
}

export type DiaryMood =
  | "😊 Happy"
  | "🤩 Amazing"
  | "😌 Relaxed"
  | "🥱 Tired"
  | "🥹 Emotional"
  | "😮 Surprised"
  | "❤️ Memorable";

export interface DiaryEntry {
  id: string;
  tripId: string;
  ownerUid: string;
  travellerName?: string;
  date: string;
  title: string;
  location?: string;
  content: string;
  mood?: string;
  photos: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RouteSession {
  id: string;
  tripId: string;
  userId: string;
  startTime: string;
  endTime?: string;
  status: "active" | "paused" | "ended";
  totalDistance: number;
  totalDuration: number;
}

export interface RoutePoint {
  id: string;
  sessionId: string;
  lat: number;
  lng: number;
  timestamp: string;
  accuracy: number;
  speed: number;
}
