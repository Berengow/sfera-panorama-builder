import { clamp, fontStack, hex } from "@/lib/tour/project";
import type { Settings } from "@/lib/tour/types";

export function chromeCss(settings: Settings): string {
  const accent = hex(settings.accent, "#e4a04a");
  const bg = hex(settings.chromeBg, "#1a1612");
  const fg = hex(settings.chromeFg, "#f3eee6");
  const hotspot = hex(settings.hotspot, accent);
  const radius = clamp(settings.radius, 0, 32);
  const opacity = clamp(settings.opacity, 0.35, 1);
  const blur = clamp(settings.blur, 0, 40);
  const ink = isLight(accent) ? "#1a1208" : "#f6f1ea";
  const scale = clamp(settings.uiScale, 0.8, 1.25);
  const hs = clamp(settings.hotspotScale, 0.6, 1.8);
  const font = fontStack(settings.font);
  const panel = `color-mix(in srgb, ${bg} ${Math.round(opacity * 100)}%, transparent)`;

  return `
.tour {
  --tour-accent: ${accent};
  --tour-bg: ${bg};
  --tour-fg: ${fg};
  --tour-hotspot: ${hotspot};
  --tour-radius: ${radius}px;
  --tour-font: ${font};
  --hs: ${hs};
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #0e0c0a;
  color: ${fg};
  font-family: ${font};
}
.tour .tour-pano { position: absolute; inset: 0; z-index: 1; }
.tour-poster { position: absolute; inset: 0; z-index: 0; width: 100%; height: 100%; object-fit: cover; }
.tour .pnlm-container {
  background: transparent !important;
  background-image: none !important;
  font-family: ${font};
}
.tour.is-live .pnlm-container { background: #0e0c0a !important; }
.tour .pnlm-load-box { display: none !important; }
.tour .pnlm-about-msg { display: none !important; }
.tour-ui { position: absolute; inset: 0; z-index: 5; pointer-events: none; }
.tour-ui .hit, .tour-ui button, .tour-ui a { pointer-events: auto; }
.tour-logo, .tour-title, .tour-tools, .tour-info, .tour-audio, .tour-about-btn, .tour-full, .tour-compass {
  background: ${panel};
  color: ${fg};
  border: 1px solid color-mix(in srgb, ${fg} 16%, transparent);
  backdrop-filter: blur(${blur}px);
  border-radius: ${radius}px;
}
.tour-logo {
  position: absolute;
  top: ${Math.round(16 * scale)}px;
  left: ${Math.round(16 * scale)}px;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: min(46vw, 280px);
  padding: ${Math.round(8 * scale)}px ${Math.round(14 * scale)}px;
  font-weight: 650;
  font-size: ${Math.round(14 * scale)}px;
  letter-spacing: 0.04em;
}
.tour-logo img { width: ${Math.round(28 * scale)}px; height: ${Math.round(28 * scale)}px; object-fit: cover; border-radius: ${Math.max(4, radius - 8)}px; }
.tour-title {
  position: absolute;
  top: ${Math.round(16 * scale)}px;
  left: 50%;
  transform: translateX(-50%);
  padding: ${Math.round(8 * scale)}px ${Math.round(14 * scale)}px;
  font-size: ${Math.round(13 * scale)}px;
  font-weight: 600;
  max-width: 42vw;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tour-tools {
  position: absolute;
  top: ${Math.round(16 * scale)}px;
  right: ${Math.round(16 * scale)}px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
}
.tour-tools button, .tour-audio {
  border: 0;
  background: transparent;
  color: inherit;
  min-width: 40px;
  min-height: 40px;
  border-radius: ${Math.max(8, radius - 6)}px;
  font: inherit;
  font-size: ${Math.round(13 * scale)}px;
  font-weight: 600;
}
.tour-tools button:hover, .tour-audio:hover, .tour-step:hover { background: color-mix(in srgb, ${fg} 12%, transparent); }
.tour-audio {
  position: absolute;
  right: ${Math.round(16 * scale)}px;
  bottom: ${Math.round(92 * scale)}px;
  padding: 0 12px;
}
.tour-audio.on { color: ${accent}; }
.tour-compass {
  width: 40px;
  height: 40px;
  position: relative;
  border-radius: 999px;
}
.tour-compass i {
  position: absolute;
  left: 50%;
  top: 7px;
  width: 2px;
  height: 14px;
  margin-left: -1px;
  background: ${accent};
  transform-origin: 50% 13px;
  border-radius: 2px;
}
.tour-compass b {
  position: absolute;
  top: 4px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
}
.tour-info {
  position: absolute;
  left: ${Math.round(16 * scale)}px;
  bottom: ${Math.round(108 * scale)}px;
  max-width: min(360px, 70vw);
  padding: ${Math.round(12 * scale)}px ${Math.round(14 * scale)}px;
  font-size: ${Math.round(14 * scale)}px;
  line-height: 1.45;
}
.tour-carousel {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: ${panel};
  border: 1px solid color-mix(in srgb, ${fg} 16%, transparent);
  backdrop-filter: blur(${blur}px);
  border-radius: ${radius + 4}px;
  max-width: min(920px, calc(100% - 32px));
}
.tour-carousel.pos-bottom { left: 50%; bottom: ${Math.round(18 * scale)}px; transform: translateX(-50%); }
.tour-carousel.pos-top { left: 50%; top: ${Math.round(68 * scale)}px; transform: translateX(-50%); }
.tour-carousel.pos-left, .tour-carousel.pos-right {
  top: 50%;
  transform: translateY(-50%);
  flex-direction: column;
  max-height: min(70vh, 640px);
  max-width: 132px;
}
.tour-carousel.pos-left { left: ${Math.round(16 * scale)}px; }
.tour-carousel.pos-right { right: ${Math.round(16 * scale)}px; }
.tour-items { display: flex; gap: 8px; overflow: auto; scrollbar-width: none; }
.tour-carousel.pos-left .tour-items, .tour-carousel.pos-right .tour-items { flex-direction: column; }
.tour-step {
  flex: none;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, ${fg} 10%, transparent);
  color: ${fg};
  font: inherit;
  font-size: 18px;
}
.tour-item {
  position: relative;
  flex: none;
  width: ${Math.round(92 * scale)}px;
  height: ${Math.round(58 * scale)}px;
  padding: 0;
  border-radius: ${Math.max(8, radius - 4)}px;
  border: 2px solid transparent;
  overflow: hidden;
  background: #000;
  color: ${fg};
  font: inherit;
  font-size: 12px;
  font-weight: 600;
}
.tour-carousel.titles .tour-item, .tour-item.titles {
  width: auto;
  height: auto;
  min-height: 40px;
  padding: 8px 12px;
  background: color-mix(in srgb, ${bg} 55%, transparent);
}
.tour-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
.tour-item .cap {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 12px 6px 3px;
  background: linear-gradient(transparent, rgba(0,0,0,.78));
  color: #fff;
  font-size: 10px;
  font-weight: 650;
  line-height: 1.2;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tour-item.titles .cap { position: static; padding: 0; background: none; color: inherit; font-size: inherit; }
.tour-item.active, .tour-item:hover { border-color: ${accent}; }
.tour-map {
  position: absolute;
  right: ${Math.round(16 * scale)}px;
  bottom: ${Math.round(148 * scale)}px;
  width: min(180px, 42vw);
  aspect-ratio: 4 / 3;
  border-radius: ${radius}px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, ${fg} 18%, transparent);
  background: ${panel};
}
.tour-map img { width: 100%; height: 100%; object-fit: cover; display: block; }
.tour-map .dot {
  position: absolute;
  width: 14px;
  height: 14px;
  margin: -7px 0 0 -7px;
  border-radius: 999px;
  border: 2px solid #fff;
  background: ${hotspot};
  padding: 0;
}
.tour-map .dot.active { transform: scale(1.35); box-shadow: 0 0 0 4px color-mix(in srgb, ${hotspot} 40%, transparent); }
.tour-card, .tour-about {
  position: absolute;
  z-index: 6;
  background: ${bg};
  color: ${fg};
  border-radius: ${radius + 2}px;
  border: 1px solid color-mix(in srgb, ${fg} 16%, transparent);
  box-shadow: 0 18px 50px rgba(0,0,0,.35);
}
.tour-card {
  left: 50%;
  bottom: ${Math.round(110 * scale)}px;
  transform: translateX(-50%);
  width: min(380px, calc(100% - 32px));
  padding: 16px 16px 14px;
}
.tour-card h3, .tour-about h3 { margin: 0 0 8px; font-size: 18px; font-weight: 650; }
.tour-card p, .tour-about p { margin: 0 0 12px; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
.tour-card a, .tour-card button, .tour-about button, .tour-splash button {
  border: 0;
  border-radius: 999px;
  background: ${accent};
  color: ${ink};
  font: inherit;
  font-weight: 650;
  font-size: 13px;
  padding: 8px 14px;
  margin-right: 8px;
  text-decoration: none;
  display: inline-block;
}
.tour-card .ghost, .tour-about .ghost {
  background: transparent;
  color: ${fg};
  border: 1px solid color-mix(in srgb, ${fg} 24%, transparent);
}
.tour-about {
  top: ${Math.round(72 * scale)}px;
  right: ${Math.round(16 * scale)}px;
  width: min(360px, calc(100% - 32px));
  padding: 18px;
  max-height: min(70vh, 520px);
  overflow: auto;
}
.tour-splash {
  position: absolute;
  inset: 0;
  z-index: 8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 32px 20px;
  background: color-mix(in srgb, ${bg} 78%, transparent);
  backdrop-filter: blur(${Math.max(blur, 10)}px);
}
.tour-splash h2 { margin: 0 0 10px; font-size: clamp(32px, 5vw, 56px); font-weight: 560; letter-spacing: -0.03em; }
.tour-splash p { margin: 0 0 20px; max-width: 440px; font-size: 16px; line-height: 1.5; }
.tour-progress {
  position: absolute;
  top: 0; left: 0; height: 3px; width: 35%;
  background: ${accent};
  z-index: 9;
  transition: width .6s ease;
}
.tour-progress.done { width: 100%; opacity: 0; }
.tour-loading, .tour-error {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 7;
  max-width: min(440px, calc(100% - 40px));
  text-align: center;
  padding: 16px 18px;
  border-radius: ${radius}px;
  background: color-mix(in srgb, ${bg} 88%, transparent);
  color: ${fg};
}
.tour .sfera-hs {
  width: calc(22px * var(--hs));
  height: calc(22px * var(--hs));
  border-radius: 999px;
  background: ${hotspot};
  border: 2px solid #fff;
  box-shadow: 0 0 0 5px color-mix(in srgb, ${hotspot} 38%, transparent);
}
.tour .sfera-hs-link { background: transparent; box-shadow: inset 0 0 0 3px ${hotspot}; }
.tour .sfera-hs-scene { background: transparent; border: 0; box-shadow: none; }
.tour .sfera-hs-scene::before {
  content: "";
  position: absolute;
  inset: 2px;
  background: ${hotspot};
  transform: rotate(45deg);
  border-radius: 3px;
}
.tour .hs-label {
  position: absolute;
  left: 50%;
  top: calc(100% + 8px);
  transform: translateX(-50%);
  padding: 4px 8px;
  border-radius: 999px;
  background: ${panel};
  color: ${fg};
  border: 1px solid color-mix(in srgb, ${fg} 14%, transparent);
  font: 600 12px/1.2 ${font};
  white-space: nowrap;
  pointer-events: none;
  backdrop-filter: blur(8px);
}
.tour.hide-labels .hs-label { display: none; }
.tour.hide-hs .sfera-hs { display: none !important; }
.tour .sfera-hs::after {
  content: "";
  position: absolute;
  inset: -7px;
  border-radius: inherit;
  border: 1px solid ${hotspot};
  animation: sfera-ping 2.6s ease-out infinite;
}
.tour.shape-ring .sfera-hs {
  background: transparent;
  box-shadow: inset 0 0 0 3px ${hotspot};
}
.tour.shape-diamond .sfera-hs {
  border-radius: 2px;
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
}
@keyframes sfera-ping {
  0% { transform: scale(.7); opacity: .7; }
  100% { transform: scale(1.35); opacity: 0; }
}
.tour-map.placing { outline: 2px dashed ${accent}; cursor: crosshair; }
.tour-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 8px;
  text-align: center;
  font-size: 12px;
  line-height: 1.35;
}
@media (max-width: 720px) {
  .tour-title { display: none; }
  .tour-info { max-width: calc(100% - 32px); bottom: 132px; }
  .tour-map { width: 120px; bottom: 168px; }
}
@media (prefers-reduced-motion: reduce) {
  .tour .sfera-hs::after { animation: none; }
}
`;
}

function isLight(hexColor: string): boolean {
  const n = Number.parseInt(hexColor.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return r * 0.299 + g * 0.587 + b * 0.114 > 186;
}
