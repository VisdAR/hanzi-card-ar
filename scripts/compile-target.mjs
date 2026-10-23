import { writeFile } from 'node:fs/promises';
import { loadImage } from 'canvas';
import { OfflineCompiler } from 'mind-ar/src/image-target/offline-compiler.js';

const input = process.argv[2] || 'dist/assets/turpan-card.jpg';
const output = process.argv[3] || 'dist/assets/turpan-card.mind';
const image = await loadImage(input);
const compiler = new OfflineCompiler();
console.log(`Compiling ${input} (${image.width}×${image.height})`);
await compiler.compileImageTargets([image], (progress) => {
  process.stdout.write(`\rImage target: ${Math.round(progress)}%`);
});
await writeFile(output, compiler.exportData());
console.log(`\nWrote ${output}`);
