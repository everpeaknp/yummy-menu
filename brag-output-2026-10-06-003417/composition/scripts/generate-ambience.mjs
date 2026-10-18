import fs from "node:fs";
import path from "node:path";

const sampleRate = 44100;
const seconds = 4;
const sampleCount = sampleRate * seconds;
const data = Buffer.alloc(sampleCount * 2);
let seed = 6929;
let smooth = 0;

for (let index = 0; index < sampleCount; index += 1) {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  const noise = (seed / 0xffffffff) * 2 - 1;
  smooth = smooth * 0.994 + noise * 0.006;
  const roomTone = smooth * 0.22;
  const distantClink = Math.exp(-Math.pow((index / sampleRate - 1.55) / 0.045, 2)) * Math.sin(index * 0.17) * 0.035;
  const sample = Math.max(-1, Math.min(1, roomTone + distantClink));
  data.writeInt16LE(Math.round(sample * 32767), index * 2);
}

const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);

const destination = path.resolve("assets", "ambience.wav");
fs.writeFileSync(destination, Buffer.concat([header, data]));
console.log(destination);

