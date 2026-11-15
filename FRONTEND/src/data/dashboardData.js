/**
 * Clearly labelled sample data for Digital Twin Smart City & Manufacturing System
 */

export const SYSTEM_META = {
  systemName: "<<YOUR PROJECT NAME>>",
  systemLabel: "Digital Twin System",
  developerName: "<<YOUR FULL NAME>>",
  developerRole: "Student / Developer",
  engineStatus: "Operational",
  syncRate: "99.98%",
  latency: "12ms",
  activeSensors: 14820,
  lastSyncTimestamp: "2026-11-12 23:02:15 UTC",
  selectedFacility: "Plant Alpha (Robotics & Cleanroom)",
  selectedDistrict: "Metropolitan Region Core"
};

/**
 * Computes avatar initials dynamically from user's full name
 */
export function getInitials(name) {
  if (!name) return 'U';
  // Strip characters like < > [ ]
  const clean = name.replace(/[<>[\]]/g, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * 4 Key Statistics Cards Data
 * Bridging Smart City infrastructure and Smart Manufacturing performance.
 */
export const STATS_DATA = [
  {
    id: "power-grid",
    label: "Municipal Grid Demand",
    value: "142.8 MW",
    trend: "+2.4%",
    isPositiveTrend: false,
    trendDescription: "vs 24h baseline",
    statusText: "Sample Load",
    badgeType: "info",
    iconName: "Zap",
    accentColor: "blue",
    detail: "Peak capacity reserve: 37.2 MW (20.6%)"
  },
  {
    id: "manufacturing-oee",
    label: "Industrial OEE Average",
    value: "88.6%",
    trend: "+3.2%",
    isPositiveTrend: true,
    trendDescription: "vs target 85.0%",
    statusText: "Sample Target",
    badgeType: "teal",
    iconName: "Factory",
    accentColor: "teal",
    detail: "18 active production lines synced"
  },
  {
    id: "mobility-flow",
    label: "Urban Mobility Index",
    value: "94.2%",
    trend: "+1.8%",
    isPositiveTrend: true,
    trendDescription: "flow efficiency",
    statusText: "Sample Transit",
    badgeType: "teal",
    iconName: "Activity",
    accentColor: "teal",
    detail: "482 smart intersections online"
  },
  {
    id: "twin-nodes",
    label: "Active Twin IoT Nodes",
    value: "14,820",
    trend: "99.94%",
    isPositiveTrend: true,
    trendDescription: "node availability",
    statusText: "Sample Nodes",
    badgeType: "info",
    iconName: "Cpu",
    accentColor: "blue",
    detail: "12 edge gateways in scheduled calibration"
  }
];

/**
 * Smart City Overview Data (Sample Data)
 */
export const CITY_METRICS = {
  summary: {
    totalPowerDemand: "142.8 MW",
    powerBaseline: "140.0 MW",
    airQualityIndex: "AQI 26",
    airQualityStatus: "Good / Clean",
    potableWaterPressure: "4.3 bar",
    waterPressureStatus: "Stable (99.8%)",
    activeTransitUnits: "1,240 Units",
    transitStatus: "On Schedule (96.4%)"
  },
  // 24-Hour Municipal Energy & Grid Load (MW)
  gridLoadHourly: [
    { time: "00:00", actualLoad: 88, baseline: 92 },
    { time: "03:00", actualLoad: 82, baseline: 86 },
    { time: "06:00", actualLoad: 112, baseline: 108 },
    { time: "09:00", actualLoad: 148, baseline: 142 },
    { time: "12:00", actualLoad: 154, baseline: 150 },
    { time: "15:00", actualLoad: 146, baseline: 145 },
    { time: "18:00", actualLoad: 162, baseline: 158 },
    { time: "21:00", actualLoad: 130, baseline: 132 }
  ],
  // District Level Infrastructure Twin Status (without redundant Sample tag)
  districts: [
    {
      id: "DIST-01",
      name: "Downtown Financial & Civic District",
      zoneCode: "Metro-Core",
      connectedNodes: 4320,
      powerDemand: "48.2 MW",
      trafficFlow: "89% Normal",
      airQuality: "AQI 32"
    },
    {
      id: "DIST-02",
      name: "North Science & Technology Corridor",
      zoneCode: "Tech-North",
      connectedNodes: 3890,
      powerDemand: "36.5 MW",
      trafficFlow: "97% Fluid",
      airQuality: "AQI 21"
    },
    {
      id: "DIST-03",
      name: "South Industrial Valley & Port",
      zoneCode: "Ind-South",
      connectedNodes: 4410,
      powerDemand: "44.7 MW",
      trafficFlow: "82% Heavy Fleet",
      airQuality: "AQI 41"
    },
    {
      id: "DIST-04",
      name: "Eastern Maritime Logistics Zone",
      zoneCode: "Port-East",
      connectedNodes: 2200,
      powerDemand: "13.4 MW",
      trafficFlow: "98% Fluid",
      airQuality: "AQI 18"
    }
  ]
};

/**
 * Manufacturing Performance Data (Sample Data)
 */
export const MANUFACTURING_METRICS = {
  facility: {
    name: "Advanced Cyber-Physical Plant 01",
    location: "Sector 4 Industrial Twin Park",
    overallOEE: 88.6,
    availability: 94.2,
    performance: 92.8,
    qualityRate: 98.6
  },
  // Production Output: Actual vs Planned across shifts
  shiftProduction: [
    { shift: "Shift 1 - Early", planned: 400, actual: 418, scrap: 4 },
    { shift: "Shift 1 - Mid", planned: 800, actual: 824, scrap: 8 },
    { shift: "Shift 1 - Wrap", planned: 1200, actual: 1210, scrap: 11 },
    { shift: "Shift 2 - Start", planned: 1600, actual: 1625, scrap: 14 },
    { shift: "Shift 2 - Mid", planned: 2000, actual: 2040, scrap: 18 },
    { shift: "Shift 2 - Peak", planned: 2400, actual: 2415, scrap: 21 }
  ],
  // Real-time Production Lines
  productionLines: [
    {
      id: "LINE-A",
      name: "Line A: Precision Robotic Assembly",
      category: "Robotics & Actuators",
      unitsPerHour: 442,
      targetRate: 420,
      efficiencyPct: 98.2,
      cycleTime: "14.2s",
      status: "Running",
      statusType: "success"
    },
    {
      id: "LINE-B",
      name: "Line B: High-Density SMT & Electronics",
      category: "Circuit Micro-fabrication",
      unitsPerHour: 615,
      targetRate: 600,
      efficiencyPct: 94.8,
      cycleTime: "8.6s",
      status: "Running",
      statusType: "success"
    },
    {
      id: "LINE-C",
      name: "Line C: 5-Axis CNC Milling Cell",
      category: "Heavy Component Machining",
      unitsPerHour: 184,
      targetRate: 200,
      efficiencyPct: 89.2,
      cycleTime: "24.5s",
      status: "Calibrating",
      statusType: "warning"
    },
    {
      id: "LINE-D",
      name: "Line D: Automated Laser QA & Packaging",
      category: "Inspection & Telemetry Tagging",
      unitsPerHour: 998,
      targetRate: 980,
      efficiencyPct: 99.4,
      cycleTime: "3.2s",
      status: "Running",
      statusType: "success"
    }
  ]
};

/**
 * Sidebar Navigation Items with Routes
 */
export const NAVIGATION_ITEMS = [
  { id: "dashboard", path: "/", label: "Overview Dashboard", icon: "LayoutDashboard" },
  { id: "water-network", path: "/water-network", label: "Water Network", icon: "Droplets", dynamicBadge: true },
  { id: "smart-city", path: "/smart-city", label: "Smart City", icon: "Building2" },
  { id: "manufacturing", path: "/manufacturing", label: "Manufacturing", icon: "Factory" },
  { id: "power-grid", path: "/power-grid", label: "Energy & Grid", icon: "Zap" },
  { id: "iot-mesh", path: "/iot-mesh", label: "IoT Sensors", icon: "Radio" },
  { id: "analytics", path: "/analytics", label: "Analytics", icon: "BarChart3" },
  { id: "settings", path: "/settings", label: "Settings", icon: "Settings" }
];
