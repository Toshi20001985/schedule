/**
 * Layover - PWA Icon Generator
 * Generates app icons using real geographic data (Natural Earth)
 * with orthographic projection centered on Japan.
 */

import { geoOrthographic, geoPath, geoGraticule } from 'd3-geo';
import { feature } from 'topojson-client';
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ICONS_DIR = join(ROOT, 'public', 'icons');

mkdirSync(ICONS_DIR, { recursive: true });

// ── 設定 ──────────────────────────────────────────────────────────
const SIZE = 1024;
const GLOBE_R = 330;          // 球体の半径 (px)
const CX = 512, CY = 512;     // 中心座標

const POINT_JAPAN = [139, 35];         // 東京
const POINT_SF    = [-122.4, 37.8];   // サンフランシスコ

const DOT_R = GLOBE_R * 0.072;        // 点の半径

// ── 色 ────────────────────────────────────────────────────────────
const BG          = '#1A1A1A';
const GLOBE_FILL  = '#0F0F0F';
const GLOBE_STROKE = 'rgba(250,250,247,0.6)';
const LAND_FILL   = 'rgba(250,250,247,0.55)';
const GRID_STROKE = 'rgba(250,250,247,0.2)';
const DOT_JAPAN   = '#7BB4FF';
const DOT_SF      = '#FF9FB8';
const ARCH_COLOR  = '#FAFAF7';

// ── d3-geo 設定 ───────────────────────────────────────────────────
const projection = geoOrthographic()
  .rotate([-139, -35])   // 日本中心
  .scale(GLOBE_R)
  .translate([CX, CY])
  .clipAngle(90);

const pathGen = geoPath(projection);

// ── ユーティリティ ────────────────────────────────────────────────
/** 球面座標 → SVG座標。前面（clipAngle内）かどうかも返す */
function project(lon, lat) {
  const r = projection.rotate();
  const λ = (lon + (-r[0])) * Math.PI / 180;
  const φ = (lat + (-r[1])) * Math.PI / 180;
  const cosC = Math.sin(0) * Math.sin(φ) + Math.cos(0) * Math.cos(φ) * Math.cos(λ);
  const visible = cosC > 0;
  const p = projection([lon, lat]);
  return { x: p?.[0], y: p?.[1], visible };
}

/** 2点の大圏中点を球面で計算し、外側に膨らませたアーチのSVGパスを返す */
function archPath(p1, p2, steps = 60) {
  const [lon1, lat1] = p1;
  const [lon2, lat2] = p2;
  const toRad = d => d * Math.PI / 180;
  const toDeg = r => r * 180 / Math.PI;

  // 球面上の中点（大圏の中点）
  const φ1 = toRad(lat1), λ1 = toRad(lon1);
  const φ2 = toRad(lat2), λ2 = toRad(lon2);
  const x1 = Math.cos(φ1) * Math.cos(λ1), y1 = Math.cos(φ1) * Math.sin(λ1), z1 = Math.sin(φ1);
  const x2 = Math.cos(φ2) * Math.cos(λ2), y2 = Math.cos(φ2) * Math.sin(λ2), z2 = Math.sin(φ2);

  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const xi = x1 * (1 - t) + x2 * t;
    const yi = y1 * (1 - t) + y2 * t;
    const zi = z1 * (1 - t) + z2 * t;
    const len = Math.sqrt(xi * xi + yi * yi + zi * zi);
    const lonI = toDeg(Math.atan2(yi / len, xi / len));
    const latI = toDeg(Math.asin(zi / len));
    const { x, y, visible } = project(lonI, latI);
    points.push({ x, y, visible });
  }

  // 前面の連続セグメントのみ描画
  let d = '';
  let inSeg = false;
  for (const pt of points) {
    if (pt.visible && pt.x != null) {
      if (!inSeg) { d += `M ${pt.x.toFixed(2)} ${pt.y.toFixed(2)} `; inSeg = true; }
      else         { d += `L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)} `; }
    } else {
      inSeg = false;
    }
  }
  return d;
}

// ── メイン ────────────────────────────────────────────────────────
async function generate() {
  console.log('📡 Fetching geographic data...');
  const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json');
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const world = await res.json();
  const land = feature(world, world.objects.land);

  console.log('🗺  Building SVG...');

  // 大陸パス
  const landPath = pathGen(land) || '';

  // 経緯線（30度刻み）
  const graticule = geoGraticule().step([30, 30]);
  const gridPath = pathGen(graticule()) || '';

  // 点の座標
  const jp = project(...POINT_JAPAN);
  const sf = project(...POINT_SF);

  // アーチ
  const arch = archPath(POINT_JAPAN, POINT_SF);

  // 角丸マスク用クリップパス radius
  const R_CORNER = SIZE * 0.225;   // iOSスタイル角丸

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <!-- 角丸マスク -->
    <clipPath id="rounded">
      <rect width="${SIZE}" height="${SIZE}" rx="${R_CORNER}" ry="${R_CORNER}"/>
    </clipPath>
    <!-- 球体クリップ -->
    <clipPath id="globe-clip">
      <circle cx="${CX}" cy="${CY}" r="${GLOBE_R}"/>
    </clipPath>
  </defs>

  <g clip-path="url(#rounded)">
    <!-- 背景 -->
    <rect width="${SIZE}" height="${SIZE}" fill="${BG}"/>

    <!-- 球体ベース -->
    <circle cx="${CX}" cy="${CY}" r="${GLOBE_R}" fill="${GLOBE_FILL}" stroke="${GLOBE_STROKE}" stroke-width="0.8"/>

    <!-- 地理要素（球体内にクリップ） -->
    <g clip-path="url(#globe-clip)">
      <!-- 経緯線 -->
      <path d="${gridPath}" fill="none" stroke="${GRID_STROKE}" stroke-width="0.3"/>
      <!-- 大陸 -->
      <path d="${landPath}" fill="${LAND_FILL}" stroke="rgba(250,250,247,0.15)" stroke-width="0.3"/>
    </g>

    <!-- アーチ（球体の上） -->
    ${arch ? `<path d="${arch}" fill="none" stroke="${ARCH_COLOR}" stroke-width="1.6" stroke-dasharray="2.5 2.5" stroke-linecap="round" opacity="0.85"/>` : ''}

    <!-- 点：日本 -->
    ${jp.visible ? `<circle cx="${jp.x.toFixed(2)}" cy="${jp.y.toFixed(2)}" r="${DOT_R.toFixed(2)}" fill="${DOT_JAPAN}"/>` : ''}
    <!-- 点：SF -->
    ${sf.visible ? `<circle cx="${sf.x.toFixed(2)}" cy="${sf.y.toFixed(2)}" r="${DOT_R.toFixed(2)}" fill="${DOT_SF}"/>` : ''}
  </g>
</svg>`;

  // SVG 保存
  const svgPath = join(ICONS_DIR, 'icon.svg');
  writeFileSync(svgPath, svg, 'utf8');
  console.log('✅ icon.svg saved');

  // PNG 生成
  const sizes = [
    { name: 'icon-1024.png', size: 1024 },
    { name: 'icon-512.png',  size: 512  },
    { name: 'icon-192.png',  size: 192  },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'favicon-32.png', size: 32  },
    { name: 'favicon-16.png', size: 16  },
  ];

  const svgBuf = Buffer.from(svg);
  for (const { name, size } of sizes) {
    const outPath = join(ICONS_DIR, name);
    await sharp(svgBuf)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`✅ ${name} (${size}×${size})`);
  }

  // favicon.ico（32px ベース）
  const icoPath = join(ROOT, 'public', 'favicon.ico');
  await sharp(svgBuf).resize(32, 32).png().toFile(icoPath);
  console.log('✅ favicon.ico');

  console.log('\n🎉 All icons generated in public/icons/');
}

generate().catch(e => { console.error(e); process.exit(1); });
