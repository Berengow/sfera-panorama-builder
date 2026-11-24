import { useEffect, useRef, useState } from "react";
import { chromeCss } from "@/lib/tour/chrome-css";
import { explainLoadError, safeUrl } from "@/lib/tour/project";
import { useTour } from "@/lib/tour/store";
import type { HotspotMeta, PannellumApi, PannellumViewer, Project } from "@/lib/tour/types";
import { cn } from "@/components/builder/ui";

interface Cam {
  sceneId: string;
  pitch: number;
  yaw: number;
  hfov: number;
}

function signature(project: Project): string {
  const settings = project.settings;
  const gyro = settings.gyro ? "1" : "0";
  return [
    gyro,
    settings.minHfov,
    settings.maxHfov,
    settings.fadeMs,
    project.scenes
      .map((scene) =>
        [
          scene.id,
          scene.imageData.length,
          scene.imageData.slice(-32),
          scene.pitch.toFixed(2),
          scene.yaw.toFixed(2),
          scene.hfov.toFixed(1),
          scene.hotspots
            .map((hotspot) =>
              [hotspot.id, hotspot.pitch.toFixed(2), hotspot.yaw.toFixed(2), hotspot.kind, hotspot.title, hotspot.targetSceneId, hotspot.url].join("~"),
            )
            .join(","),
        ].join(":"),
      )
      .join("|"),
  ].join(";");
}

function buildConfig(project: Project, firstId: string, start: Cam | null, placeRef: { current: boolean }, edit: (id: string) => void, card: (meta: HotspotMeta) => void) {
  const scenes: Record<string, unknown> = {};
  for (const scene of project.scenes) {
    const resume = start && scene.id === firstId;
    scenes[scene.id] = {
      type: "equirectangular",
      panorama: scene.imageData,
      pitch: resume ? start.pitch : scene.pitch,
      yaw: resume ? start.yaw : scene.yaw,
      hfov: resume ? start.hfov : scene.hfov,
      hotSpots: scene.hotspots.map((hotspot) => {
        const meta: HotspotMeta = {
          id: hotspot.id,
          kind: hotspot.kind,
          title: hotspot.title || "Точка",
          body: hotspot.body,
          url: safeUrl(hotspot.url),
          target: hotspot.targetSceneId,
        };
        return {
          pitch: hotspot.pitch,
          yaw: hotspot.yaw,
          type: hotspot.kind === "scene" && hotspot.targetSceneId ? "scene" : "info",
          text: meta.title,
          sceneId: hotspot.kind === "scene" ? hotspot.targetSceneId || undefined : undefined,
          cssClass: `sfera-hs sfera-hs-${hotspot.kind}`,
          createTooltipFunc: (el: HTMLElement, args: HotspotMeta) => {
            el.dataset.sid = args.id;
            const label = document.createElement("span");
            label.className = "hs-label";
            label.textContent = args.title || "Точка";
            el.appendChild(label);
          },
          createTooltipArgs: meta,
          clickHandlerFunc: (_event: Event, args: HotspotMeta) => {
            if (placeRef.current) {
              edit(args.id);
              return;
            }
            if (args.kind !== "scene") card(args);
          },
          clickHandlerArgs: meta,
        };
      }),
    };
  }
  const settings = project.settings;
  const minHfov = Math.min(settings.minHfov, settings.maxHfov - 10);
  const maxHfov = Math.max(settings.maxHfov, minHfov + 10);
  return {
    default: {
      firstScene: firstId,
      sceneFadeDuration: settings.fadeMs,
      autoLoad: true,
      showFullscreenCtrl: false,
      showZoomCtrl: true,
      escapeHTML: true,
      orientationOnByDefault: settings.gyro,
      compass: false,
      minHfov,
      maxHfov,
      ...(settings.autoRotate ? { autoRotate: -Math.abs(settings.autoRotateSpeed) } : {}),
    },
    scenes,
  };
}

export function Preview({ onDropFiles }: { onDropFiles: (files: File[]) => void }) {
  const project = useTour((state) => state.project);
  const placeMode = useTour((state) => state.placeMode);
  const mapPlace = useTour((state) => state.mapPlace);
  const setActive = useTour((state) => state.setActive);
  const openCreate = useTour((state) => state.openCreate);
  const openEdit = useTour((state) => state.openEdit);
  const updateScene = useTour((state) => state.updateScene);
  const rememberView = useTour((state) => state.rememberView);
  const setPlaceMode = useTour((state) => state.setPlaceMode);

  const panoRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PannellumViewer | null>(null);
  const camRef = useRef<Cam | null>(null);
  const projectRef = useRef(project);
  projectRef.current = project;
  const placeRef = useRef(placeMode);
  placeRef.current = placeMode;
  const editRef = useRef(openEdit);
  editRef.current = openEdit;
  const createRef = useRef(openCreate);
  createRef.current = openCreate;
  const activeRef = useRef(setActive);
  activeRef.current = setActive;

  const [panoReady, setPanoReady] = useState(false);
  const [alive, setAlive] = useState(false);
  const [viewReady, setViewReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<HotspotMeta | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [splash, setSplash] = useState(project.settings.showSplash);
  const [yaw, setYaw] = useState(0);
  const [audioOn, setAudioOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const downRef = useRef<{ x: number; y: number } | null>(null);
  const prevSplash = useRef(project.settings.showSplash);

  const active = project.scenes.find((scene) => scene.id === project.activeSceneId) ?? project.scenes[0] ?? null;
  const settings = project.settings;
  const sig = signature(project);

  useEffect(() => {
    let dead = false;
    void Promise.all([
      import("pannellum/build/pannellum.js"),
      import("pannellum/build/pannellum.css"),
    ]).then(() => {
      if (!dead) setPanoReady(true);
    });
    return () => {
      dead = true;
    };
  }, []);

  useEffect(() => {
    const el = panoRef.current?.parentElement;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setAlive(el.clientWidth > 40 && el.clientHeight > 40);
      window.dispatchEvent(new Event("resize"));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (settings.showSplash && !prevSplash.current) setSplash(true);
    prevSplash.current = settings.showSplash;
  }, [settings.showSplash]);

  useEffect(() => {
    const el = panoRef.current;
    const current = projectRef.current;
    const scene = current.scenes.find((item) => item.id === current.activeSceneId) ?? current.scenes[0];
    if (!el || !alive || !panoReady || !scene) return;
    const api = (window as Window & { pannellum?: PannellumApi }).pannellum;
    if (!api) return;
    setError(null);
    setViewReady(false);
    let viewer: PannellumViewer;
    try {
      viewer = api.viewer(el, buildConfig(current, scene.id, camRef.current, placeRef, (id) => editRef.current(id), setCard));
    } catch (reason) {
      setError(explainLoadError(reason instanceof Error ? reason.message : reason));
      return;
    }
    viewerRef.current = viewer;
    const save = () => {
      try {
        camRef.current = {
          sceneId: viewer.getScene(),
          pitch: viewer.getPitch(),
          yaw: viewer.getYaw(),
          hfov: viewer.getHfov(),
        };
      } catch {
        /* viewer already gone */
      }
    };
    viewer.on("load", () => {
      setError(null);
      setViewReady(true);
    });
    viewer.on("error", (msg) => {
      setViewReady(false);
      setError(explainLoadError(msg));
    });
    viewer.on("scenechange", (id) => {
      save();
      setCard(null);
      if (typeof id === "string") activeRef.current(id);
    });
    viewer.on("mouseup", save);
    return () => {
      save();
      viewer.destroy();
      if (viewerRef.current === viewer) viewerRef.current = null;
    };
  }, [sig, alive, panoReady]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const id = project.activeSceneId;
    if (!viewer || !id) return;
    try {
      if (viewer.getScene() === id) return;
    } catch {
      return;
    }
    const scene = project.scenes.find((item) => item.id === id);
    if (!scene) return;
    viewer.loadScene(id, scene.pitch, scene.yaw, scene.hfov);
  }, [project.activeSceneId, project.scenes, sig]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (settings.autoRotate) viewer.startAutoRotate(-Math.abs(settings.autoRotateSpeed || 2));
    else viewer.stopAutoRotate();
  }, [settings.autoRotate, settings.autoRotateSpeed, sig]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const viewer = viewerRef.current;
      if (!viewer) return;
      try {
        setYaw(viewer.getYaw());
      } catch {
        /* ignore */
      }
    }, 140);
    return () => window.clearInterval(timer);
  }, [sig, alive]);

  useEffect(() => {
    const el = panoRef.current;
    if (!el) return;
    const down = (event: PointerEvent) => {
      downRef.current = { x: event.clientX, y: event.clientY };
    };
    const up = (event: PointerEvent) => {
      const start = downRef.current;
      downRef.current = null;
      if (!placeRef.current || !start || !viewerRef.current) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest(".pnlm-zoom-controls, .pnlm-hotspot-base, .sfera-hs")) return;
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) return;
      try {
        const [pitch, nextYaw] = viewerRef.current.mouseEventToCoords(event);
        createRef.current(pitch, nextYaw);
      } catch {
        /* coords unavailable */
      }
    };
    el.addEventListener("pointerdown", down, true);
    el.addEventListener("pointerup", up, true);
    return () => {
      el.removeEventListener("pointerdown", down, true);
      el.removeEventListener("pointerup", up, true);
    };
  }, [alive, sig]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function step(dir: -1 | 1) {
    if (!active) return;
    const index = project.scenes.findIndex((scene) => scene.id === active.id);
    const next = project.scenes[(index + dir + project.scenes.length) % project.scenes.length];
    if (next) setActive(next.id);
  }

  function toggleAudio() {
    const audio = audioRef.current;
    if (!audio || !settings.audioData) return;
    audio.volume = settings.audioVolume;
    if (audio.paused) {
      void audio.play().then(() => setAudioOn(true)).catch(() => setAudioOn(false));
    } else {
      audio.pause();
      setAudioOn(false);
    }
  }

  function fullscreen() {
    const node = panoRef.current?.closest(".tour");
    if (!node) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void node.requestFullscreen();
  }

  const tourClass = cn(
    "tour",
    "is-editor",
    `shape-${settings.hotspotShape}`,
    viewReady && "is-live",
    !settings.showHotspotLabels && "hide-labels",
    !settings.showHotspots && "hide-hs",
  );

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col bg-canvas"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const files = [...event.dataTransfer.files];
        if (files.length) onDropFiles(files);
      }}
    >
      <style>{chromeCss(settings)}</style>
      <div className="relative min-h-0 flex-1">
      {!active ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="font-display text-2xl tracking-tight">Пустой тур</p>
          <p className="max-w-sm text-sm text-muted">Перетащите сюда equirectangular JPEG или PNG — или добавьте сцены слева. Предпросмотр повторяет сайт, который скачается.</p>
        </div>
      ) : (
        <div className={cn(tourClass, "h-full")}>
          <img src={active.imageData} alt="" className="tour-poster" />
          <div ref={panoRef} className="tour-pano" />
          <div className="tour-ui">
            {settings.showProgress ? <div className={cn("tour-progress", !error && "done")} /> : null}
            {settings.showLogo ? (
              <div className="tour-logo">
                {settings.logoImage ? <img src={settings.logoImage} alt="" /> : null}
                <span>{settings.logoText || project.name}</span>
              </div>
            ) : null}
            {settings.showTitle ? <div className="tour-title">{active.name}</div> : null}
            {settings.showAbout || settings.showFullscreen || settings.showCompass ? (
              <div className="tour-tools">
                {settings.showCompass ? (
                  <div className="tour-compass" aria-hidden="true">
                    <b>N</b>
                    <i id="needle" style={{ transform: `rotate(${-(yaw - settings.northOffset)}deg)` }} />
                  </div>
                ) : null}
                {settings.showAbout ? (
                  <button type="button" onClick={() => setAboutOpen((open) => !open)}>
                    {settings.aboutLabel || "Об аудитории"}
                  </button>
                ) : null}
                {settings.showFullscreen ? (
                  <button type="button" onClick={fullscreen} aria-label="На весь экран">
                    <svg viewBox="0 0 24 24" className="mx-auto size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M8 4H4v4M16 4h4v4M4 16v4h4M20 16v4h-4" />
                    </svg>
                  </button>
                ) : null}
              </div>
            ) : null}
            {settings.showAudio ? (
              <button type="button" className={cn("tour-audio", audioOn && "on")} onClick={toggleAudio}>
                {settings.audioData ? (audioOn ? "Звук вкл" : "Звук") : "Нет файла"}
              </button>
            ) : null}
            {settings.showInfoCard ? (
              <div className="tour-info hit">{active.description || "Описание сцены появится здесь"}</div>
            ) : null}
            {settings.showCarousel ? (
              <div className={cn("tour-carousel hit", `pos-${settings.carouselPosition}`, settings.carouselStyle === "titles" && "titles")}>
                {settings.showNav ? (
                  <button type="button" className="tour-step" onClick={() => step(-1)} aria-label="Предыдущая сцена">
                    ‹
                  </button>
                ) : null}
                <div className="tour-items">
                  {project.scenes.map((scene) => (
                    <button
                      key={scene.id}
                      type="button"
                      className={cn("tour-item", settings.carouselStyle === "titles" && "titles", scene.id === active.id && "active")}
                      onClick={() => setActive(scene.id)}
                    >
                      {settings.carouselStyle === "titles" ? (
                        scene.name
                      ) : (
                        <>
                          <img src={scene.imageData} alt="" />
                          <span className="cap">{scene.name}</span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
                {settings.showNav ? (
                  <button type="button" className="tour-step" onClick={() => step(1)} aria-label="Следующая сцена">
                    ›
                  </button>
                ) : null}
              </div>
            ) : null}
            {settings.showMap ? (
              <div
                className={cn("tour-map hit", mapPlace && "placing")}
                onClick={(event) => {
                  if (!mapPlace || !active) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  updateScene(active.id, {
                    mapX: (event.clientX - rect.left) / rect.width,
                    mapY: (event.clientY - rect.top) / rect.height,
                  });
                }}
              >
                {settings.mapImage ? <img src={settings.mapImage} alt="" /> : <div className="tour-placeholder">Загрузите план этажа — затем кликните, чтобы поставить сцену</div>}
                {project.scenes.map((scene) =>
                  scene.mapX == null || scene.mapY == null ? null : (
                    <button
                      key={scene.id}
                      type="button"
                      className={cn("dot", scene.id === active.id && "active")}
                      style={{ left: `${scene.mapX * 100}%`, top: `${scene.mapY * 100}%` }}
                      onClick={(event) => {
                        event.stopPropagation();
                        setActive(scene.id);
                      }}
                      aria-label={scene.name}
                    />
                  ),
                )}
              </div>
            ) : null}
            {card ? (
              <div className="tour-card hit">
                <h3>{card.title}</h3>
                {card.body ? <p>{card.body}</p> : null}
                {card.kind === "link" && card.url ? (
                  <a href={card.url} target="_blank" rel="noreferrer">
                    Открыть ссылку
                  </a>
                ) : null}
                <button type="button" className="ghost" onClick={() => openEdit(card.id)}>
                  Изменить
                </button>
                <button type="button" className="ghost" onClick={() => setCard(null)}>
                  Закрыть
                </button>
              </div>
            ) : null}
            {aboutOpen && settings.showAbout ? (
              <aside className="tour-about hit">
                <h3>{settings.aboutTitle || settings.aboutLabel}</h3>
                <p>{settings.aboutBody}</p>
                <button type="button" className="ghost" onClick={() => setAboutOpen(false)}>
                  Закрыть
                </button>
              </aside>
            ) : null}
            {error ? <div className="tour-error hit">{error}</div> : null}
            {placeMode ? (
              <div className="tour-loading hit" style={{ top: "18%" }}>
                Кликните по панораме — точка появится с подписью
              </div>
            ) : null}
            {splash && settings.showSplash ? (
              <div className="tour-splash hit">
                <h2>{settings.splashTitle || project.name}</h2>
                <p>{settings.splashText}</p>
                <button type="button" onClick={() => setSplash(false)}>
                  {settings.splashButton || "Начать"}
                </button>
              </div>
            ) : null}
          </div>
          {settings.audioData ? <audio ref={audioRef} src={settings.audioData} loop /> : <audio ref={audioRef} loop />}
        </div>
      )}
      </div>
      {active ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-line bg-surface px-3 py-1.5">
            <button
              type="button"
              className={cn(
                "min-h-11 rounded-md px-3 text-sm",
                placeMode ? "bg-accent text-accent-ink" : "text-ink hover:bg-raised",
              )}
              onClick={() => setPlaceMode(!placeMode)}
            >
              {placeMode ? "Клик по сфере" : "Поставить точку"}
            </button>
            <button
              type="button"
              className="min-h-11 rounded-md px-3 text-sm text-ink hover:bg-raised"
              onClick={() => {
                const viewer = viewerRef.current;
                if (!viewer) return;
                rememberView(viewer.getPitch(), viewer.getYaw(), viewer.getHfov());
              }}
            >
              Запомнить ракурс
            </button>
            <span className="px-2 text-xs text-faint">yaw {yaw.toFixed(0)}°</span>
        </div>
      ) : null}
    </div>
  );
}
