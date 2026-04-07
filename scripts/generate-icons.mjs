import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pngToIco from "png-to-ico";

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), "..");
const sourcePng = path.join(projectRoot, "attached_assets", "psforge-desktop-icon.png");
const sourceSplash = path.join(projectRoot, "attached_assets", "psforge-loading-screen.jpg");
const buildDir = path.join(projectRoot, "build");
const sourceCopy = path.join(buildDir, "icon-source.png");
const outputPng = path.join(buildDir, "icon.png");
const outputIco = path.join(buildDir, "icon.ico");
const outputSplash = path.join(buildDir, "loading-screen.jpg");

await fs.mkdir(buildDir, { recursive: true });
await fs.copyFile(sourcePng, sourceCopy);
await fs.copyFile(sourcePng, outputPng);
await fs.copyFile(sourceSplash, outputSplash);

const icoBuffer = await pngToIco(sourcePng);
await fs.writeFile(outputIco, icoBuffer);

console.log(`Generated ${path.relative(projectRoot, outputIco)} from ${path.relative(projectRoot, sourcePng)}`);
