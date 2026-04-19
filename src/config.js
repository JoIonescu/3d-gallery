// ─────────────────────────────────────────────
//  GALLERY CONFIG
//  Edit paintings array to update the exhibition
// ─────────────────────────────────────────────

export const WALL_H  = 4.2;   // room height
export const DOOR_W  = 3.4;   // doorway width
export const DOOR_H  = 3.0;   // doorway height
export const HANG_H  = 2.25;  // painting center Y
export const PLAYER_SPEED = 5.0;
export const PLAYER_START = { x: 0, y: 1.7, z: 17 }; // inside entrance corridor
export const PROXIMITY_DIST = 3.8;

// Museum rooms
// solidWalls: walls with no opening
// doorWalls:  walls with a centred doorway opening
export const ROOMS = [
  {
    id: 0, name: 'Central Hall',
    cx: 0, cz: 0, w: 20, d: 20,
    solidWalls: [],
    doorWalls:  ['north', 'east', 'west'],  // south omitted — corridor wall at same Z
  },
  {
    id: 1, name: 'North Gallery',
    cx: 0, cz: -18, w: 16, d: 16,
    solidWalls: ['north', 'east', 'west'],
    doorWalls:  [],
  },
  {
    id: 2, name: 'East Gallery',
    cx: 18, cz: 0, w: 16, d: 14,
    solidWalls: ['east', 'north', 'south'],
    doorWalls:  [],
  },
  {
    id: 3, name: 'West Gallery',
    cx: -18, cz: 0, w: 16, d: 14,
    solidWalls: ['west', 'north', 'south'],
    doorWalls:  [],
  },
];

// Entrance corridor — built separately in corridor.js
export const CORRIDOR = {
  cx: 0, cz: 14, w: 3.6, d: 8,
};

// Collision zones for player movement (axis-aligned rectangles in XZ)
export const MOVE_ZONES = [
  { xMin: -9.6,  xMax:  9.6,  zMin: -9.6,  zMax: 9.6   }, // Central Hall
  { xMin: -7.6,  xMax:  7.6,  zMin: -25.6, zMax: -10.3  }, // North Gallery
  { xMin: 10.3,  xMax:  25.6, zMin: -6.6,  zMax:  6.6   }, // East Gallery
  { xMin: -25.6, xMax: -10.3, zMin: -6.6,  zMax:  6.6   }, // West Gallery
  // Doorway corridors
  { xMin: -1.6,  xMax:  1.6,  zMin: -10.5, zMax: -9.5   }, // C ↔ North
  { xMin:  9.5,  xMax:  10.5, zMin: -1.6,  zMax:  1.6   }, // C ↔ East
  { xMin: -10.5, xMax: -9.5,  zMin: -1.6,  zMax:  1.6   }, // C ↔ West
  { xMin: -1.6,  xMax:  1.6,  zMin:  9.5,  zMax: 10.5   }, // C ↔ Corridor
  { xMin: -1.6,  xMax:  1.6,  zMin: 10.4,  zMax: 18.2   }, // Entrance corridor
];

// Room bounding boxes for label detection
export const ROOM_ZONES = [
  { id: 0, name: 'Central Hall',   xMin:-10, xMax:10,  zMin:-10, zMax:10  },
  { id: 1, name: 'North Gallery',  xMin:-8,  xMax:8,   zMin:-26, zMax:-10 },
  { id: 2, name: 'East Gallery',   xMin:10,  xMax:26,  zMin:-7,  zMax:7   },
  { id: 3, name: 'West Gallery',   xMin:-26, xMax:-10, zMin:-7,  zMax:7   },
  { id: 4, name: '',               xMin:-2,  xMax:2,   zMin:10,  zMax:19  },
];

// ─────────────────────────────────────────────
//  PAINTINGS
//  image: path inside /public/paintings/
//  color: fallback colour shown until image loads
//  room:  0=Central Hall 1=North 2=East 3=West
//  wall:  'north' | 'south' | 'east' | 'west'
//  offset: position along wall from its centre (metres)
//  size:   { w, h } in world units
//  enquire: optional email or URL for 'Enquire' button. Leave as '' to hide.
//
//  ── HOW TO MATCH FRAME TO PAINTING ──────────
//  The frame size MUST match the painting's real aspect ratio.
//  Formula: divide real dimensions by a scale factor (~22).
//
//  Examples:
//    100 × 80 cm  →  { w: 2.0, h: 1.6 }   (÷ 50)
//     80 × 80 cm  →  { w: 1.8, h: 1.8 }   (square)
//     60 × 90 cm  →  { w: 1.4, h: 2.1 }   (portrait ÷ ~43)
//    140 × 100 cm →  { w: 2.6, h: 1.86 }  (÷ ~54)
//
//  Quick formula: w = real_width_cm / 50
//                 h = real_height_cm / 50
//  Adjust the divisor up/down to make the painting larger or smaller.
//
//  The image file can be any resolution — it will always fill the frame.
//  For best quality use at least 1800px on the longest side.
// ─────────────────────────────────────────────
export const PAINTINGS = [
  {
    id: 0,
    title: 'Morning Study',
    year: '2023',
    medium: 'Oil on canvas',
    dimensions: '100 × 80 cm',
    description: 'A meditative exploration of early light — the quiet moment before the day begins. Replace this text with your own statement.',
    image: '/paintings/01.jpg',
    color: '#c8a882',
    room: 3, wall: 'south', offset: 2.5, size: { w: 2.2, h: 1.7 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
  {
    id: 1,
    title: 'Dusk, Interval',
    year: '2022',
    medium: 'Acrylic on canvas',
    dimensions: '80 × 80 cm',
    description: 'The threshold between light and dark, held still. Replace this text with your own statement.',
    image: '/paintings/02.jpg',
    color: '#7a9fb5',
    room: 2, wall: 'north', offset: -2.5, size: { w: 1.9, h: 1.9 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
  {
    id: 2,
    title: 'Untitled III',
    year: '2023',
    medium: 'Mixed media on linen',
    dimensions: '90 × 120 cm',
    description: 'Form dissolves at its own edges. Replace this text with your own statement.',
    image: '/paintings/03.jpg',
    color: '#6b7c5a',
    room: 0, wall: 'west', offset: -5, size: { w: 2.1, h: 1.6 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
  {
    id: 3,
    title: 'Northern Field I',
    year: '2021',
    medium: 'Oil on canvas',
    dimensions: '120 × 90 cm',
    description: 'Vast and close at once. The horizon as a kind of permission. Replace this text with your own statement.',
    image: '/paintings/04.jpg',
    color: '#b5896e',
    room: 1, wall: 'north', offset: -3.5, size: { w: 2.4, h: 1.8 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
  {
    id: 4,
    title: 'Northern Field II',
    year: '2021',
    medium: 'Oil on canvas',
    dimensions: '60 × 90 cm',
    description: 'Companion piece to Northern Field I. Painted in the same week, same light. Replace this text with your own statement.',
    image: '/paintings/05.jpg',
    color: '#8faa8c',
    room: 1, wall: 'north', offset: 3.5, size: { w: 1.5, h: 2.1 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
  {
    id: 5,
    title: 'Interior, Still',
    year: '2022',
    medium: 'Charcoal and oil',
    dimensions: '70 × 50 cm',
    description: 'Silence has a texture. This work tries to find it. Replace this text with your own statement.',
    image: '/paintings/06.jpg',
    color: '#555',
    room: 1, wall: 'east', offset: -2, size: { w: 1.5, h: 2.0 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
  {
    id: 6,
    title: 'Golden Hour Study',
    year: '2022',
    medium: 'Oil on board',
    dimensions: '140 × 100 cm',
    description: 'A document of the eighteen minutes when everything turns amber. Replace this text with your own statement.',
    image: '/paintings/07.jpg',
    color: '#d4a853',
    room: 2, wall: 'east', offset: -2, size: { w: 2.6, h: 1.9 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
  {
    id: 7,
    title: 'Figure, Dissolving',
    year: '2023',
    medium: 'Acrylic',
    dimensions: '80 × 110 cm',
    description: 'The body as a question the paint asks. Replace this text with your own statement.',
    image: '/paintings/08.jpg',
    color: '#c97a7a',
    room: 2, wall: 'south', offset: 2, size: { w: 1.8, h: 2.3 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
  {
    id: 8,
    title: 'Composition in Blue',
    year: '2020',
    medium: 'Digital print on aluminium',
    dimensions: '90 × 60 cm',
    description: 'Blue as a structural material, not a colour. Replace this text with your own statement.',
    image: '/paintings/09.jpg',
    color: '#7a7ac9',
    room: 3, wall: 'west', offset: -2, size: { w: 2.1, h: 1.4 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
  {
    id: 9,
    title: 'Archive II',
    year: '2019',
    medium: 'Ink on Fabriano',
    dimensions: '70 × 100 cm',
    description: 'Memory as inventory. A list that never becomes complete. Replace this text with your own statement.',
    image: '/paintings/10.jpg',
    color: '#2a2a2a',
    room: 3, wall: 'north', offset: 0, size: { w: 1.7, h: 2.3 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
];