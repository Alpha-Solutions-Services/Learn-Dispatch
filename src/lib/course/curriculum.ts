/** Curriculum mapped from “Truck Dispatch Course finalized” (Alpha Freight Network). */

export const COURSE = {
  brand: "Alpha Freight Network",
  product: "Learn Dispatch",
  title: "Professional Truck Dispatcher Training",
  author: "Muhammad Mikran Sandhu",
  tagline:
    "Learn how real US freight dispatchers work — from load boards and rate negotiation to carrier docs, RC/BOL/POD, and broker communication.",
  durationLabel: "Self-paced · ~2 months recommended",
  supportEmail: "support@freight.alphasolutions.software",
  whatsapp: "https://wa.me/923494206922",
} as const;

export type CourseModule = {
  order: number;
  title: string;
  summary: string;
  topics: string[];
};

/** Published syllabus shown on the public site and used to seed academy_modules. */
export const COURSE_MODULES: CourseModule[] = [
  {
    order: 1,
    title: "US map, regions & time zones",
    summary: "Know the lanes before you book — regions, states, and time zones dispatchers use every day.",
    topics: ["USA regional map", "Time zones", "50 states orientation"],
  },
  {
    order: 2,
    title: "Who is a dispatcher",
    summary: "The bridge between broker and carrier — your role, services, and how the freight chain fits together.",
    topics: [
      "Load information",
      "Rate negotiation",
      "Carrier documentation",
      "Broker / shipper / consignee communication",
    ],
  },
  {
    order: 3,
    title: "Equipment we deal with",
    summary: "Box truck, hotshot, power only, dry van, reefer, flatbed, and step deck — capacities and rate ranges.",
    topics: [
      "Box truck 24–28ft",
      "Hotshot / gooseneck",
      "Power only (day cab & sleeper)",
      "Dry van & reefer 48–53ft",
      "Flatbed & step deck",
    ],
  },
  {
    order: 4,
    title: "Drivers, HOS & ELD",
    summary: "Solo vs team miles, legal hours, CDL vs non-CDL, and electronic logging / GPS tracking.",
    topics: ["Solo vs team drivers", "HOS basics", "ELD devices", "MacroPoint / Trucker Tools style tracking"],
  },
  {
    order: 5,
    title: "Haul types & driver-friendly loads",
    summary: "Local to long haul, round trips, dedicated lanes — and how to spot a DFL (driver-friendly load).",
    topics: [
      "Local / regional / short / medium / long haul",
      "Round haul & dedicated lanes",
      "Max rate, min weight, min deadhead",
    ],
  },
  {
    order: 6,
    title: "How carriers get paid",
    summary: "Standard DTP, QuickPay, and factoring — what dispatchers must know before booking.",
    topics: ["Days to pay (DTP)", "QuickPay with voided check", "Factoring overview"],
  },
  {
    order: 7,
    title: "Carrier documents & profile",
    summary: "MC authority, W-9, COI, NOA, voided check — build a clean carrier profile brokers trust.",
    topics: [
      "MC authority letter",
      "W-9",
      "Certificate of Insurance (COI)",
      "Notice of Assignment (NOA)",
      "Voided check / QuickPay",
      "Carrier profile setup",
    ],
  },
  {
    order: 8,
    title: "Special permits & certifications",
    summary: "Hazmat, tanker, oversize, TWIC, and TSA — when brokers ask and what to verify.",
    topics: ["Hazmat classes", "Tanker endorsement", "Oversize permits", "TWIC & TSA"],
  },
  {
    order: 9,
    title: "Broker setup & certificate of holder",
    summary: "Carrier packets, one-time broker setup, and when COH is required on the COI.",
    topics: ["Carrier packet / setup", "PDF vs online packets", "Certificate of Holder (COH)"],
  },
  {
    order: 10,
    title: "RC, BOL, POD & accessorials",
    summary: "Rate confirmation through delivery paperwork — TONU, detention, layover, lumper, and scale tickets.",
    topics: [
      "Rate confirmation (RC)",
      "Bill of Lading (BOL)",
      "Proof of Delivery (POD)",
      "TONU, detention, layover, lumper",
      "Scale tickets",
      "Freight guard / MC reputation",
    ],
  },
  {
    order: 11,
    title: "Load boards in practice",
    summary: "DAT, Sylectus, 123Loadboard, Truckstop — posting constraints and equipment codes.",
    topics: ["DAT One / Power", "Sylectus for straight trucks", "123Loadboard", "Truckstop", "DAT posting codes"],
  },
  {
    order: 12,
    title: "Comms, VoIP & abbreviations",
    summary: "How desks call and email in the US — plus the abbreviations you will see on every board.",
    topics: [
      "RingCentral, OpenPhone, Vonage & more",
      "V / R / PO / SB equipment codes",
      "RC, BOL, POD, TONU, DH-O, FMCSA…",
    ],
  },
];

export const LEARNING_OUTCOMES = [
  "Explain the dispatcher’s role between broker and carrier",
  "Match equipment types to realistic rate and weight ranges",
  "Build and maintain a broker-ready carrier document packet",
  "Book with confidence using RC, BOL, and POD discipline",
  "Negotiate accessorials (TONU, detention, layover) with check-in/out times",
  "Search and post on major load boards using correct equipment codes",
] as const;
