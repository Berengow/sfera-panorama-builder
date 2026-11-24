import JSZip from "jszip";
import panoCss from "pannellum/build/pannellum.css?raw";
import panoJs from "pannellum/build/pannellum.js?raw";
import { chromeCss } from "@/lib/tour/chrome-css";
import { transcode } from "@/lib/tour/image";
import { safeUrl, slugify } from "@/lib/tour/project";
import type { ExportQuality, Project, Scene, Settings } from "@/lib/tour/types";

const QUALITY: Record<ExportQuality, { width: number; q: number }> = {
  high: { width: 4096, q: 0.86 },
  balanced: { width: 3072, q: 0.78 },
  light: { width: 2048, q: 0.66 },
};

export interface ExportProgress {
  label: string;
  ratio: number;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;");
}

function safeScript(source: string): string {
  return source.replace(/<\/script/gi, "<\\/script");
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

interface PayloadScene {
  id: string;
  name: string;
  description: string;
  src: string;
  pitch: number;
  yaw: number;
  hfov: number;
  mapX: number | null;
  mapY: number | null;
  hotspots: {
    id: string;
    pitch: number;
    yaw: number;
    kind: string;
    title: string;
    body: string;
    url: string;
    target: string;
  }[];
}

function payloadSettings(settings: Settings, audioSrc: string, logoImage: string, mapImage: string) {
  return {
    autoRotate: settings.autoRotate,
    autoRotateSpeed: settings.autoRotateSpeed,
    gyro: settings.gyro,
    showHotspots: settings.showHotspots,
    carouselStyle: settings.carouselStyle,
    audioVolume: settings.audioVolume,
    audioSrc,
    logoImage,
    mapImage,
    loadingText: settings.loadingText,
    northOffset: settings.northOffset,
    minHfov: settings.minHfov,
    maxHfov: settings.maxHfov,
    fadeMs: settings.fadeMs,
  };
}

function scenePayload(scene: Scene, src: string): PayloadScene {
  return {
    id: scene.id,
    name: scene.name,
    description: scene.description,
    src,
    pitch: scene.pitch,
    yaw: scene.yaw,
    hfov: scene.hfov,
    mapX: scene.mapX,
    mapY: scene.mapY,
    hotspots: scene.hotspots.map((hotspot) => ({
      id: hotspot.id,
      pitch: hotspot.pitch,
      yaw: hotspot.yaw,
      kind: hotspot.kind,
      title: hotspot.title,
      body: hotspot.body,
      url: safeUrl(hotspot.url),
      target: hotspot.targetSceneId,
    })),
  };
}

const RUNTIME = `
(function () {
  var tour = window.TOUR;
  var stage = document.getElementById("stage");
  var root = document.getElementById("panorama");
  var loading = document.getElementById("loading");
  var progress = document.getElementById("progress");
  var err = document.getElementById("error");
  var title = document.getElementById("scene-title");
  var info = document.getElementById("info-card");
  var card = document.getElementById("card");
  var about = document.getElementById("about");
  var audio = document.getElementById("audio");
  var needle = document.getElementById("needle");
  var splash = document.getElementById("splash");
  var logo = document.getElementById("logo-img");
  var mapImg = document.getElementById("map-img");
  var poster = document.getElementById("poster");
  if (logo && tour.settings.logoImage) logo.src = tour.settings.logoImage;
  if (mapImg && tour.settings.mapImage) mapImg.src = tour.settings.mapImage;
  if (audio && tour.settings.audioSrc) audio.src = tour.settings.audioSrc;
  if (poster && tour.scenes[0]) poster.src = tour.scenes[0].src;

  function sceneById(id) {
    for (var i = 0; i < tour.scenes.length; i++) if (tour.scenes[i].id === id) return tour.scenes[i];
    return tour.scenes[0];
  }
  function explain(msg) {
    msg = String(msg || "");
    if (/could not be accessed|Error loading|network/i.test(msg)) {
      return "Не удалось открыть файл панорамы. Для ZIP на сервере должны лежать index.html и папка panoramas рядом. Один HTML-файл этой проблемы не имеет.";
    }
    if (/too big|maximum supported/i.test(msg)) return "Панорама слишком большая для этого устройства. Экспортируйте тур в качестве «Лёгкое».";
    return "Не удалось показать панораму. " + msg;
  }

  var minHfov = Math.min(tour.settings.minHfov || 50, (tour.settings.maxHfov || 120) - 10);
  var maxHfov = Math.max(tour.settings.maxHfov || 120, minHfov + 10);
  var config = {
    default: {
      firstScene: tour.scenes[0].id,
      sceneFadeDuration: tour.settings.fadeMs == null ? 700 : tour.settings.fadeMs,
      autoLoad: true,
      showControls: true,
      showFullscreenCtrl: false,
      showZoomCtrl: true,
      escapeHTML: true,
      orientationOnByDefault: !!tour.settings.gyro,
      compass: false,
      minHfov: minHfov,
      maxHfov: maxHfov
    },
    scenes: {}
  };
  if (tour.settings.autoRotate) config.default.autoRotate = -Math.abs(tour.settings.autoRotateSpeed || 2);

  function tip(el, meta) {
    var label = document.createElement("span");
    label.className = "hs-label";
    label.textContent = meta.title || "Точка";
    el.appendChild(label);
  }
  function openCard(meta) {
    if (!card) return;
    card.hidden = false;
    card.replaceChildren();
    var h = document.createElement("h3");
    h.textContent = meta.title || "Точка";
    card.appendChild(h);
    if (meta.body) {
      var p = document.createElement("p");
      p.textContent = meta.body;
      card.appendChild(p);
    }
    if (meta.kind === "link" && meta.url) {
      var a = document.createElement("a");
      a.href = meta.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "Открыть ссылку";
      card.appendChild(a);
    }
    var close = document.createElement("button");
    close.type = "button";
    close.className = "ghost";
    close.textContent = "Закрыть";
    close.onclick = function () { card.hidden = true; };
    card.appendChild(close);
  }
  function onHotspot(_ev, meta) {
    if (!meta || meta.kind === "scene") return;
    openCard(meta);
  }

  tour.scenes.forEach(function (scene) {
    var hotSpots = [];
    if (tour.settings.showHotspots !== false) {
      (scene.hotspots || []).forEach(function (h) {
        var meta = { id: h.id, kind: h.kind, title: h.title, body: h.body, url: h.url, target: h.target };
        var item = {
          pitch: h.pitch, yaw: h.yaw,
          type: h.kind === "scene" && h.target ? "scene" : "info",
          text: h.title || "Точка",
          cssClass: "sfera-hs sfera-hs-" + (h.kind || "info"),
          createTooltipFunc: tip,
          createTooltipArgs: meta,
          clickHandlerFunc: onHotspot,
          clickHandlerArgs: meta
        };
        if (h.kind === "scene" && h.target) item.sceneId = h.target;
        hotSpots.push(item);
      });
    }
    config.scenes[scene.id] = {
      type: "equirectangular",
      panorama: scene.src,
      pitch: scene.pitch || 0,
      yaw: scene.yaw || 0,
      hfov: scene.hfov || 100,
      hotSpots: hotSpots
    };
  });

  var viewer = pannellum.viewer(root, config);
  var box = document.getElementById("carousel-items");
  if (box) {
    tour.scenes.forEach(function (scene) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tour-item" + (tour.settings.carouselStyle === "titles" ? " titles" : "");
      b.setAttribute("data-scene", scene.id);
      b.title = scene.name || "";
      if (tour.settings.carouselStyle === "titles") b.textContent = scene.name || "Сцена";
      else {
        var img = document.createElement("img");
        img.alt = "";
        img.src = scene.src;
        b.appendChild(img);
        var cap = document.createElement("span");
        cap.className = "cap";
        cap.textContent = scene.name || "Сцена";
        b.appendChild(cap);
      }
      b.onclick = function () { viewer.loadScene(scene.id, scene.pitch, scene.yaw, scene.hfov); };
      box.appendChild(b);
    });
  }
  var dots = document.getElementById("map-dots");
  if (dots) {
    tour.scenes.forEach(function (scene) {
      if (scene.mapX == null || scene.mapY == null) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "dot";
      b.setAttribute("data-dot", scene.id);
      b.style.left = (scene.mapX * 100) + "%";
      b.style.top = (scene.mapY * 100) + "%";
      b.onclick = function (e) { e.stopPropagation(); viewer.loadScene(scene.id, scene.pitch, scene.yaw, scene.hfov); };
      dots.appendChild(b);
    });
  }

  function showScene(id) {
    var scene = sceneById(id);
    if (!scene) return;
    if (title) title.textContent = scene.name || "";
    if (info) {
      info.textContent = scene.description || "";
      info.hidden = !scene.description;
    }
    document.querySelectorAll("[data-scene]").forEach(function (el) {
      el.classList.toggle("active", el.getAttribute("data-scene") === id);
    });
    document.querySelectorAll("[data-dot]").forEach(function (el) {
      el.classList.toggle("active", el.getAttribute("data-dot") === id);
    });
  }
  viewer.on("load", function () {
    if (loading) loading.hidden = true;
    if (progress) progress.classList.add("done");
    if (err) err.hidden = true;
    if (poster) poster.style.visibility = "hidden";
    if (stage) stage.classList.add("is-live");
  });
  viewer.on("error", function (msg) {
    if (loading) loading.hidden = true;
    if (poster) poster.style.visibility = "visible";
    if (err) { err.hidden = false; err.textContent = explain(msg); }
  });
  viewer.on("scenechange", function (id) {
    showScene(id);
    if (card) card.hidden = true;
    var scene = sceneById(id);
    if (poster && scene && scene.src) poster.src = scene.src;
  });
  showScene(tour.scenes[0].id);

  var order = tour.scenes.map(function (s) { return s.id; });
  function step(dir) {
    var cur = viewer.getScene();
    var i = order.indexOf(cur);
    if (i < 0) i = 0;
    var next = order[(i + dir + order.length) % order.length];
    var scene = sceneById(next);
    viewer.loadScene(next, scene.pitch, scene.yaw, scene.hfov);
  }
  var prev = document.getElementById("prev");
  var next = document.getElementById("next");
  if (prev) prev.onclick = function () { step(-1); };
  if (next) next.onclick = function () { step(1); };
  document.addEventListener("keydown", function (e) {
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });
  var aboutBtn = document.getElementById("about-btn");
  if (aboutBtn && about) aboutBtn.onclick = function () { about.hidden = !about.hidden; };
  var aboutClose = document.getElementById("about-close");
  if (aboutClose && about) aboutClose.onclick = function () { about.hidden = true; };
  var fs = document.getElementById("fs");
  if (fs) fs.onclick = function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else stage.requestFullscreen();
  };
  function armAudio() {
    if (!audio || !audio.src) return;
    audio.volume = tour.settings.audioVolume == null ? 0.7 : Number(tour.settings.audioVolume);
    audio.play().catch(function () {});
  }
  var start = document.getElementById("splash-start");
  if (start && splash) start.onclick = function () { splash.hidden = true; armAudio(); };
  var audioBtn = document.getElementById("audio-btn");
  if (audioBtn) audioBtn.onclick = function () {
    if (!audio || !audio.src) return;
    if (audio.paused) { armAudio(); audioBtn.classList.add("on"); }
    else { audio.pause(); audioBtn.classList.remove("on"); }
  };
  if (!splash && audio && audio.src) {
    stage.addEventListener("pointerdown", function once() { armAudio(); stage.removeEventListener("pointerdown", once); });
  }
  if (needle) setInterval(function () {
    try { needle.style.transform = "rotate(" + (-viewer.getYaw() + (tour.settings.northOffset || 0)) + "deg)"; } catch (e) {}
  }, 120);
})();
`;

function shell(project: Project, scenes: PayloadScene[], audioSrc: string, logoImage: string, mapImage: string): string {
  const settings = project.settings;
  const payload = {
    settings: payloadSettings(settings, audioSrc, logoImage, mapImage),
    scenes,
  };
  const pos = settings.carouselPosition;
  const titleBlock = settings.showTitle ? `<div class="tour-title" id="scene-title"></div>` : "";
  const logo = settings.showLogo
    ? `<div class="tour-logo">${logoImage ? `<img id="logo-img" alt="" />` : ""}<span>${esc(settings.logoText || project.name)}</span></div>`
    : "";
  const aboutBtn = settings.showAbout
    ? `<button type="button" id="about-btn">${esc(settings.aboutLabel || "Об аудитории")}</button>`
    : "";
  const fullBtn = settings.showFullscreen
    ? `<button type="button" id="fs" aria-label="На весь экран">⛶</button>`
    : "";
  const compass = settings.showCompass
    ? `<div class="tour-compass" aria-hidden="true"><b>N</b><i id="needle"></i></div>`
    : "";
  const tools =
    aboutBtn || fullBtn || compass
      ? `<div class="tour-tools">${compass}${aboutBtn}${fullBtn}</div>`
      : "";
  const audioBtn = settings.showAudio ? `<button type="button" class="tour-audio" id="audio-btn">Звук</button>` : "";
  const info = settings.showInfoCard ? `<div class="tour-info hit" id="info-card" hidden></div>` : "";
  const prevBtn = settings.showNav
    ? `<button type="button" class="tour-step" id="prev" aria-label="Предыдущая сцена">‹</button>`
    : "";
  const nextBtn = settings.showNav
    ? `<button type="button" class="tour-step" id="next" aria-label="Следующая сцена">›</button>`
    : "";
  const carousel = settings.showCarousel
    ? `<div class="tour-carousel hit pos-${pos}${settings.carouselStyle === "titles" ? " titles" : ""}">${prevBtn}<div class="tour-items" id="carousel-items"></div>${nextBtn}</div>`
    : "";
  const map =
    settings.showMap && mapImage
      ? `<div class="tour-map hit" id="map"><img id="map-img" alt="" /><div id="map-dots"></div></div>`
      : "";
  const about = settings.showAbout
    ? `<aside class="tour-about hit" id="about" hidden><h3>${esc(settings.aboutTitle || settings.aboutLabel)}</h3><p>${esc(settings.aboutBody)}</p><button type="button" class="ghost" id="about-close">Закрыть</button></aside>`
    : "";
  const splash = settings.showSplash
    ? `<div class="tour-splash hit" id="splash"><h2>${esc(settings.splashTitle || project.name)}</h2><p>${esc(settings.splashText)}</p><button type="button" id="splash-start">${esc(settings.splashButton || "Начать")}</button></div>`
    : "";
  const progress = settings.showProgress ? `<div class="tour-progress" id="progress"></div>` : "";
  const fontHref =
    settings.font === "Literata"
      ? "https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,460;7..72,600&display=swap"
      : settings.font === "Unbounded"
        ? "https://fonts.googleapis.com/css2?family=Unbounded:wght@500;600&display=swap"
        : settings.font === "Manrope"
          ? "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap"
          : "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap";

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(project.name || "Тур")}</title>
<link rel="stylesheet" href="${fontHref}">
<style>
${safeScript(panoCss)}
${chromeCss(settings)}
html,body{margin:0;height:100%;background:#0e0c0a;}
#stage{height:100%;}
</style>
</head>
<body>
<div id="stage" class="tour shape-${settings.hotspotShape}">
  <img id="poster" class="tour-poster" alt="">
  ${progress}
  <div id="panorama" class="tour-pano"></div>
  <div class="tour-ui">
    ${logo}
    ${titleBlock}
    ${tools}
    ${audioBtn}
    ${info}
    ${carousel}
    ${map}
    <div class="tour-card hit" id="card" hidden></div>
    ${about}
    <div class="tour-loading" id="loading">${esc(settings.loadingText || "Открываем тур")}</div>
    <div class="tour-error hit" id="error" hidden></div>
    ${splash}
  </div>
  <audio id="audio" loop></audio>
</div>
<script>${safeScript(panoJs)}</script>
<script>window.TOUR=${safeJson(payload)};${RUNTIME}</script>
</body>
</html>`;
}

async function encodeScenes(
  scenes: Scene[],
  quality: ExportQuality,
  onProgress?: (progress: ExportProgress) => void,
): Promise<{ encoded: { dataUrl: string; blob: Blob }[]; scenes: Scene[] }> {
  const spec = QUALITY[quality];
  const encoded: { dataUrl: string; blob: Blob }[] = [];
  for (let i = 0; i < scenes.length; i++) {
    onProgress?.({ label: `Панорама ${i + 1} из ${scenes.length}`, ratio: i / Math.max(scenes.length, 1) });
    encoded.push(await transcode(scenes[i].imageData, spec.width, spec.q));
  }
  return { encoded, scenes };
}

async function sideImage(dataUrl: string): Promise<string> {
  if (!dataUrl) return "";
  if (!dataUrl.startsWith("data:image/")) return dataUrl;
  try {
    const encoded = await transcode(dataUrl, 1600, 0.82);
    return encoded.dataUrl;
  } catch {
    return dataUrl;
  }
}

export async function buildSingleHtml(project: Project, onProgress?: (progress: ExportProgress) => void): Promise<string> {
  if (project.scenes.length === 0) throw new Error("Добавьте хотя бы одну сцену");
  const { encoded } = await encodeScenes(project.scenes, project.settings.exportQuality, onProgress);
  onProgress?.({ label: "Собираем файл", ratio: 0.92 });
  const [logoImage, mapImage] = await Promise.all([
    sideImage(project.settings.logoImage),
    sideImage(project.settings.mapImage),
  ]);
  const scenes = project.scenes.map((scene, index) => scenePayload(scene, encoded[index].dataUrl));
  return shell(project, scenes, project.settings.audioData, logoImage, mapImage);
}

export async function buildZip(project: Project, onProgress?: (progress: ExportProgress) => void): Promise<Blob> {
  if (project.scenes.length === 0) throw new Error("Добавьте хотя бы одну сцену");
  const { encoded } = await encodeScenes(project.scenes, project.settings.exportQuality, onProgress);
  onProgress?.({ label: "Упаковываем сайт", ratio: 0.92 });
  const [logoImage, mapImage] = await Promise.all([
    sideImage(project.settings.logoImage),
    sideImage(project.settings.mapImage),
  ]);
  const scenes = project.scenes.map((scene, index) => scenePayload(scene, `./panoramas/${String(index + 1).padStart(2, "0")}.jpg`));
  const html = shell(project, scenes, project.settings.audioData, logoImage, mapImage);
  const zip = new JSZip();
  zip.file("index.html", html);
  zip.file(".nojekyll", "");
  zip.file(
    "README.txt",
    "Загрузите на хостинг ОБА пункта рядом друг с другом:\n- index.html\n- папку panoramas\n\nЕсли залить только index.html, панорамы не откроются.\nОдин HTML-файл из конструктора этой папки не требует.\n",
  );
  const folder = zip.folder("panoramas");
  encoded.forEach((file, index) => {
    folder?.file(`${String(index + 1).padStart(2, "0")}.jpg`, file.blob);
  });
  return zip.generateAsync({ type: "blob" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 4000);
}

export function projectFilename(project: Project, ext: string): string {
  return `${slugify(project.name)}.${ext}`;
}
