const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const outputDir = path.join(process.cwd(), 'public', 'samples');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 1. Struk Indomaret Point
const indomaretSvg = `
<svg width="450" height="700" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#FAF9F6"/>
  
  <style>
    .header { font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; text-anchor: middle; fill: #111; }
    .sub { font-family: 'Courier New', monospace; font-size: 12px; text-anchor: middle; fill: #444; }
    .mono { font-family: 'Courier New', monospace; font-size: 13px; fill: #111; }
    .bold { font-family: 'Courier New', monospace; font-size: 14px; font-weight: bold; fill: #111; }
    .right { text-anchor: end; }
    .line { stroke: #555; stroke-dasharray: 4, 4; stroke-width: 1.5; }
  </style>

  <!-- Header -->
  <text x="225" y="45" class="header">INDOMARET POINT</text>
  <text x="225" y="65" class="sub">JL. SUDIRMAN KAV. 25 JAKARTA</text>
  <text x="225" y="82" class="sub">NPWP: 01.345.678.9-021.000</text>
  <text x="225" y="99" class="sub">TGL: 20-11-2026  14:32:05  POS 02</text>
  
  <line x1="20" y1="115" x2="430" y2="115" class="line"/>

  <!-- Items -->
  <text x="25" y="145" class="mono">ROTI TAWAR GANDUM 1X</text>
  <text x="425" y="145" class="mono right">19.500</text>

  <text x="25" y="175" class="mono">ULTRA MILK FULL CREAM 1L</text>
  <text x="40" y="195" class="sub" text-anchor="start">2 PCS @ 19.000</text>
  <text x="425" y="195" class="mono right">38.000</text>

  <text x="25" y="225" class="mono">KOPI KENANGAN RTD 220ML</text>
  <text x="40" y="245" class="sub" text-anchor="start">2 PCS @ 15.000</text>
  <text x="425" y="245" class="mono right">30.000</text>

  <line x1="20" y1="270" x2="430" y2="270" class="line"/>

  <!-- Subtotal & Diskon -->
  <text x="25" y="300" class="mono">SUBTOTAL</text>
  <text x="425" y="300" class="mono right">87.500</text>

  <text x="25" y="330" class="mono">DISKON PROMO MEMBER</text>
  <text x="425" y="330" class="mono right">-5.000</text>

  <text x="25" y="355" class="sub" text-anchor="start">PPN 11% (TERMASUK)</text>
  <text x="425" y="355" class="sub right">8.175</text>

  <line x1="20" y1="380" x2="430" y2="380" class="line"/>

  <!-- TOTAL AKHIR -->
  <text x="25" y="420" class="bold" font-size="18px">TOTAL BAYAR :</text>
  <text x="425" y="420" class="bold right" font-size="20px">Rp 82.500</text>

  <line x1="20" y1="445" x2="430" y2="445" class="line"/>

  <text x="25" y="475" class="mono">BAYAR (QRIS GOPAY)</text>
  <text x="425" y="475" class="mono right">82.500</text>

  <text x="25" y="505" class="mono">KEMBALI</text>
  <text x="425" y="505" class="mono right">0</text>

  <!-- Footer -->
  <line x1="20" y1="540" x2="430" y2="540" class="line"/>
  <text x="225" y="575" class="sub">LAYANAN KONSUMEN SMS: 08111500280</text>
  <text x="225" y="595" class="sub">TERIMA KASIH ATAS KUNJUNGAN ANDA</text>
  <text x="225" y="615" class="sub">BARANG YANG SUDAH DIBELI TIDAK DAPAT DITUKAR</text>
</svg>
`;

// 2. Struk Kopi Kenangan
const kopiSvg = `
<svg width="450" height="720" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#FBFBF9"/>
  
  <style>
    .header { font-family: 'Courier New', monospace; font-size: 20px; font-weight: bold; text-anchor: middle; fill: #111; }
    .sub { font-family: 'Courier New', monospace; font-size: 12px; text-anchor: middle; fill: #444; }
    .mono { font-family: 'Courier New', monospace; font-size: 13px; fill: #111; }
    .bold { font-family: 'Courier New', monospace; font-size: 15px; font-weight: bold; fill: #111; }
    .right { text-anchor: end; }
    .line { stroke: #333; stroke-dasharray: 5, 3; stroke-width: 1.5; }
  </style>

  <!-- Header -->
  <text x="225" y="45" class="header">KOPI KENANGAN</text>
  <text x="225" y="65" class="sub">OUTLET MALL KOTA KASABLANKA LG</text>
  <text x="225" y="82" class="sub">ORDER #0842  - DINE IN</text>
  <text x="225" y="99" class="sub">TANGGAL: 2026-11-20 16:15</text>
  <text x="225" y="116" class="sub">KASIR: SITI A.</text>
  
  <line x1="20" y1="130" x2="430" y2="130" class="line"/>

  <!-- Items -->
  <text x="25" y="160" class="mono">2X KOPI KENANGAN MANTAN (L)</text>
  <text x="40" y="180" class="sub" text-anchor="start">- Less Sugar, Normal Ice</text>
  <text x="425" y="160" class="mono right">48.000</text>

  <text x="25" y="215" class="mono">1X ROTI COKLAT KLASIK</text>
  <text x="425" y="215" class="mono right">14.000</text>

  <line x1="20" y1="245" x2="430" y2="245" class="line"/>

  <!-- Subtotal, Pajak & SC -->
  <text x="25" y="275" class="mono">SUBTOTAL</text>
  <text x="425" y="275" class="mono right">62.000</text>

  <text x="25" y="305" class="mono">PB1 / PAJAK RESTO (10%)</text>
  <text x="425" y="305" class="mono right">6.200</text>

  <text x="25" y="335" class="mono">SERVICE CHARGE (5%)</text>
  <text x="425" y="335" class="mono right">3.100</text>

  <text x="25" y="365" class="mono">PEMBULATAN</text>
  <text x="425" y="365" class="mono right">-300</text>

  <line x1="20" y1="390" x2="430" y2="390" class="line"/>

  <!-- GRAND TOTAL -->
  <text x="25" y="435" class="bold" font-size="18px">TOTAL BAYAR :</text>
  <text x="425" y="435" class="bold right" font-size="20px">Rp 71.000</text>

  <line x1="20" y1="465" x2="430" y2="465" class="line"/>

  <text x="25" y="495" class="mono">CARA BAYAR: TUNAI / CASH</text>
  <text x="425" y="495" class="mono right">100.000</text>

  <text x="25" y="525" class="mono">KEMBALIAN</text>
  <text x="425" y="525" class="mono right">29.000</text>

  <!-- Footer -->
  <line x1="20" y1="560" x2="430" y2="560" class="line"/>
  <text x="225" y="595" class="sub">DOWNLOAD APLIKASI KOPI KENANGAN</text>
  <text x="225" y="615" class="sub">DAPATKAN CASHBACK POIN SETIAP TRANSAKSI</text>
  <text x="225" y="635" class="sub">#HatiTertinggalDiKopiKenangan</text>
</svg>
`;

async function run() {
  await sharp(Buffer.from(indomaretSvg))
    .jpeg({ quality: 90 })
    .toFile(path.join(outputDir, 'struk-indomaret.jpg'));
  console.log('✅ Generated public/samples/struk-indomaret.jpg');

  await sharp(Buffer.from(kopiSvg))
    .jpeg({ quality: 90 })
    .toFile(path.join(outputDir, 'struk-kopi-kenangan.jpg'));
  console.log('✅ Generated public/samples/struk-kopi-kenangan.jpg');
}

run();
