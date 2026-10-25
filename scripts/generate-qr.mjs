import fs from 'node:fs/promises';
import QRCode from 'qrcode';

const playUrl = 'https://visdar.github.io/hanzi-card-ar/?play=1&v=6';
const svg = await QRCode.toString(playUrl, {
  type: 'svg',
  errorCorrectionLevel: 'H',
  margin: 2,
  color: { dark: '#101827', light: '#F6F0E3' },
});

await fs.writeFile(new URL('../dist/assets/scan-to-play.svg', import.meta.url), svg);
