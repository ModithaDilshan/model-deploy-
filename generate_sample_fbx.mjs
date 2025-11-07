import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FBXExporter } from 'three-stdlib';
import { Scene, Mesh, MeshStandardMaterial, BoxGeometry, AmbientLight, DirectionalLight } from 'three';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const scene = new Scene();

const ambient = new AmbientLight(0xffffff, 0.6);
scene.add(ambient);

const directional = new DirectionalLight(0xffffff, 0.8);
scene.add(directional);

directional.position.set(2, 4, 1);

const geometry = new BoxGeometry(1, 2, 1);
const material = new MeshStandardMaterial({ color: 0x3a8ee6, roughness: 0.4, metalness: 0.1 });
const mesh = new Mesh(geometry, material);
mesh.rotation.set(0.3, 0.5, 0.1);
scene.add(mesh);

const exporter = new FBXExporter();
const fbxText = exporter.parse(scene, { binary: false });

const outputRelative = 'samples/SampleCharacter.fbx';
const outputPath = join(__dirname, outputRelative);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, typeof fbxText === 'string' ? fbxText : Buffer.from(fbxText));

console.log(`Sample FBX written to ${outputRelative}`);
