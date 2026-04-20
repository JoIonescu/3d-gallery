// Run with: node generate-ar.mjs
// Generates a .glb file for each painting in public/paintings/
// Output goes to public/ar/
// Requires: npm install --save-dev sharp @gltf-transform/core @gltf-transform/extensions

import { Document, NodeIO } from '@gltf-transform/core';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const PAINTINGS_DIR = './public/paintings';
const AR_DIR        = './public/ar';

if (!fs.existsSync(AR_DIR)) fs.mkdirSync(AR_DIR, { recursive: true });

const files = fs.readdirSync(PAINTINGS_DIR)
  .filter(f => /\.(jpg|jpeg|png)$/i.test(f));

for (const file of files) {
  const id       = path.basename(file, path.extname(file));
  const imgPath  = path.join(PAINTINGS_DIR, file);
  const outPath  = path.join(AR_DIR, `${id}.glb`);

  console.log(`Generating ${id}.glb ...`);

  // Get image dimensions
  const meta = await sharp(imgPath).metadata();
  const W    = meta.width;
  const H    = meta.height;

  // Physical size — keep height at 1.6m, width proportional
  const physH = 1.6;
  const physW = physH * (W / H);

  // Read image as buffer for embedding
  const imgBuf = fs.readFileSync(imgPath);
  const mime   = file.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

  // Build GLB document
  const doc      = new Document();
  const buffer   = doc.createBuffer();
  const scene    = doc.createScene();
  const node     = doc.createNode('painting');
  const mesh     = doc.createMesh('painting');
  const prim     = doc.createPrimitive();
  const mat      = doc.createMaterial('canvas').setDoubleSided(true);

  // Texture
  const texture  = doc.createTexture('painting')
    .setImage(imgBuf)
    .setMimeType(mime);
  mat.setBaseColorTexture(texture);

  // Geometry — simple quad (2 triangles)
  const hw = physW / 2, hh = physH / 2;
  const positions = new Float32Array([
    -hw, -hh, 0,
     hw, -hh, 0,
     hw,  hh, 0,
    -hw,  hh, 0,
  ]);
  const uvs = new Float32Array([
    0, 1,  1, 1,  1, 0,  0, 0,
  ]);
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
  const normals = new Float32Array([
    0,0,1, 0,0,1, 0,0,1, 0,0,1,
  ]);

  const posAcc  = doc.createAccessor().setType('VEC3').setArray(positions).setBuffer(buffer);
  const uvAcc   = doc.createAccessor().setType('VEC2').setArray(uvs).setBuffer(buffer);
  const normAcc = doc.createAccessor().setType('VEC3').setArray(normals).setBuffer(buffer);
  const idxAcc  = doc.createAccessor().setType('SCALAR').setArray(indices).setBuffer(buffer);

  prim.setAttribute('POSITION', posAcc)
      .setAttribute('TEXCOORD_0', uvAcc)
      .setAttribute('NORMAL', normAcc)
      .setIndices(idxAcc)
      .setMaterial(mat);

  mesh.addPrimitive(prim);
  node.setMesh(mesh);
  scene.addChild(node);

  const io  = new NodeIO();
  const glb = await io.writeBinary(doc);
  fs.writeFileSync(outPath, glb);
  console.log(`  ✓ ${outPath} (${(glb.byteLength/1024).toFixed(1)} KB)`);
}

console.log('\nDone. Upload public/ar/ to your deployment.');
