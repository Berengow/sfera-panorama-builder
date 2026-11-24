export type HotspotKind = "info" | "link" | "scene";

export interface Hotspot {
  id: string;
  pitch: number;
  yaw: number;
  kind: HotspotKind;
  title: string;
  body: string;
  url: string;
  targetSceneId: string;
}

export interface Scene {
  id: string;
  name: string;
  description: string;
  imageData: string;
  pitch: number;
  yaw: number;
  hfov: number;
  hotspots: Hotspot[];
  mapX: number | null;
  mapY: number | null;
}

export type TourFont = "Outfit" | "Unbounded" | "Manrope" | "Literata";
export type CarouselPosition = "bottom" | "top" | "left" | "right";
export type CarouselStyle = "thumbs" | "titles";
export type HotspotShape = "dot" | "ring" | "diamond";
export type ExportQuality = "high" | "balanced" | "light";

export interface Settings {
  preset: string;
  accent: string;
  chromeBg: string;
  chromeFg: string;
  hotspot: string;
  font: TourFont;
  radius: number;
  opacity: number;
  blur: number;
  uiScale: number;

  showCarousel: boolean;
  carouselPosition: CarouselPosition;
  carouselStyle: CarouselStyle;

  showLogo: boolean;
  logoText: string;
  logoImage: string;

  showAbout: boolean;
  aboutLabel: string;
  aboutTitle: string;
  aboutBody: string;

  showHotspots: boolean;
  showHotspotLabels: boolean;
  hotspotScale: number;
  hotspotShape: HotspotShape;

  showMap: boolean;
  mapImage: string;

  autoRotate: boolean;
  autoRotateSpeed: number;
  northOffset: number;
  minHfov: number;
  maxHfov: number;
  fadeMs: number;

  showAudio: boolean;
  audioData: string;
  audioVolume: number;

  showInfoCard: boolean;
  showCompass: boolean;
  showTitle: boolean;
  showProgress: boolean;
  showSplash: boolean;
  splashTitle: string;
  splashText: string;
  splashButton: string;
  showFullscreen: boolean;
  showNav: boolean;
  gyro: boolean;
  loadingText: string;
  exportQuality: ExportQuality;
}

export interface Project {
  version: 2;
  name: string;
  settings: Settings;
  scenes: Scene[];
  activeSceneId: string | null;
}

export interface HotspotMeta {
  id: string;
  kind: HotspotKind;
  title: string;
  body: string;
  url: string;
  target: string;
}

export interface PannellumViewer {
  destroy: () => void;
  loadScene: (id: string, pitch?: number, yaw?: number, hfov?: number) => void;
  getPitch: () => number;
  getYaw: () => number;
  getHfov: () => number;
  getScene: () => string;
  mouseEventToCoords: (event: MouseEvent) => [number, number];
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  startAutoRotate: (speed?: number) => void;
  stopAutoRotate: () => void;
  isLoaded: () => boolean;
}

export interface PannellumApi {
  viewer: (el: HTMLElement, config: unknown) => PannellumViewer;
}
