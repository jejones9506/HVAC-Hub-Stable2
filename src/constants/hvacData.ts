// HVAC Hub - Mock Data and Constants (Step 3 - Expanded Equipment DB)
// Organized by brand, model, electrical data, capacities, refrigerants, and other defining characteristics.
// This will evolve into Supabase tables with real submittals, photos, parts lists, etc.

export interface Equipment {
  id: string;
  brand: string;
  model: string;
  type: 'Air Conditioner' | 'Heat Pump' | 'Furnace' | 'RTU' | 'Chiller' | 'Boiler' | 'Mini-Split';
  electrical: {
    voltage: string;
    amps: string;
    phase: string;
    mca?: string;
    mop?: string;
    fla?: string; // Full Load Amps
  };
  capacities: {
    cooling?: string;
    heating?: string;
    tonnage: string;
    seer?: string;
    afue?: string;
  };
  refrigerant: string;
  specs: string;
  averagePrice: string;
  lastUpdated: string; // e.g. "2026-06-07" for "real-time" feel
  buyLinks: Array<{ vendor: string; url: string; price: string }>;
  submittals?: string[]; // Links or descriptions
  partsList?: Array<{ part: string; description: string; price: string }>;
  photos?: string[]; // Placeholder URLs or asset refs
  notes?: string;
  materialsCompat?: string[]; // e.g. wire, pipe sizes
}

export interface Material {
  id: string;
  type: 'Wire' | 'Pipe' | 'Tube' | 'Fitting' | 'Other';
  name: string;
  specs: string;
  averagePrice: string;
  buyLinks: Array<{ vendor: string; url: string; price: string }>;
  sds?: string;
}

export interface CalculatorDef {
  id: string;
  name: string;
  description: string;
  category: string;
  inputs: Array<{ key: string; label: string; type: string; unit?: string; default?: string }>;
}

export interface Refrigerant {
  name: string;
  composition: string;
  ptNotes: string;
  gwp: string;
  typicalUse: string;
  ptChart: Array<{ tempF: number; pressurePsig: number }>; // Sample PT points for interactive chart
}

export interface SDSItem {
  id: string;
  chemical: string;
  hazards: string;
  handling: string;
  ppe: string;
  source: string;
}

export interface EPASection {
  id: string;
  title: string;
  content: string;
  keyPoints: string[];
}

export interface CommunityPost {
  id: string;
  user: string;
  model: string;
  type: 'note' | 'photo' | 'video' | 'tip';
  content: string;
  isPublic: boolean;
  timestamp: string;
}

// Expanded Mock Equipment Database (20+ realistic entries, categorized)
export const mockEquipment: Equipment[] = [
  {
    id: 'eq1',
    brand: 'Carrier',
    model: '24ANB1-036',
    type: 'Air Conditioner',
    electrical: { voltage: '208/230V', amps: '15.2', phase: '1', mca: '18.9', mop: '30' },
    capacities: { cooling: '36,000 BTU', tonnage: '3 Ton', seer: '16' },
    refrigerant: 'R-410A',
    specs: 'High efficiency 16 SEER, two-stage compressor. Compatible with Infinity controls. Scroll compressor.',
    averagePrice: '$2,450',
    lastUpdated: '2026-06-07',
    buyLinks: [
      { vendor: 'SupplyHouse', url: 'https://www.supplyhouse.com', price: '$2,399' },
      { vendor: 'Amazon', url: 'https://www.amazon.com', price: '$2,599' },
    ],
    submittals: ['Carrier 24ANB1 Submittal PDF', 'Wiring Diagram 24ANB1'],
    partsList: [
      { part: 'Run Capacitor', description: '45/5 MFD 440V', price: '$28' },
      { part: 'Contactor', description: '30A 2-pole', price: '$42' },
    ],
    photos: ['https://example.com/carrier-24anb1.jpg'],
    notes: 'Common in residential installs. Check submittal for exact wiring.',
    materialsCompat: ['3/4" copper line set', '10 AWG wire', '3/4" PVC drain'],
  },
  {
    id: 'eq2',
    brand: 'Trane',
    model: 'XR14-048',
    type: 'Heat Pump',
    electrical: { voltage: '208/230V', amps: '21.4', phase: '1', mca: '26.8', mop: '45' },
    capacities: { cooling: '48,000 BTU', heating: '46,000 BTU', tonnage: '4 Ton', seer: '14' },
    refrigerant: 'R-410A',
    specs: '14 SEER, variable speed blower ready. Excellent cold climate performance. Scroll compressor.',
    averagePrice: '$3,150',
    lastUpdated: '2026-06-07',
    buyLinks: [
      { vendor: 'Trane Supply', url: 'https://www.trane.com', price: '$3,099' },
      { vendor: 'Home Depot', url: 'https://www.homedepot.com', price: '$3,299' },
    ],
    submittals: ['Trane XR14 Submittal'],
    partsList: [{ part: 'Reversing Valve', description: '24V solenoid', price: '$185' }],
    notes: 'Great for northern climates.',
    materialsCompat: ['7/8" suction line', '12 AWG'],
  },
  {
    id: 'eq3',
    brand: 'Goodman',
    model: 'GSXN4-060',
    type: 'Air Conditioner',
    electrical: { voltage: '208/230V', amps: '24.1', phase: '1' },
    capacities: { cooling: '60,000 BTU', tonnage: '5 Ton', seer: '14' },
    refrigerant: 'R-410A',
    specs: '14 SEER, single stage. Budget friendly with strong warranty. Copeland scroll.',
    averagePrice: '$1,890',
    lastUpdated: '2026-06-07',
    buyLinks: [{ vendor: 'Goodman', url: 'https://www.goodmanmfg.com', price: '$1,799' }],
    partsList: [{ part: 'Fan Motor', description: '1/3 HP 230V', price: '$95' }],
  },
  {
    id: 'eq4',
    brand: 'Lennox',
    model: 'EL296V-060',
    type: 'Furnace',
    electrical: { voltage: '120V', amps: '12.5', phase: '1' },
    capacities: { heating: '60,000 BTU', tonnage: '5 Ton equiv', afue: '96' },
    refrigerant: 'N/A (Gas)',
    specs: '96% AFUE, variable speed, two-stage heating. ENERGY STAR. Stainless steel heat exchanger.',
    averagePrice: '$2,780',
    lastUpdated: '2026-06-07',
    buyLinks: [
      { vendor: 'Lennox', url: 'https://www.lennox.com', price: '$2,650' },
      { vendor: 'SupplyHouse', url: 'https://www.supplyhouse.com', price: '$2,899' },
    ],
    partsList: [{ part: 'Inducer Motor', description: 'Variable speed', price: '$210' }],
  },
  {
    id: 'eq5',
    brand: 'Daikin',
    model: 'DX18TC-048',
    type: 'Heat Pump',
    electrical: { voltage: '208/230V', amps: '19.8', phase: '1', mca: '24.5', mop: '40' },
    capacities: { cooling: '48,000 BTU', heating: '45,000 BTU', tonnage: '4 Ton', seer: '18' },
    refrigerant: 'R-410A',
    specs: '18 SEER2, inverter technology. Quiet operation. Swing compressor.',
    averagePrice: '$3,450',
    lastUpdated: '2026-06-07',
    buyLinks: [{ vendor: 'Daikin', url: 'https://www.daikin.com', price: '$3,399' }],
  },
  {
    id: 'eq6',
    brand: 'Rheem',
    model: 'R951V-060',
    type: 'Furnace',
    electrical: { voltage: '120V', amps: '11.8', phase: '1' },
    capacities: { heating: '60,000 BTU', tonnage: '5 Ton equiv', afue: '95' },
    refrigerant: 'N/A (Gas)',
    specs: '95% AFUE, variable speed ECM blower. PlusOne diagnostics.',
    averagePrice: '$2,150',
    lastUpdated: '2026-06-07',
    buyLinks: [{ vendor: 'Rheem', url: 'https://www.rheem.com', price: '$2,050' }],
  },
  {
    id: 'eq7',
    brand: 'York',
    model: 'YHM-036',
    type: 'Air Conditioner',
    electrical: { voltage: '208/230V', amps: '14.8', phase: '1', mca: '18.2', mop: '30' },
    capacities: { cooling: '36,000 BTU', tonnage: '3 Ton', seer: '15' },
    refrigerant: 'R-410A',
    specs: '15 SEER, single stage. MicroChannel coil technology.',
    averagePrice: '$1,980',
    lastUpdated: '2026-06-07',
    buyLinks: [{ vendor: 'York', url: 'https://www.york.com', price: '$1,899' }],
  },
  {
    id: 'eq8',
    brand: 'Carrier',
    model: '25HBC5-048',
    type: 'Heat Pump',
    electrical: { voltage: '208/230V', amps: '20.1', phase: '1', mca: '25.1', mop: '40' },
    capacities: { cooling: '48,000 BTU', heating: '47,000 BTU', tonnage: '4 Ton', seer: '15' },
    refrigerant: 'R-410A',
    specs: '15 SEER, two-stage. Infinity compatible.',
    averagePrice: '$3,050',
    lastUpdated: '2026-06-07',
    buyLinks: [{ vendor: 'SupplyHouse', url: 'https://www.supplyhouse.com', price: '$2,949' }],
  },
  {
    id: 'eq9',
    brand: 'Trane',
    model: 'S8V2-080',
    type: 'Furnace',
    electrical: { voltage: '120V', amps: '13.2', phase: '1' },
    capacities: { heating: '80,000 BTU', tonnage: '5 Ton equiv', afue: '80' },
    refrigerant: 'N/A (Gas)',
    specs: '80% AFUE, variable speed. Durable steel cabinet.',
    averagePrice: '$1,650',
    lastUpdated: '2026-06-07',
    buyLinks: [{ vendor: 'Trane Supply', url: 'https://www.trane.com', price: '$1,599' }],
  },
  {
    id: 'eq10',
    brand: 'Daikin',
    model: 'MMS-036',
    type: 'Mini-Split',
    electrical: { voltage: '208/230V', amps: '9.5', phase: '1', mca: '12.5', mop: '20' },
    capacities: { cooling: '36,000 BTU', tonnage: '3 Ton', seer: '20' },
    refrigerant: 'R-410A',
    specs: '20 SEER, ductless, inverter driven. Multi-zone capable.',
    averagePrice: '$2,890',
    lastUpdated: '2026-06-07',
    buyLinks: [{ vendor: 'Daikin', url: 'https://www.daikin.com', price: '$2,799' }],
    materialsCompat: ['1/4" & 3/8" line set', '14 AWG'],
  },
  {
    id: 'eq11',
    brand: 'Lennox',
    model: 'SL280V-060',
    type: 'Furnace',
    electrical: { voltage: '120V', amps: '14.0', phase: '1' },
    capacities: { heating: '60,000 BTU', tonnage: '5 Ton equiv', afue: '80' },
    refrigerant: 'N/A (Gas)',
    specs: '80% AFUE, variable speed. SilentComfort technology.',
    averagePrice: '$1,920',
    lastUpdated: '2026-06-07',
    buyLinks: [{ vendor: 'Lennox', url: 'https://www.lennox.com', price: '$1,849' }],
  },
  {
    id: 'eq12',
    brand: 'Goodman',
    model: 'GSZ14-048',
    type: 'Heat Pump',
    electrical: { voltage: '208/230V', amps: '18.5', phase: '1', mca: '23.0', mop: '35' },
    capacities: { cooling: '48,000 BTU', heating: '44,000 BTU', tonnage: '4 Ton', seer: '14' },
    refrigerant: 'R-410A',
    specs: '14 SEER, single stage. Energy-efficient scroll compressor.',
    averagePrice: '$2,450',
    lastUpdated: '2026-06-07',
    buyLinks: [{ vendor: 'Goodman', url: 'https://www.goodmanmfg.com', price: '$2,349' }],
  },
  // Add more variety: RTU, etc.
  {
    id: 'eq13',
    brand: 'Carrier',
    model: '48TC-060',
    type: 'RTU',
    electrical: { voltage: '208/230V', amps: '28.5', phase: '3', mca: '35.0', mop: '50' },
    capacities: { cooling: '60,000 BTU', tonnage: '5 Ton', seer: '13' },
    refrigerant: 'R-410A',
    specs: 'Commercial rooftop unit, 3-phase. Economizer ready.',
    averagePrice: '$4,850',
    lastUpdated: '2026-06-07',
    buyLinks: [{ vendor: 'Carrier', url: 'https://www.carrier.com', price: '$4,699' }],
    materialsCompat: ['1-1/8" suction', '6 AWG'],
  },
  {
    id: 'eq14',
    brand: 'Trane',
    model: 'CGAM-060',
    type: 'Chiller',
    electrical: { voltage: '460V', amps: '42.0', phase: '3' },
    capacities: { cooling: '60 Ton', tonnage: '60 Ton' },
    refrigerant: 'R-134a',
    specs: 'Air-cooled chiller, 60 ton. High efficiency for commercial.',
    averagePrice: '$28,500',
    lastUpdated: '2026-06-07',
    buyLinks: [{ vendor: 'Trane', url: 'https://www.trane.com', price: '$27,900' }],
  },
  // Additional real-ish entries for Step 12 data population
  {
    id: 'eq15',
    brand: 'Carrier',
    model: '59MN7-080',
    type: 'Furnace',
    electrical: { voltage: '120V', amps: '13.8', phase: '1' },
    capacities: { heating: '80,000 BTU', tonnage: '5 Ton equiv', afue: '97' },
    refrigerant: 'N/A (Gas)',
    specs: '97% AFUE, modulating, variable speed. Top efficiency model.',
    averagePrice: '$3,250',
    lastUpdated: '2026-06-07',
    buyLinks: [{ vendor: 'SupplyHouse', url: 'https://www.supplyhouse.com', price: '$3,099' }],
  },
  {
    id: 'eq16',
    brand: 'Trane',
    model: 'XR16-036',
    type: 'Air Conditioner',
    electrical: { voltage: '208/230V', amps: '16.5', phase: '1', mca: '20.5', mop: '35' },
    capacities: { cooling: '36,000 BTU', tonnage: '3 Ton', seer: '16' },
    refrigerant: 'R-410A',
    specs: '16 SEER, two-stage cooling. Reliable mid-tier unit.',
    averagePrice: '$2,680',
    lastUpdated: '2026-06-07',
    buyLinks: [{ vendor: 'Trane Supply', url: 'https://www.trane.com', price: '$2,550' }],
  },
  {
    id: 'eq17',
    brand: 'Mitsubishi',
    model: 'MXZ-3C24NA',
    type: 'Mini-Split',
    electrical: { voltage: '208/230V', amps: '12.2', phase: '1', mca: '15.0', mop: '25' },
    capacities: { cooling: '24,000 BTU', tonnage: '2 Ton', seer: '22' },
    refrigerant: 'R-410A',
    specs: 'Hyper-Heating INVERTER, multi-zone capable. Excellent cold weather performance.',
    averagePrice: '$3,850',
    lastUpdated: '2026-06-07',
    buyLinks: [{ vendor: 'Mitsubishi', url: 'https://www.mitsubishicomfort.com', price: '$3,699' }],
  },
  // Step 18: Seeded additional realistic entries (generated from public 2025-2026 manufacturer data, ASHRAE, distributor catalogs via search)
  // Expanded to ~28 entries for better testing, variety (R-32 transition, high SEER2, commercial, low-GWP notes)
  {
    id: 'eq18',
    brand: 'Goodman',
    model: 'GSXV9-060',
    type: 'Air Conditioner',
    electrical: { voltage: '208/230V', amps: '26.5', phase: '1', mca: '32.0', mop: '50' },
    capacities: { cooling: '60,000 BTU', tonnage: '5 Ton', seer: '22.5' },
    refrigerant: 'R-32',
    specs: 'High efficiency 22.5 SEER2, two-stage, future-proof R-32 refrigerant per 2025 EPA phase-down. Excellent value.',
    averagePrice: '$3,450',
    lastUpdated: '2026-06-07',
    buyLinks: [{ vendor: 'The Furnace Outlet', url: 'https://thefurnaceoutlet.com', price: '$3,299' }],
    materialsCompat: ['3/8" & 7/8" line set', '8 AWG'],
  },
  {
    id: 'eq19',
    brand: 'Carrier',
    model: '26VNA1-036',
    type: 'Heat Pump',
    electrical: { voltage: '208/230V', amps: '18.2', phase: '1', mca: '22.5', mop: '35' },
    capacities: { cooling: '36,000 BTU', heating: '34,000 BTU', tonnage: '3 Ton', seer: '21' },
    refrigerant: 'R-454B',
    specs: 'Infinity series, variable speed, top-tier efficiency 21 SEER2. R-454B low-GWP transition complete.',
    averagePrice: '$5,850',
    lastUpdated: '2026-06-07',
    buyLinks: [{ vendor: 'Carrier', url: 'https://www.carrier.com', price: '$5,699' }],
  },
  {
    id: 'eq20',
    brand: 'Trane',
    model: 'XV18-048',
    type: 'Air Conditioner',
    electrical: { voltage: '208/230V', amps: '22.0', phase: '1', mca: '27.0', mop: '45' },
    capacities: { cooling: '48,000 BTU', tonnage: '4 Ton', seer: '18' },
    refrigerant: 'R-410A',
    specs: '18 SEER2 variable speed, WeatherGuard II cabinet. Durable for extreme climates.',
    averagePrice: '$4,250',
    lastUpdated: '2026-06-07',
    buyLinks: [{ vendor: 'Trane Supply', url: 'https://www.trane.com', price: '$4,099' }],
  },
  {
    id: 'eq21',
    brand: 'Lennox',
    model: 'SL25KCV-048',
    type: 'Heat Pump',
    electrical: { voltage: '208/230V', amps: '19.8', phase: '1', mca: '24.0', mop: '40' },
    capacities: { cooling: '48,000 BTU', heating: '46,000 BTU', tonnage: '4 Ton', seer: '26' },
    refrigerant: 'R-454B',
    specs: 'Flagship 26 SEER2 inverter, ultimate efficiency. Some models still transitioning refrigerants.',
    averagePrice: '$6,150',
    lastUpdated: '2026-06-07',
    buyLinks: [{ vendor: 'Lennox', url: 'https://www.lennox.com', price: '$5,999' }],
  },
  {
    id: 'eq22',
    brand: 'Goodman',
    model: 'GLXS4BA6010',
    type: 'Air Conditioner',
    electrical: { voltage: '208/230V', amps: '24.8', phase: '1', mca: '30.0', mop: '45' },
    capacities: { cooling: '60,000 BTU', tonnage: '5 Ton', seer: '14.4' },
    refrigerant: 'R-32',
    specs: 'Value leader 14.4 SEER2, single-stage, R-32 for 2025+ standards. 30-40% cheaper than premium brands.',
    averagePrice: '$2,950',
    lastUpdated: '2026-06-07',
    buyLinks: [{ vendor: 'Goodman', url: 'https://www.goodmanmfg.com', price: '$2,799' }],
  },
  {
    id: 'eq23',
    brand: 'Carrier',
    model: '59SC5-080',
    type: 'Furnace',
    electrical: { voltage: '120V', amps: '12.5', phase: '1' },
    capacities: { heating: '80,000 BTU', tonnage: '5 Ton equiv', afue: '95' },
    refrigerant: 'N/A (Gas)',
    specs: '95% AFUE, single-stage with Comfort Heat technology. Reliable mid-range.',
    averagePrice: '$2,150',
    lastUpdated: '2026-06-07',
    buyLinks: [{ vendor: 'SupplyHouse', url: 'https://www.supplyhouse.com', price: '$2,049' }],
  },
  {
    id: 'eq24',
    brand: 'Trane',
    model: 'XR16-060',
    type: 'Heat Pump',
    electrical: { voltage: '208/230V', amps: '25.5', phase: '1', mca: '31.0', mop: '50' },
    capacities: { cooling: '60,000 BTU', heating: '56,000 BTU', tonnage: '5 Ton', seer: '16' },
    refrigerant: 'R-410A',
    specs: '16 SEER two-stage, great for cold climates. Spine Fin coil option for corrosion resistance.',
    averagePrice: '$3,850',
    lastUpdated: '2026-06-07',
    buyLinks: [{ vendor: 'Trane Supply', url: 'https://www.trane.com', price: '$3,699' }],
  },
  {
    id: 'eq25',
    brand: 'Lennox',
    model: 'EL18XPV-036',
    type: 'Air Conditioner',
    electrical: { voltage: '208/230V', amps: '15.8', phase: '1', mca: '19.5', mop: '30' },
    capacities: { cooling: '36,000 BTU', tonnage: '3 Ton', seer: '19.4' },
    refrigerant: 'R-410A',
    specs: 'Elite series, high efficiency 19.4 SEER2. Good balance of performance and cost.',
    averagePrice: '$3,650',
    lastUpdated: '2026-06-07',
    buyLinks: [{ vendor: 'Lennox', url: 'https://www.lennox.com', price: '$3,499' }],
  },
  {
    id: 'eq26',
    brand: 'Mitsubishi',
    model: 'PUMY-P60NKMU',
    type: 'Mini-Split',
    electrical: { voltage: '208/230V', amps: '28.0', phase: '3', mca: '35.0', mop: '50' },
    capacities: { cooling: '60,000 BTU', tonnage: '5 Ton', seer: '20' },
    refrigerant: 'R-410A',
    specs: 'Commercial multi-zone VRF capable mini-split. Hyper heating for extreme cold.',
    averagePrice: '$7,250',
    lastUpdated: '2026-06-07',
    buyLinks: [{ vendor: 'Mitsubishi', url: 'https://www.mitsubishicomfort.com', price: '$6,999' }],
  },
  {
    id: 'eq27',
    brand: 'Daikin',
    model: 'DZ20VC-048',
    type: 'Heat Pump',
    electrical: { voltage: '208/230V', amps: '20.5', phase: '1', mca: '25.0', mop: '40' },
    capacities: { cooling: '48,000 BTU', heating: '45,000 BTU', tonnage: '4 Ton', seer: '20' },
    refrigerant: 'R-32',
    specs: '20 SEER2 inverter, R-32 low GWP. Strong in inverter technology and reliability.',
    averagePrice: '$4,450',
    lastUpdated: '2026-06-07',
    buyLinks: [{ vendor: 'Daikin', url: 'https://www.daikin.com', price: '$4,299' }],
  },
  {
    id: 'eq28',
    brand: 'Rheem',
    model: 'RP16-048',
    type: 'Air Conditioner',
    electrical: { voltage: '208/230V', amps: '21.0', phase: '1', mca: '26.0', mop: '40' },
    capacities: { cooling: '48,000 BTU', tonnage: '4 Ton', seer: '16' },
    refrigerant: 'R-410A',
    specs: 'Classic series, reliable 16 SEER. Good parts availability and value.',
    averagePrice: '$2,780',
    lastUpdated: '2026-06-07',
    buyLinks: [{ vendor: 'Rheem', url: 'https://www.rheem.com', price: '$2,650' }],
  },
];

// More brands list
export const mockBrands = ['Carrier', 'Trane', 'Goodman', 'Lennox', 'Daikin', 'Rheem', 'York', 'Mitsubishi'];

// Materials examples (new for Step 3)
export const mockMaterials: Material[] = [
  { id: 'm1', type: 'Wire', name: '10 AWG THHN Copper', specs: '600V, stranded, 30A ampacity', averagePrice: '$0.85/ft', buyLinks: [{ vendor: 'Southwire', url: 'https://www.southwire.com', price: '$0.79/ft' }] },
  { id: 'm2', type: 'Pipe', name: '3/4" Type L Copper', specs: 'For refrigerant lines, 0.045" wall', averagePrice: '$3.20/ft', buyLinks: [{ vendor: 'Mueller', url: 'https://www.mueller.com', price: '$3.05/ft' }] },
  { id: 'm3', type: 'Tube', name: '1/4" ACR Copper', specs: 'For liquid lines, dehydrated', averagePrice: '$1.45/ft', buyLinks: [{ vendor: 'NIBCO', url: 'https://www.nibco.com', price: '$1.39/ft' }] },
  { id: 'm4', type: 'Fitting', name: '3/4" Sweat Elbow 90°', specs: 'Copper, for line sets', averagePrice: '$2.80', buyLinks: [{ vendor: 'SupplyHouse', url: 'https://www.supplyhouse.com', price: '$2.49' }] },
];

// Rest of the data (refrigerants, SDS, EPA, community, codes, AI mock, approvals) remain the same as before for continuity.
export const mockRefrigerants: Refrigerant[] = [
  { 
    name: 'R-410A', 
    composition: '50% R-32, 50% R-125 (HFC blend)', 
    ptNotes: 'Higher pressures than R-22. PT at 70°F ~ 201 psig suction typical. Use POE oil.', 
    gwp: '2088', 
    typicalUse: 'Most new residential AC/HP',
    ptChart: [
      { tempF: -10, pressurePsig: 45 }, { tempF: 0, pressurePsig: 58 }, { tempF: 20, pressurePsig: 84 }, 
      { tempF: 40, pressurePsig: 119 }, { tempF: 60, pressurePsig: 164 }, { tempF: 70, pressurePsig: 201 }, 
      { tempF: 80, pressurePsig: 236 }, { tempF: 100, pressurePsig: 317 }, { tempF: 120, pressurePsig: 418 }
    ]
  },
  { 
    name: 'R-22', 
    composition: 'HCFC', 
    ptNotes: 'Being phased out. PT at 40°F evap ~ 68.5 psig. Mineral oil.', 
    gwp: '1810', 
    typicalUse: 'Older systems (service only)',
    ptChart: [
      { tempF: -10, pressurePsig: 24 }, { tempF: 0, pressurePsig: 32 }, { tempF: 20, pressurePsig: 48 }, 
      { tempF: 40, pressurePsig: 69 }, { tempF: 60, pressurePsig: 102 }, { tempF: 70, pressurePsig: 121 }, 
      { tempF: 80, pressurePsig: 143 }, { tempF: 100, pressurePsig: 196 }, { tempF: 120, pressurePsig: 262 }
    ]
  },
  { 
    name: 'R-32', 
    composition: 'Pure HFC (single component)', 
    ptNotes: 'Lower GWP alternative. Higher discharge temps. PT ~ similar to 410A but slightly higher. Mildly flammable (A2L).', 
    gwp: '675', 
    typicalUse: 'New high efficiency units',
    ptChart: [
      { tempF: -10, pressurePsig: 48 }, { tempF: 0, pressurePsig: 62 }, { tempF: 20, pressurePsig: 90 }, 
      { tempF: 40, pressurePsig: 128 }, { tempF: 60, pressurePsig: 176 }, { tempF: 70, pressurePsig: 205 }, 
      { tempF: 80, pressurePsig: 240 }, { tempF: 100, pressurePsig: 324 }, { tempF: 120, pressurePsig: 428 }
    ]
  },
  { 
    name: 'R-454B', 
    composition: '68.9% R-32, 31.1% R-1234yf (A2L mildly flammable)', 
    ptNotes: 'R-410A replacement. Slightly lower capacity. PT very close to R-410A. Low GWP.', 
    gwp: '466', 
    typicalUse: 'New equipment 2025+',
    ptChart: [
      { tempF: -10, pressurePsig: 44 }, { tempF: 0, pressurePsig: 57 }, { tempF: 20, pressurePsig: 82 }, 
      { tempF: 40, pressurePsig: 116 }, { tempF: 60, pressurePsig: 160 }, { tempF: 70, pressurePsig: 196 }, 
      { tempF: 80, pressurePsig: 230 }, { tempF: 100, pressurePsig: 309 }, { tempF: 120, pressurePsig: 408 }
    ]
  },
  { 
    name: 'R-407C', 
    composition: '23% R-32, 25% R-125, 52% R-134a (HFC blend)', 
    ptNotes: 'Close to R-22 pressures. PT at 40°F ~ 68 psig. Retrofit for R-22 systems.', 
    gwp: '1774', 
    typicalUse: 'R-22 retrofits',
    ptChart: [
      { tempF: -10, pressurePsig: 23 }, { tempF: 0, pressurePsig: 31 }, { tempF: 20, pressurePsig: 47 }, 
      { tempF: 40, pressurePsig: 68 }, { tempF: 60, pressurePsig: 100 }, { tempF: 70, pressurePsig: 119 }, 
      { tempF: 80, pressurePsig: 141 }, { tempF: 100, pressurePsig: 193 }, { tempF: 120, pressurePsig: 258 }
    ]
  },
  { 
    name: 'R-134a', 
    composition: 'HFC', 
    ptNotes: 'Lower pressure. PT at 40°F ~ 35 psig. Common in automotive and some commercial.', 
    gwp: '1430', 
    typicalUse: 'Automotive, chillers, medium temp',
    ptChart: [
      { tempF: -10, pressurePsig: 11 }, { tempF: 0, pressurePsig: 15 }, { tempF: 20, pressurePsig: 23 }, 
      { tempF: 40, pressurePsig: 35 }, { tempF: 60, pressurePsig: 51 }, { tempF: 70, pressurePsig: 61 }, 
      { tempF: 80, pressurePsig: 73 }, { tempF: 100, pressurePsig: 102 }, { tempF: 120, pressurePsig: 140 }
    ]
  },
  { 
    name: 'R-123', 
    composition: 'HCFC', 
    ptNotes: 'Low pressure refrigerant for centrifugal chillers. PT at 40°F ~ 5 psig (vacuum). Being phased out.', 
    gwp: '77', 
    typicalUse: 'Low pressure chillers (Type III)',
    ptChart: [
      { tempF: 20, pressurePsig: -4 }, { tempF: 40, pressurePsig: 5 }, { tempF: 60, pressurePsig: 15 }, 
      { tempF: 80, pressurePsig: 28 }, { tempF: 100, pressurePsig: 45 }, { tempF: 120, pressurePsig: 66 }
    ]
  },
  { 
    name: 'R-513A', 
    composition: '44% R-134a, 56% R-1234yf (A1 non-flammable)', 
    ptNotes: 'R-134a replacement. Similar PT. Lower GWP. Non-flammable.', 
    gwp: '573', 
    typicalUse: 'Medium temp retrofits',
    ptChart: [
      { tempF: -10, pressurePsig: 10 }, { tempF: 0, pressurePsig: 14 }, { tempF: 20, pressurePsig: 22 }, 
      { tempF: 40, pressurePsig: 34 }, { tempF: 60, pressurePsig: 50 }, { tempF: 70, pressurePsig: 60 }, 
      { tempF: 80, pressurePsig: 71 }, { tempF: 100, pressurePsig: 99 }, { tempF: 120, pressurePsig: 136 }
    ]
  },
];

export const mockSDS: SDSItem[] = [
  { id: 'sds1', chemical: 'R-410A', hazards: 'Asphyxiant in high concentrations. May cause frostbite on contact.', handling: 'Use in well-ventilated areas. Avoid skin contact.', ppe: 'Safety glasses, gloves, long sleeves.', source: 'Honeywell / DuPont SDS' },
  { id: 'sds2', chemical: 'Nitrogen (for pressure test)', hazards: 'Simple asphyxiant. High pressure cylinder hazards.', handling: 'Secure cylinders. Use regulator.', ppe: 'Safety glasses, gloves.', source: 'Praxair SDS' },
  { id: 'sds3', chemical: 'Brazing Flux (Stay-Silv)', hazards: 'Corrosive to eyes/skin. Fumes toxic.', handling: 'Ventilate. Neutralize spills.', ppe: 'Full face shield, chemical gloves, respirator if needed.', source: 'Harris Products SDS' },
];

export const mockEPA: EPASection[] = [
  { 
    id: 'core', 
    title: 'Core (Safety & Regulations)', 
    content: 'The Core section covers the foundational knowledge required for all EPA 608 certification types. It includes EPA regulations under Section 608 of the Clean Air Act, the science of ozone depletion, the Montreal Protocol and its amendments, technician certification requirements, safe handling practices, personal protective equipment (PPE), electrical safety when working with refrigerants, proper recovery and recycling procedures, recordkeeping requirements, and penalties for violations. Technicians must understand the environmental impact of refrigerants, the phase-out schedules for CFCs and HCFCs, and the transition to HFCs and low-GWP alternatives. Key safety topics include lockout/tagout procedures, confined space entry, and first aid for refrigerant exposure.', 
    keyPoints: [
      'Must be certified to purchase or handle refrigerant (Section 608)',
      'Proper recovery required - venting is illegal and harmful to the ozone layer',
      'Know your certification type (I, II, III or Universal) - Universal covers all',
      'Recordkeeping: maintain logs of refrigerant recovered, recycled, and reclaimed',
      'Penalties: fines up to $44,539 per day per violation plus possible criminal charges'
    ] 
  },
  { 
    id: 'type1', 
    title: 'Type I - Small Appliances', 
    content: 'Type I certification applies to technicians who service, maintain, or dispose of small appliances containing 5 pounds or less of refrigerant. This includes household refrigerators, freezers, window air conditioners, packaged terminal air conditioners (PTACs), and dehumidifiers. Topics cover recovery techniques specific to small systems, leak repair requirements (or replacement if repair is not feasible), charging methods, evacuation levels, and the use of passive vs. active recovery equipment. Technicians learn about the unique challenges of small appliances such as limited access ports, hermetic systems, and the importance of not mixing refrigerants.', 
    keyPoints: [
      'Recovery to 4" Hg vacuum or 90% of nameplate charge (whichever is lower)',
      'Can use passive recovery devices in some cases for very small systems',
      'Leak repair not required if system is disposed of properly',
      'Must use certified recovery equipment and follow proper disposal rules',
      'Common refrigerants: R-12, R-134a, R-600a (isobutane) in newer units'
    ] 
  },
  { 
    id: 'type2', 
    title: 'Type II - High-Pressure Appliances', 
    content: 'Type II covers high-pressure appliances with more than 5 pounds of refrigerant, such as residential and light commercial air conditioners, heat pumps, rooftop units, and some chillers. Key areas include evacuation levels (down to 500 microns or per manufacturer specs), leak repair thresholds (10% annual leak rate for commercial equipment), proper charging procedures using superheat and subcooling, recovery equipment standards, and the use of manifold gauges and recovery machines. Technicians must understand the differences between R-22, R-410A, and newer A2L refrigerants, as well as safety considerations for mildly flammable refrigerants.', 
    keyPoints: [
      'Evacuate to 500 microns or manufacturer specification (whichever is lower)',
      'Annual leak rate limits: 10% for commercial, 15% for industrial process refrigeration',
      'Must repair leaks within 30 days if above threshold (or retrofit/retire)',
      'Use of recovery equipment that meets EPA standards (ARI 740)',
      'Charging: follow manufacturer superheat/subcooling specs; never top off with wrong refrigerant'
    ] 
  },
  { 
    id: 'type3', 
    title: 'Type III - Low-Pressure Appliances', 
    content: 'Type III certification is for low-pressure appliances, primarily large centrifugal chillers, ice machines, and some industrial refrigeration using refrigerants like R-11, R-123, and R-113. These systems operate under vacuum on the low side, requiring special handling. Topics include unique evacuation levels (often to 25 mm Hg absolute or lower), the importance of purge units to remove non-condensables, water treatment to prevent tube fouling, safety procedures for working with large refrigerant charges, and the hazards of working in confined spaces or on systems with significant pressure differentials. Technicians learn about the phase-out of these older refrigerants and retrofitting options.', 
    keyPoints: [
      'Evacuate to 25 mm Hg absolute (or 500 microns for some systems) before charging',
      'Purge units are critical to remove air and moisture from low-pressure systems',
      'Special focus on chiller tube cleaning, water treatment, and leak detection',
      'Large refrigerant charges require careful recovery planning and equipment',
      'Common in commercial buildings; Type III techs often work on building automation integration'
    ] 
  },
];

export const mockCommunityPosts: CommunityPost[] = [
  { id: 'p1', user: 'TechMike42', model: '24ANB1-036', type: 'tip', content: 'On this Carrier, the reversing valve solenoid is 24V. Common failure after 5 years - easy swap.', isPublic: true, timestamp: '2026-05-15' },
  { id: 'p2', user: 'ApprenticeSam', model: 'XR14-048', type: 'note', content: 'Had low suction on this Trane heat pump. Found bad TXV. Replaced and charged to 10° subcool.', isPublic: true, timestamp: '2026-06-01' },
  { id: 'p3', user: 'MasterTechJoe', model: 'GSXN4-060', type: 'photo', content: 'Photo of wiring diagram label on unit. Always take pic before disconnecting!', isPublic: false, timestamp: '2026-04-20' },
];

export const mockLocalCodes: Record<string, string[]> = {
  '90210': ['California Title 24 energy code applies', 'Duct insulation R-8 minimum', 'Thermostat setback required'],
  '10001': ['NYC energy code + local amendments', 'Strict electrical permitting required'],
  'general': ['Follow 2023 NEC for electrical', 'NFPA 90A/90B for duct systems', 'ASHRAE 15 for refrigerant safety', 'Manufacturer installation instructions always supersede'],
  // Step 20: International codes (EU examples from F-Gas Reg 2024/573, EPBD, national)
  'EU': ['EU F-Gas Regulation 2024/573: GWP limits for new equipment (e.g. <150 for many AC from 2027-2032)', 'REPowerEU heat pump targets - additional quotas possible for shortages', 'EPBD energy performance requirements for buildings (national variations)', 'A2L (mildly flammable) refrigerants require specific safety measures and labeling'],
  'DE': ['German Gebäudeenergiegesetz (GEG) for energy efficiency', 'F-Gas: Strict leak checks, certified personnel required', 'Low-GWP preference for new installs'],
  'UK': ['UK F-Gas regs post-Brexit aligned with EU', 'Building Regs Part L for energy', 'Competent Person schemes for installers'],
  'FR': ['RT2020 / RE2020 energy regs', 'F-Gas bans on high GWP', 'Mandatory maintenance contracts for AC'],
};

// Stub for calculators (pre-existing reference in UI; actual defs are inline in calculators.tsx)
export const mockCalculators: any[] = [];

export const getMockAIResponse = (query: string): string => {
  const q = query.toLowerCase();
  if (q.includes('carrier') && q.includes('24anb1')) {
    return "Carrier 24ANB1-036 is a 3-ton AC, R-410A, 16 SEER. Electrical: 208/230V 1ph, MCA 18.9A. Common issues: capacitor failure, reversing valve on heat pump variants. Avg price ~$2450. Sources: Carrier submittals (public). Is this info correct?";
  }
  if (q.includes('r-410a') || q.includes('refrigerant')) {
    return "R-410A: HFC blend, PT at 70F ~201 psig. Higher pressure than R-22. GWP 2088. Use POE oil. For PT chart details, see our Refrigerants tab. Would you like me to look up more or submit this?";
  }
  if (q.includes('voltage drop')) {
    return "For voltage drop calc: Use 3% max for branch circuits. Formula: VD = (2 * K * I * L) / CM where K~12.9 for copper. Recommend upsizing wire if >3%. Confirm if you'd like to add a detailed example to database?";
  }
  return "Thanks for the query. As an HVAC expert AI, I recommend checking the Equipment Hub for model-specific info or using the Calculators. I searched and found general best practices: Always recover refrigerant properly per EPA. If this is new info not in DB, shall I verify and submit for admin approval?";
};

export interface ApprovalItem {
  id: string;
  suggestedBy: string;
  suggestedById?: string;
  dataType: 'Equipment' | 'SDS' | 'Refrigerant' | 'Other';
  summary: string;
  details: string;
  suggestedData?: any; // Structured data for insert (e.g. partial Equipment)
  existingId?: string; // If updating existing
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  timestamp: string;
}

export const mockApprovals: ApprovalItem[] = [
  { 
    id: 'ap1', 
    suggestedBy: 'AI Assistant', 
    dataType: 'Equipment', 
    summary: 'New info for Carrier 24ANB1-036 capacitor specs', 
    details: 'Run capacitor 45/5 MFD 440V. Verified by user.', 
    suggestedData: {
      brand: 'Carrier',
      model: '24ANB1-036',
      type: 'Air Conditioner',
      electrical: { voltage: '208/230V', amps: '15.2', phase: '1', mca: '18.9', mop: '30' },
      capacities: { cooling: '36,000 BTU', tonnage: '3 Ton', seer: '16' },
      refrigerant: 'R-410A',
      specs: 'High efficiency 16 SEER, two-stage compressor. Updated: Run capacitor 45/5 MFD 440V recommended replacement. Scroll compressor.',
      averagePrice: '$2,450',
      lastUpdated: '2026-06-07',
      buyLinks: [
        { vendor: 'SupplyHouse', url: 'https://www.supplyhouse.com', price: '$2,399' },
      ],
    },
    status: 'pending',
    timestamp: '2026-06-07T10:00:00Z'
  },
  { 
    id: 'ap2', 
    suggestedBy: 'TechMike42', 
    dataType: 'Equipment', 
    summary: 'Updated specs for Trane XR14-048 from recent submittal', 
    details: 'New SEER2 rating 15, MCA updated to 27.5A. Source: Trane official 2025 revision.', 
    suggestedData: {
      brand: 'Trane',
      model: 'XR14-048',
      type: 'Heat Pump',
      electrical: { voltage: '208/230V', amps: '21.4', phase: '1', mca: '27.5', mop: '45' },
      capacities: { cooling: '48,000 BTU', heating: '46,000 BTU', tonnage: '4 Ton', seer: '15' },
      refrigerant: 'R-410A',
      specs: '14 SEER (15 SEER2), variable speed blower ready. Excellent cold climate performance. Updated from internet search.',
      averagePrice: '$3,250',
      lastUpdated: '2026-06-07',
      buyLinks: [
        { vendor: 'Trane Supply', url: 'https://www.trane.com', price: '$3,199' },
      ],
    },
    existingId: 'eq2',
    status: 'pending',
    timestamp: '2026-06-07T11:30:00Z'
  },
  { 
    id: 'ap3', 
    suggestedBy: 'ApprenticeSam', 
    dataType: 'SDS', 
    summary: 'New SDS details for R-454B low GWP alternative', 
    details: 'Hazards: Mildly flammable A2L. Handling: Special recovery equipment required. PPE: Class B fire extinguisher nearby.', 
    suggestedData: {
      chemical: 'R-454B',
      hazards: 'Mildly flammable (A2L). Asphyxiant in high concentrations. May cause frostbite.',
      handling: 'Use certified recovery equipment rated for A2L. Ventilate area. No smoking or open flames.',
      ppe: 'Safety glasses, gloves, long sleeves, fire extinguisher (Class B) on site.',
      source: 'Honeywell / manufacturer SDS 2026'
    },
    status: 'pending',
    timestamp: '2026-06-07T09:15:00Z'
  },
];
