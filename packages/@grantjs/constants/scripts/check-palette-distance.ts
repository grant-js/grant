/**
 * Check that every pair of tag palette colors has CIEDE2000 (ΔE00) >= MIN_PALETTE_DELTA_E.
 * Run from package root: pnpm run check:palette
 * Uses Tailwind shade 500 hex as the canonical representative per color.
 */
import { MIN_PALETTE_DELTA_E, TAG_COLORS } from '../src/colors';
import { TAILWIND_SHADE_500_HEX } from '../src/colors-palette-data';

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error(`Invalid hex: ${hex}`);
  return [
    Number.parseInt(result[1]!, 16),
    Number.parseInt(result[2]!, 16),
    Number.parseInt(result[3]!, 16),
  ];
}

function rgbToLab(rgb: [number, number, number]): { L: number; A: number; B: number } {
  let [r, g, b] = rgb.map((c) => c / 255);
  r = r > 0.04045 ? ((r + 0.055) / 1.055) ** 2.4 : r / 12.92;
  g = g > 0.04045 ? ((g + 0.055) / 1.055) ** 2.4 : g / 12.92;
  b = b > 0.04045 ? ((b + 0.055) / 1.055) ** 2.4 : b / 12.92;
  const x = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const y = (r * 0.2126729 + g * 0.7151522 + b * 0.072175) / 1.0;
  const z = (r * 0.0193339 + g * 0.119192 + b * 0.950304) / 1.08883;
  const fx = x > 0.008856 ? x ** (1 / 3) : 7.787 * x + 16 / 116;
  const fy = y > 0.008856 ? y ** (1 / 3) : 7.787 * y + 16 / 116;
  const fz = z > 0.008856 ? z ** (1 / 3) : 7.787 * z + 16 / 116;
  return {
    L: 116 * fy - 16,
    A: 500 * (fx - fy),
    B: 200 * (fy - fz),
  };
}

function hexToLab(hex: string): { L: number; A: number; B: number } {
  return rgbToLab(hexToRgb(hex));
}

/**
 * CIEDE2000 color difference. Reference: Sharma et al., "The CIEDE2000 color-difference formula".
 */
function deltaE00(
  lab1: { L: number; A: number; B: number },
  lab2: { L: number; A: number; B: number }
): number {
  const L1 = lab1.L;
  const a1 = lab1.A;
  const b1 = lab1.B;
  const L2 = lab2.L;
  const a2 = lab2.A;
  const b2 = lab2.B;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cbar = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)));
  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);
  const h1p = Math.atan2(b1, a1p) * (180 / Math.PI);
  const h2p = Math.atan2(b2, a2p) * (180 / Math.PI);
  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = h2p - h1p;
  if (C1p * C2p === 0) dhp = 0;
  else if (dhp > 180) dhp -= 360;
  else if (dhp < -180) dhp += 360;
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * Math.PI) / 360);
  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;
  let hbarp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) <= 180) hbarp /= 2;
    else hbarp = (hbarp + 360) / 2;
  }
  const T =
    1 -
    0.17 * Math.cos((hbarp - 30) * (Math.PI / 180)) +
    0.24 * Math.cos(2 * hbarp * (Math.PI / 180)) +
    0.32 * Math.cos((3 * hbarp + 6) * (Math.PI / 180)) -
    0.2 * Math.cos((4 * hbarp - 63) * (Math.PI / 180));
  const dtheta = 30 * Math.exp(-(((hbarp - 275) / 25) ** 2));
  const RC = 2 * Math.sqrt(Cbarp ** 7 / (Cbarp ** 7 + 25 ** 7));
  const SL = 1 + (0.015 * (Lbarp - 50) ** 2) / Math.sqrt(20 + (Lbarp - 50) ** 2);
  const SC = 1 + 0.045 * Cbarp;
  const SH = 1 + 0.015 * Cbarp * T;
  const RT = -Math.sin(2 * dtheta * (Math.PI / 180)) * RC;
  const dLpNorm = dLp / SL;
  const dCpNorm = dCp / SC;
  const dHpNorm = dHp / SH;
  return Math.sqrt(
    dLpNorm * dLpNorm + dCpNorm * dCpNorm + dHpNorm * dHpNorm + RT * dCpNorm * dHpNorm
  );
}

function main(): void {
  const hexMap = TAILWIND_SHADE_500_HEX;
  const missing = TAG_COLORS.filter((c) => !hexMap[c]);
  if (missing.length > 0) {
    console.error(`Palette colors missing from TAILWIND_SHADE_500_HEX: ${missing.join(', ')}`);
    process.exit(1);
  }

  const labs = new Map<string, { L: number; A: number; B: number }>();
  for (const name of TAG_COLORS) {
    labs.set(name, hexToLab(hexMap[name]!));
  }

  let minDelta = Infinity;
  let worstPair: [string, string] | null = null;
  const violations: Array<{ a: string; b: string; delta: number }> = [];

  for (let i = 0; i < TAG_COLORS.length; i++) {
    for (let j = i + 1; j < TAG_COLORS.length; j++) {
      const a = TAG_COLORS[i]!;
      const b = TAG_COLORS[j]!;
      const d = deltaE00(labs.get(a)!, labs.get(b)!);
      if (d < minDelta) {
        minDelta = d;
        worstPair = [a, b];
      }
      if (d < MIN_PALETTE_DELTA_E) {
        violations.push({ a, b, delta: d });
      }
    }
  }

  if (violations.length > 0) {
    console.error(
      `Palette check failed: ${violations.length} pair(s) below MIN_PALETTE_DELTA_E (${MIN_PALETTE_DELTA_E})`
    );
    for (const v of violations) {
      console.error(`  ${v.a} – ${v.b}: ΔE00 = ${v.delta.toFixed(2)}`);
    }
    console.error(`Minimum pairwise ΔE00: ${minDelta.toFixed(2)} (${worstPair?.join(' – ')})`);
    process.exit(1);
  }

  console.log(
    `Palette check passed: all ${TAG_COLORS.length} colors have pairwise ΔE00 >= ${MIN_PALETTE_DELTA_E} (min: ${minDelta.toFixed(2)})`
  );
}

try {
  main();
} catch (err) {
  console.error('Palette check failed:', err);
  process.exit(1);
}
