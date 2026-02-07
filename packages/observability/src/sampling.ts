const DEFAULT_SAMPLE_RATE = 1;

function clampSampleRate(value: number | undefined): number {
  if (value === undefined || Number.isNaN(value)) return DEFAULT_SAMPLE_RATE;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function shouldSample(sampleRate: number | undefined, key: string): boolean {
  const normalizedRate = clampSampleRate(sampleRate);
  if (normalizedRate >= 1) return true;
  if (normalizedRate <= 0) return false;

  const hash = stableHash(key);
  const ratio = hash / 0xffffffff;
  return ratio < normalizedRate;
}

export function normalizeSampleRate(value: number | undefined): number {
  return clampSampleRate(value);
}
