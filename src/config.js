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
export const ROOMS = [
  {
    id: 0, name: 'Central Hall',
    cx: 0, cz: 0, w: 20, d: 20,
    solidWalls: [],
    doorWalls:  ['north', 'east', 'west'],
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

export const CORRIDOR = {
  cx: 0, cz: 14, w: 3.6, d: 8,
};

export const MOVE_ZONES = [
  { xMin: -9.6,  xMax:  9.6,  zMin: -9.6,  zMax: 9.6   },
  { xMin: -7.6,  xMax:  7.6,  zMin: -25.6, zMax: -10.3  },
  { xMin: 10.3,  xMax:  25.6, zMin: -6.6,  zMax:  6.6   },
  { xMin: -25.6, xMax: -10.3, zMin: -6.6,  zMax:  6.6   },
  { xMin: -1.6,  xMax:  1.6,  zMin: -10.5, zMax: -9.5   },
  { xMin:  9.5,  xMax:  10.5, zMin: -1.6,  zMax:  1.6   },
  { xMin: -10.5, xMax: -9.5,  zMin: -1.6,  zMax:  1.6   },
  { xMin: -1.6,  xMax:  1.6,  zMin:  9.5,  zMax: 10.5   },
  { xMin: -1.6,  xMax:  1.6,  zMin: 10.4,  zMax: 18.2   },
];

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
//  size:   { w, h } — only h matters. w auto-adjusts to image aspect ratio.
//  enquire: email or URL for enquire button. Leave '' to hide.
// ─────────────────────────────────────────────
export const PAINTINGS = [

  // ── Original 10 paintings — unchanged ────────────────────────────────────
  {
    id: 0,
    title: 'Constructed Sur-face',
    year: '2026',
    medium: 'Watercolor-dyed rice paper, collage, adhesive, varnish',
    dimensions: '100 × 80 cm',
    description: 'Delicate layers of paper create organic texture and depth through material transformation.',
    image: '/paintings/01.jpg',
    color: '#c8a882',
    room: 3, wall: 'south', offset: 2.5, size: { w: 2.2, h: 1.7 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
  {
    id: 1,
    title: 'Domestic Alchemy',
    year: '2026',
    medium: 'Gelli plate printing, markers, crayons, fineliner, varnish on paper',
    dimensions: '80 × 80 cm',
    description: 'Everyday forms transform into symbolic rituals of care and identity.',
    image: '/paintings/02.jpeg',
    color: '#7a9fb5',
    room: 2, wall: 'north', offset: -2.5, size: { w: 1.9, h: 1.9 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
  {
    id: 2,
    title: 'Rooted Voice',
    year: '2026',
    medium: 'Mixed media on paper (watercolor pencils, markers, and fineliners)',
    dimensions: '110 × 90 cm',
    description: 'A surreal, organic form blending plant and body, exploring inner voice, growth, and transformation through vivid color and layered detail.',
    image: '/paintings/03.jpg',
    color: '#6b7c5a',
    room: 0, wall: 'west', offset: -5, size: { w: 2.1, h: 1.6 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
  {
    id: 3,
    title: 'Split Perception',
    year: '2026',
    medium: 'Crayons, markers, colored ink, fineliners on paper',
    dimensions: '120 × 90 cm',
    description: 'A fragmented figure reflects layered identity and inner perception.',
    image: '/paintings/04.jpg',
    color: '#b5896e',
    room: 1, wall: 'north', offset: -3.5, size: { w: 2.4, h: 1.8 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
  {
    id: 4,
    title: 'Fading Presence',
    year: '2026',
    medium: 'Markers, acrylic, colored pencils, handmade linocuts on paper',
    dimensions: '60 × 90 cm',
    description: 'A soft, dissolving portrait exploring memory and absence.',
    image: '/paintings/05.jpg',
    color: '#8faa8c',
    room: 1, wall: 'north', offset: 3.5, size: { w: 1.5, h: 2.1 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
  {
    id: 5,
    title: 'Constructed Identity',
    year: '2026',
    medium: 'Collage on paper (magazine clippings, markers, fineliners, varnish)',
    dimensions: '70 × 50 cm',
    description: 'Text, texture, and botanical elements intersect to explore identity as something assembled—shaped by perception, desire, and external influence.',
    image: '/paintings/06.jpg',
    color: '#555',
    room: 1, wall: 'east', offset: -2, size: { w: 1.5, h: 2.0 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
  {
    id: 6,
    title: 'Unblinking',
    year: '2026',
    medium: 'Acrylics and acrylic markers on bamboo paper',
    dimensions: '140 × 100 cm',
    description: 'Surrounded by chaotic, vein-like structures, it suggests heightened awareness and the tension between observation and vulnerability.',
    image: '/paintings/07.jpg',
    color: '#d4a853',
    room: 2, wall: 'east', offset: -2, size: { w: 2.6, h: 1.9 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
  {
    id: 7,
    title: 'Rising Core',
    year: '2026',
    medium: 'Mixed media on paper (acrylics, markers, fineliners, varnish)',
    dimensions: '80 × 110 cm',
    description: 'A central form emerges, suggesting growth, balance, and inner strength.',
    image: '/paintings/08.jpg',
    color: '#c97a7a',
    room: 2, wall: 'south', offset: 2, size: { w: 1.8, h: 2.3 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
  {
    id: 8,
    title: 'Fragments That Speak',
    year: '2026',
    medium: 'Mixed media on paper (markers, crayons, fineliners, varnish)',
    dimensions: '90 × 60 cm',
    description: 'Narrative reveals itself as parts that refuse sense until combined.',
    image: '/paintings/09.jpg',
    color: '#7a7ac9',
    room: 3, wall: 'west', offset: -2, size: { w: 2.1, h: 1.4 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
  {
    id: 9,
    title: 'Step into your power',
    year: '2026',
    medium: 'Monoprint, gelli plate, collage, acryl & markers on paper',
    dimensions: '70 × 100 cm',
    description: 'The work captures a moment of self-assertion—stepping into visibility, presence, and personal power.',
    image: '/paintings/10.jpg',
    color: '#2a2a2a',
    room: 3, wall: 'north', offset: 0, size: { w: 1.7, h: 2.3 },
    enquire: 'mailto:hanna@imagohanna.com',
  },

  // ── 8 new frames — 2 per room ─────────────────────────────────────────────
  // Images: /paintings/11.jpg through /paintings/18.jpg
  // Update title, year, medium, dimensions, description when ready
  {
    id: 10,
    title: 'Quiet Growth',
    year: '2026',
    medium: 'Mixed media (markers, fineliners, colored pencils, structural paste, linocut) on paper',
    dimensions: '',
    description: 'Layered textures evoke organic growth and a calm, introspective rhythm.',
    image: '/paintings/11.jpg',
    color: '#8a7060',
    room: 0, wall: 'east', offset: -5, size: { w: 2.0, h: 1.8 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
  {
    id: 11,
    title: 'Core',
    year: '2026',
    medium: 'Acrylic paint and markers',
    dimensions: '',
    description: 'A bold central form set against intricate textures, suggesting tension between structure and fluidity.',
    image: '/paintings/12.jpg',
    color: '#6a8070',
    room: 0, wall: 'east', offset: 5, size: { w: 2.0, h: 1.8 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
  {
    id: 12,
    title: 'Shared Orbit',
    year: '2026',
    medium: 'Mixed media on paper (markers, crayons, fineliners, varnish)',
    dimensions: '',
    description: 'Two figures connect within a vivid, symbolic landscape of emotion.',
    image: '/paintings/13.jpg',
    color: '#a07850',
    room: 1, wall: 'west', offset: -3, size: { w: 1.8, h: 2.0 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
  {
    id: 13,
    title: 'Make an Effort',
    year: '2026',
    medium: 'Posca and Caran d’Ache on paper',
    dimensions: '',
    description: 'Caught in the flow, the piece questions collective movement and blind alignment. From the Ugly Drawings series, using Posca markers and Caran d’Ache.',
    image: '/paintings/14.jpg',
    color: '#507090',
    room: 1, wall: 'west', offset: 3, size: { w: 1.8, h: 2.0 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
  {
    id: 14,
    title: 'Electric Bloom',
    year: '2026',
    medium: 'Mixed media on paper (markers, crayons, fineliners, varnish)',
    dimensions: '',
    description: 'A vibrant, pulsating composition exploring intuition and inner energy.',
    image: '/paintings/15.jpg',
    color: '#906050',
    room: 2, wall: 'east', offset: 3.5, size: { w: 1.8, h: 1.8 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
  {
    id: 15,
    title: 'Orbiting Bloom',
    year: '2026',
    medium: 'Mixed media on paper (markers, crayons, fineliners, varnish)',
    dimensions: '',
    description: 'Organic forms and celestial elements merge in a vivid, symbolic composition.',
    image: '/paintings/16.jpg',
    color: '#708050',
    room: 2, wall: 'south', offset: -3, size: { w: 1.9, h: 2.0 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
  {
    id: 16,
    title: 'Free Your Mind',
    year: '2026',
    medium: 'Collage, paper, acrylic, gelli plate, Posca, digital elements',
    dimensions: '',
    description: 'A bold visual statement on freedom, expression, and inner release.',
    image: '/paintings/17.jpg',
    color: '#806070',
    room: 3, wall: 'west', offset: 3, size: { w: 1.8, h: 1.8 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
  {
    id: 17,
    title: 'Emerging Forms',
    year: '2026',
    medium: 'Acrylics, linocut, gelli plate',
    dimensions: '',
    description: 'An intuitive exploration of texture and composition through layered forms.',
    image: '/paintings/18.jpg',
    color: '#607080',
    room: 3, wall: 'south', offset: -3, size: { w: 2.0, h: 1.7 },
    enquire: 'mailto:hanna@imagohanna.com',
  },
];