/**
 * „ლაქა“ — აპის ვიზუალური ხელმოწერა.
 *
 * პორტი: `Splash/Theme/SplashShape.swift`. SwiftUI-ში `Shape` იყო; აქ SVG-ის
 * ბილიკს ვაბრუნებთ და `react-native-svg` ხატავს.
 *
 * გენერატორი **დეტერმინისტულია**: ერთი და იგივე `seed` ყოველთვის ერთსა და
 * იმავე ლაქას ხატავს, ამიტომ თამაშის ფილა ყოველ გახსნაზე არ „ცოცავს“.
 */

const MASK = (1n << 64n) - 1n;

/** Swift-ის `SplashRandom` — UInt64-ის გადავსებადი არითმეტიკა BigInt-ით. */
class SplashRandom {
  private state: bigint;

  constructor(seed: bigint) {
    this.state = (seed * 6364136223846793005n + 1442695040888963407n) & MASK;
  }

  private next(): bigint {
    this.state ^= this.state >> 33n;
    this.state = (this.state * 0xff51afd7ed558ccdn) & MASK;
    this.state ^= this.state >> 33n;
    return this.state & MASK;
  }

  next01(): number {
    return Number(this.next() % 10000n) / 10000;
  }
}

/** სტრიქონიდან თესლი — FNV-1a, Swift-ის `stainSeed`-ის იგივე. */
export function stainSeed(id: string): bigint {
  let hash = 2166136261n;
  for (const ch of id) {
    hash = ((hash ^ BigInt(ch.codePointAt(0) ?? 0)) * 16777619n) & MASK;
  }
  return hash;
}

export interface SplashShapeOptions {
  lobes?: number;
  wobble?: number;
  seed?: bigint | number;
  size: number;
}

/**
 * ლაქის SVG ბილიკი.
 *
 * წვეროები წრეზეა გაშლილი, რადიუსი კი თითოეულზე ოდნავ სხვაა; შეერთება
 * Catmull–Rom → Bézier-ია, რომ კუთხეები არსად ჩანდეს.
 */
export function splashPath({ lobes = 7, wobble = 0.22, seed = 1, size }: SplashShapeOptions): string {
  const rng = new SplashRandom(typeof seed === 'bigint' ? seed : BigInt(seed));
  const center = size / 2;
  const radius = size / 2;

  const radii = Array.from({ length: lobes }, () => radius * (1 - wobble + rng.next01() * wobble * 2));
  const step = (2 * Math.PI) / lobes;

  const point = (i: number) => {
    const angle = step * i;
    const r = radii[((i % lobes) + lobes) % lobes];
    return { x: center + Math.cos(angle) * r, y: center + Math.sin(angle) * r };
  };

  const p = point(0);
  let d = `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  for (let i = 0; i < lobes; i++) {
    const p0 = point(i - 1);
    const p1 = point(i);
    const p2 = point(i + 1);
    const p3 = point(i + 2);
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${c1.x.toFixed(2)} ${c1.y.toFixed(2)}, ${c2.x.toFixed(2)} ${c2.y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d + ' Z';
}
