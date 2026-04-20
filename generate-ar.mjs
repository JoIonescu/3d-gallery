// Run with: node generate-ar.mjs
// Generates a .glb file for each painting in public/paintings/
// Output: public/ar/XX.glb

import { Document, NodeIO } from '@gltf-transform/core';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const PAINTINGS_DIR = './public/paintings';
const AR_DIR        = './public/ar';

if (!fs.existsSync(AR_DIR)) fs.mkdirSync(AR_DIR, { recursive: true });

const files = fs.readdirSync(PAINTINGS_DIR)
  .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
  .sort();

for (const file of files) {
  const id      = path.basename(file, path.extname(file));
  const imgPath = path.join(PAINTINGS_DIR, file);
  const outPath = path.join(AR_DIR, `${id}.glb`);

  console.log(`Generating ${id}.glb ...`);

  const meta  = await sharp(imgPath).metadata();
  const iw    = meta.width;
  const ih    = meta.height;

  // Physical dimensions — 1.5m tall, width proportional
  const physH = 1.5;
  const physW = physH * (iw / ih);
  const thick = 0.03; // slight depth for realism

  const imgBuf = fs.readFileSync(imgPath);
  const mime   = file.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

  const doc     = new Document();
  const buffer  = doc.createBuffer();
  const scene   = doc.createScene();
  const node    = doc.createNode('painting');
  const mesh    = doc.createMesh('painting');

  // ── Canvas face (front) ────────────────────────────────────────────────
  const texture = doc.createTexture('canvas')
    .setImage(imgBuf).setMimeType(mime);

  const matCanvas = doc.createMaterial('canvas')
    .setDoubleSided(false)
    .setBaseColorTexture(texture)
    .setRoughnessFactor(0.85)
    .setMetallicFactor(0.0);

  const hw = physW / 2, hh = physH / 2;

  const facePos = new Float32Array([ -hw,-hh, thick/2,  hw,-hh, thick/2,  hw, hh, thick/2, -hw, hh, thick/2 ]);
  const faceUV  = new Float32Array([  0,1,  1,1,  1,0,  0,0 ]);
  const faceNrm = new Float32Array([  0,0,1, 0,0,1, 0,0,1, 0,0,1 ]);
  const faceIdx = new Uint16Array([ 0,1,2, 0,2,3 ]);

  const primFace = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(facePos).setBuffer(buffer))
    .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(faceUV).setBuffer(buffer))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(faceNrm).setBuffer(buffer))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(faceIdx).setBuffer(buffer))
    .setMaterial(matCanvas);

  // ── Frame (black box slightly larger) ─────────────────────────────────
  const matFrame = doc.createMaterial('frame')
    .setBaseColorFactor([0.05, 0.05, 0.05, 1])
    .setRoughnessFactor(0.4)
    .setMetallicFactor(0.3);

  const fb = 0.06; // frame border
  const fd = thick + 0.015;
  const fhw = hw + fb, fhh = hh + fb;

  // Frame as 4 border quads
  const framePanels = [
    // bottom
    { pos: [-fhw,-fhh,-fd/2,  fhw,-fhh,-fd/2,  fhw,-hh,-fd/2,  -fhw,-hh,-fd/2 ], nrm:[0,0,1] },
    // top
    { pos: [-fhw, hh,-fd/2,  fhw, hh,-fd/2,  fhw, fhh,-fd/2,  -fhw, fhh,-fd/2 ], nrm:[0,0,1] },
    // left
    { pos: [-fhw,-fhh,-fd/2, -hw,-fhh,-fd/2,  -hw, fhh,-fd/2,  -fhw, fhh,-fd/2 ], nrm:[0,0,1] },
    // right
    { pos: [  hw,-fhh,-fd/2, fhw,-fhh,-fd/2,  fhw, fhh,-fd/2,    hw, fhh,-fd/2 ], nrm:[0,0,1] },
  ];

  for (const panel of framePanels) {
    const pp  = new Float32Array(panel.pos);
    const pn  = new Float32Array([...panel.nrm,...panel.nrm,...panel.nrm,...panel.nrm]);
    const puv = new Float32Array([0,0,1,0,1,1,0,1]);
    const pi  = new Uint16Array([0,1,2,0,2,3]);

    mesh.addPrimitive(doc.createPrimitive()
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pp).setBuffer(buffer))
      .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(puv).setBuffer(buffer))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(pn).setBuffer(buffer))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(pi).setBuffer(buffer))
      .setMaterial(matFrame));
  }

  mesh.addPrimitive(primFace);
  node.setMesh(mesh);
  scene.addChild(node);

  const io  = new NodeIO();
  const glb = await io.writeBinary(doc);
  fs.writeFileSync(outPath, glb);
  console.log(`  ✓ ${outPath}  (${(glb.byteLength/1024).toFixed(0)} KB)  ${physW.toFixed(2)}m × ${physH}m`);
}

console.log('\nDone. Run: npm run build');
