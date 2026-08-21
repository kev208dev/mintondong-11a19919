export const DEFAULT_CLUB_ACCENT = "#17C37B";

type Rgb = { r: number; g: number; b: number };

function rgbToHex({ r, g, b }: Rgb) {
  return `#${[r, g, b]
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function rgbToHsl({ r, g, b }: Rgb) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return { h: 0, s: 0, l: lightness };
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (max === red) hue = 60 * (((green - blue) / delta) % 6);
  else if (max === green) hue = 60 * ((blue - red) / delta + 2);
  else hue = 60 * ((red - green) / delta + 4);
  return { h: hue < 0 ? hue + 360 : hue, s: saturation, l: lightness };
}

/** Keeps extracted colors vivid enough to work as a soft accent, never as body text. */
export function normalizeClubAccent(rgb: Rgb): string {
  const hsl = rgbToHsl(rgb);
  if (hsl.s < 0.18 || hsl.l < 0.12 || hsl.l > 0.9) return DEFAULT_CLUB_ACCENT;
  const lightness = Math.min(0.62, Math.max(0.38, hsl.l));
  const saturation = Math.min(0.82, Math.max(0.42, hsl.s));
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((hsl.h / 60) % 2) - 1));
  const match = lightness - chroma / 2;
  const [r, g, b] =
    hsl.h < 60
      ? [chroma, x, 0]
      : hsl.h < 120
        ? [x, chroma, 0]
        : hsl.h < 180
          ? [0, chroma, x]
          : hsl.h < 240
            ? [0, x, chroma]
            : hsl.h < 300
              ? [x, 0, chroma]
              : [chroma, 0, x];
  return rgbToHex({ r: (r + match) * 255, g: (g + match) * 255, b: (b + match) * 255 });
}

export function rgba(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((index) => Number.parseInt(value.slice(index, index + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function extractDominantAccent(source: CanvasImageSource): string {
  if (typeof document === "undefined") return DEFAULT_CLUB_ACCENT;
  const canvas = document.createElement("canvas");
  canvas.width = 24;
  canvas.height = 24;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return DEFAULT_CLUB_ACCENT;
  try {
    context.drawImage(source, 0, 0, 24, 24);
    const pixels = context.getImageData(0, 0, 24, 24).data;
    const total = { r: 0, g: 0, b: 0, weight: 0 };
    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = (pixels[index + 3] ?? 0) / 255;
      if (alpha < 0.35) continue;
      const rgb = {
        r: pixels[index] ?? 0,
        g: pixels[index + 1] ?? 0,
        b: pixels[index + 2] ?? 0,
      };
      const { s, l } = rgbToHsl(rgb);
      const weight = alpha * (0.35 + s) * (1 - Math.abs(l - 0.52));
      total.r += rgb.r * weight;
      total.g += rgb.g * weight;
      total.b += rgb.b * weight;
      total.weight += weight;
    }
    if (!total.weight) return DEFAULT_CLUB_ACCENT;
    return normalizeClubAccent({
      r: total.r / total.weight,
      g: total.g / total.weight,
      b: total.b / total.weight,
    });
  } catch {
    // Cross-origin images without CORS headers cannot be sampled safely.
    return DEFAULT_CLUB_ACCENT;
  }
}
