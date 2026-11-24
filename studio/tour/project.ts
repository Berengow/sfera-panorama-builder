import type {
  CarouselPosition,
  ExportQuality,
  Hotspot,
  HotspotKind,
  HotspotShape,
  Project,
  Scene,
  Settings,
  TourFont,
} from "@/lib/tour/types";

export interface Preset {
  id: string;
  name: string;
  accent: string;
  chromeBg: string;
  chromeFg: string;
  hotspot: string;
}

export const PRESETS: Preset[] = [
  { id: "ember", name: "Уголь", accent: "#e4a04a", chromeBg: "#1a1612", chromeFg: "#f3eee6", hotspot: "#e4a04a" },
  { id: "lagoon", name: "Лагуна", accent: "#7eb8b3", chromeBg: "#101616", chromeFg: "#e7f1ef", hotspot: "#d7efe8" },
  { id: "ivory", name: "Кость", accent: "#8d4f24", chromeBg: "#f6f0e6", chromeFg: "#241910", hotspot: "#8d4f24" },
  { id: "pine", name: "Хвоя", accent: "#c6d36b", chromeBg: "#141812", chromeFg: "#eef2e4", hotspot: "#c6d36b" },
  { id: "ink", name: "Тушь", accent: "#f4f4f4", chromeBg: "#0e0e0e", chromeFg: "#f5f5f5", hotspot: "#ffffff" },
  { id: "wine", name: "Вино", accent: "#e07a78", chromeBg: "#1a1214", chromeFg: "#f8eceb", hotspot: "#e07a78" },
];

const FONTS: TourFont[] = ["Outfit", "Unbounded", "Manrope", "Literata"];

export function uid(): string {
  return crypto.randomUUID();
}

export function defaultSettings(): Settings {
  const ember = PRESETS[0];
  return {
    preset: ember.id,
    accent: ember.accent,
    chromeBg: ember.chromeBg,
    chromeFg: ember.chromeFg,
    hotspot: ember.hotspot,
    font: "Outfit",
    radius: 16,
    opacity: 0.78,
    blur: 18,
    uiScale: 1,
    showCarousel: true,
    carouselPosition: "bottom",
    carouselStyle: "thumbs",
    showLogo: true,
    logoText: "SFERA",
    logoImage: "",
    showAbout: false,
    aboutLabel: "Об аудитории",
    aboutTitle: "Об аудитории",
    aboutBody: "Короткий рассказ о пространстве: что здесь смотреть и куда идти дальше.",
    showHotspots: true,
    showHotspotLabels: true,
    hotspotScale: 1,
    hotspotShape: "dot",
    showMap: false,
    mapImage: "",
    autoRotate: false,
    autoRotateSpeed: 2,
    northOffset: 0,
    minHfov: 50,
    maxHfov: 120,
    fadeMs: 700,
    showAudio: false,
    audioData: "",
    audioVolume: 0.7,
    showInfoCard: true,
    showCompass: true,
    showTitle: true,
    showProgress: true,
    showSplash: false,
    splashTitle: "Виртуальный тур",
    splashText: "Осмотритесь. Точки на панораме открывают истории и переходы.",
    splashButton: "Начать",
    showFullscreen: true,
    showNav: true,
    gyro: false,
    loadingText: "Открываем тур",
    exportQuality: "balanced",
  };
}

export function emptyProject(name = "Новый тур"): Project {
  return { version: 2, name, settings: defaultSettings(), scenes: [], activeSceneId: null };
}

export function hex(value: string, fallback: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

export function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function safeUrl(url: string): string {
  const t = url.trim();
  if (/^https?:\/\//i.test(t) || /^mailto:/i.test(t)) return t;
  return "";
}

export function fontStack(font: TourFont): string {
  if (font === "Literata") return '"Literata", Georgia, serif';
  if (font === "Unbounded") return '"Unbounded", "Outfit", sans-serif';
  if (font === "Manrope") return '"Manrope", "Outfit", sans-serif';
  return '"Outfit", sans-serif';
}

export function applyPreset(settings: Settings, id: string): Settings {
  const preset = PRESETS.find((item) => item.id === id);
  if (!preset) return { ...settings, preset: "custom" };
  return {
    ...settings,
    preset: preset.id,
    accent: preset.accent,
    chromeBg: preset.chromeBg,
    chromeFg: preset.chromeFg,
    hotspot: preset.hotspot,
  };
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asKind(value: unknown): HotspotKind {
  if (value === "link" || value === "scene" || value === "info") return value;
  return "info";
}

function parseHotspot(raw: unknown): Hotspot | null {
  if (!raw || typeof raw !== "object") return null;
  const h = raw as Record<string, unknown>;
  const kind = asKind(h.kind ?? h.type);
  return {
    id: str(h.id, uid()),
    pitch: num(h.pitch, 0),
    yaw: num(h.yaw, 0),
    kind,
    title: str(h.title, str(h.text, "Точка")),
    body: str(h.body, str(h.description, "")),
    url: str(h.url, str(h.URL, "")),
    targetSceneId: str(h.targetSceneId, str(h.targetScene, str(h.sceneId, ""))),
  };
}

function parseScene(raw: unknown): Scene | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const imageData = str(s.imageData, str(s.src, ""));
  if (!imageData) return null;
  const hotspots = Array.isArray(s.hotspots)
    ? s.hotspots.map(parseHotspot).filter((item): item is Hotspot => item !== null)
    : [];
  return {
    id: str(s.id, uid()),
    name: str(s.name, "Сцена"),
    description: str(s.description, ""),
    imageData,
    pitch: num(s.pitch, num(s.initialPitch, 0)),
    yaw: num(s.yaw, num(s.initialYaw, 0)),
    hfov: clamp(num(s.hfov, num(s.initialHfov, 100)), 50, 120),
    hotspots,
    mapX: typeof s.mapX === "number" ? clamp(s.mapX, 0, 1) : null,
    mapY: typeof s.mapY === "number" ? clamp(s.mapY, 0, 1) : null,
  };
}

export function parseProject(raw: unknown): Project | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.scenes)) return null;
  const base = defaultSettings();
  const incoming = (o.settings && typeof o.settings === "object" ? o.settings : {}) as Record<string, unknown>;
  const font = FONTS.includes(incoming.font as TourFont) ? (incoming.font as TourFont) : base.font;
  const position = (["bottom", "top", "left", "right"] as CarouselPosition[]).includes(
    incoming.carouselPosition as CarouselPosition,
  )
    ? (incoming.carouselPosition as CarouselPosition)
    : incoming.carouselPosition === "side"
      ? "left"
      : base.carouselPosition;
  const quality: ExportQuality =
    incoming.exportQuality === "high" || incoming.exportQuality === "light"
      ? incoming.exportQuality
      : incoming.exportQuality === "low"
        ? "light"
        : incoming.exportQuality === "medium"
          ? "balanced"
          : "balanced";

  const settings: Settings = {
    ...base,
    preset: str(incoming.preset, base.preset),
    accent: hex(str(incoming.accent, str(incoming.primaryColor, base.accent)), base.accent),
    chromeBg: hex(str(incoming.chromeBg, str(incoming.bgColor, base.chromeBg)), base.chromeBg),
    chromeFg: hex(str(incoming.chromeFg, base.chromeFg), base.chromeFg),
    hotspot: hex(str(incoming.hotspot, str(incoming.primaryColor, base.hotspot)), base.hotspot),
    font,
    radius: clamp(num(incoming.radius, base.radius), 0, 32),
    opacity: clamp(num(incoming.opacity, num(incoming.uiOpacity, base.opacity)), 0.35, 1),
    blur: clamp(num(incoming.blur, base.blur), 0, 40),
    uiScale: clamp(num(incoming.uiScale, base.uiScale), 0.8, 1.25),
    showCarousel: bool(incoming.showCarousel, base.showCarousel),
    carouselPosition: position,
    carouselStyle: incoming.carouselStyle === "titles" ? "titles" : "thumbs",
    showLogo: bool(incoming.showLogo, base.showLogo),
    logoText: str(incoming.logoText, base.logoText),
    logoImage: str(incoming.logoImage, ""),
    showAbout: bool(incoming.showAbout, base.showAbout),
    aboutLabel: str(incoming.aboutLabel, base.aboutLabel),
    aboutTitle: str(incoming.aboutTitle, base.aboutTitle),
    aboutBody: str(incoming.aboutBody, base.aboutBody),
    showHotspots: bool(incoming.showHotspots, base.showHotspots),
    showHotspotLabels: bool(incoming.showHotspotLabels, base.showHotspotLabels),
    hotspotScale: clamp(num(incoming.hotspotScale, base.hotspotScale), 0.6, 1.8),
    hotspotShape: (["dot", "ring", "diamond"] as HotspotShape[]).includes(incoming.hotspotShape as HotspotShape)
      ? (incoming.hotspotShape as HotspotShape)
      : base.hotspotShape,
    showMap: bool(incoming.showMap, bool(incoming.showMinimap, base.showMap)),
    mapImage: str(incoming.mapImage, ""),
    autoRotate: bool(incoming.autoRotate, base.autoRotate),
    autoRotateSpeed: clamp(num(incoming.autoRotateSpeed, base.autoRotateSpeed), 0.4, 12),
    northOffset: clamp(num(incoming.northOffset, base.northOffset), -180, 180),
    minHfov: clamp(num(incoming.minHfov, base.minHfov), 30, 100),
    maxHfov: clamp(num(incoming.maxHfov, base.maxHfov), 70, 140),
    fadeMs: clamp(num(incoming.fadeMs, base.fadeMs), 0, 2000),
    showAudio: bool(incoming.showAudio, Boolean(str(incoming.audioUrl, str(incoming.audioData, "")))),
    audioData: str(incoming.audioData, str(incoming.audioUrl, "")),
    audioVolume: clamp(num(incoming.audioVolume, base.audioVolume), 0, 1),
    showInfoCard: bool(incoming.showInfoCard, bool(incoming.showInfoCards, base.showInfoCard)),
    showCompass: bool(incoming.showCompass, base.showCompass),
    showTitle: bool(incoming.showTitle, base.showTitle),
    showProgress: bool(incoming.showProgress, base.showProgress),
    showSplash: bool(incoming.showSplash, base.showSplash),
    splashTitle: str(incoming.splashTitle, base.splashTitle),
    splashText: str(incoming.splashText, base.splashText),
    splashButton: str(incoming.splashButton, base.splashButton),
    showFullscreen: bool(incoming.showFullscreen, base.showFullscreen),
    showNav: bool(incoming.showNav, base.showNav),
    gyro: bool(incoming.gyro, base.gyro),
    loadingText: str(incoming.loadingText, base.loadingText),
    exportQuality: quality,
  };

  const scenes = o.scenes.map(parseScene).filter((scene): scene is Scene => scene !== null);
  const active = str(o.activeSceneId, scenes[0]?.id ?? "");
  return {
    version: 2,
    name: str(o.name, "Тур"),
    settings,
    scenes,
    activeSceneId: scenes.some((scene) => scene.id === active) ? active : (scenes[0]?.id ?? null),
  };
}

export function slugify(name: string): string {
  const value = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-|-$/g, "");
  return value || "tour";
}

export function explainLoadError(msg: unknown): string {
  const text = typeof msg === "string" ? msg : "";
  if (/could not be accessed|error loading|network|404/i.test(text)) {
    return "Файл панорамы не найден. Если на хостинг попал только index.html из ZIP, картинки остаются в папке panoramas. Скачайте один HTML — изображения уже внутри файла.";
  }
  if (/too big|maximum supported|webgl size/i.test(text)) {
    return "Панорама больше, чем тянет видеокарта этого устройства. Экспортируйте в качестве «Лёгкое».";
  }
  if (/no webgl/i.test(text)) {
    return "В этом браузере нет WebGL, панорама не запустится.";
  }
  return text ? `Не удалось показать панораму. ${text}` : "Не удалось показать панораму.";
}
