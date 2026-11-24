import { create } from "zustand";
import { demoProject } from "@/lib/tour/demo";
import { readFile, transcode } from "@/lib/tour/image";
import { idbGet, idbSet } from "@/lib/tour/idb";
import { emptyProject, parseProject, uid } from "@/lib/tour/project";
import type { Hotspot, HotspotKind, Project, Scene, Settings } from "@/lib/tour/types";

export interface HotspotDraft {
  mode: "create" | "edit";
  id?: string;
  pitch: number;
  yaw: number;
  kind: HotspotKind;
  title: string;
  body: string;
  url: string;
  targetSceneId: string;
}

interface TourState {
  ready: boolean;
  persistError: boolean;
  savedAt: number | null;
  project: Project;
  placeMode: boolean;
  mapPlace: boolean;
  draft: HotspotDraft | null;
  hydrate: () => Promise<void>;
  setName: (name: string) => void;
  patchSettings: (patch: Partial<Settings>) => void;
  setActive: (id: string) => void;
  updateScene: (id: string, patch: Partial<Scene>) => void;
  removeScene: (id: string) => void;
  moveScene: (id: string, dir: -1 | 1) => void;
  reorder: (fromId: string, toId: string) => void;
  duplicateScene: (id: string) => void;
  addFiles: (files: File[]) => Promise<{ added: number; skipped: number }>;
  replaceImage: (id: string, file: File) => Promise<boolean>;
  rememberView: (pitch: number, yaw: number, hfov: number) => void;
  setPlaceMode: (value: boolean) => void;
  setMapPlace: (value: boolean) => void;
  openCreate: (pitch: number, yaw: number) => void;
  openEdit: (id: string) => void;
  closeDraft: () => void;
  saveDraft: () => void;
  removeHotspot: (id: string) => void;
  replaceProject: (project: Project) => void;
  resetProject: () => void;
}

function withScenes(project: Project, scenes: Scene[], activeSceneId = project.activeSceneId): Project {
  const active = scenes.some((scene) => scene.id === activeSceneId) ? activeSceneId : (scenes[0]?.id ?? null);
  return { ...project, scenes, activeSceneId: active };
}

export const useTour = create<TourState>((set, get) => ({
  ready: false,
  persistError: false,
  savedAt: null,
  project: demoProject(),
  placeMode: false,
  mapPlace: false,
  draft: null,

  hydrate: async () => {
    if (get().ready) return;
    const snapshot = get().project;
    try {
      const saved = await idbGet<unknown>("project");
      if (saved) {
        const parsed = parseProject(saved);
        if (parsed) {
          if (get().project === snapshot) set({ project: parsed });
          set({ ready: true, savedAt: Date.now() });
          return;
        }
      }
    } catch {
      /* first visit or blocked storage */
    }
    set({ ready: true });
    try {
      await idbSet("project", get().project);
    } catch {
      set({ persistError: true });
    }
  },

  setName: (name) => set({ project: { ...get().project, name } }),

  patchSettings: (patch) => {
    const project = get().project;
    const settings = { ...project.settings, ...patch };
    if (patch.accent || patch.chromeBg || patch.chromeFg || patch.hotspot) {
      if (!patch.preset) settings.preset = "custom";
    }
    set({ project: { ...project, settings } });
  },

  setActive: (id) => set({ project: { ...get().project, activeSceneId: id } }),

  updateScene: (id, patch) => {
    const project = get().project;
    set({
      project: {
        ...project,
        scenes: project.scenes.map((scene) => (scene.id === id ? { ...scene, ...patch, id: scene.id } : scene)),
      },
    });
  },

  removeScene: (id) => {
    const project = get().project;
    set({
      project: withScenes(
        project,
        project.scenes
          .filter((scene) => scene.id !== id)
          .map((scene) => ({
            ...scene,
            hotspots: scene.hotspots.map((hotspot) =>
              hotspot.targetSceneId === id ? { ...hotspot, targetSceneId: "", kind: hotspot.kind === "scene" ? "info" : hotspot.kind } : hotspot,
            ),
          })),
      ),
      draft: get().draft?.id && project.scenes.find((scene) => scene.id === id)?.hotspots.some((h) => h.id === get().draft?.id) ? null : get().draft,
    });
  },

  moveScene: (id, dir) => {
    const scenes = [...get().project.scenes];
    const index = scenes.findIndex((scene) => scene.id === id);
    const next = index + dir;
    if (index < 0 || next < 0 || next >= scenes.length) return;
    const [item] = scenes.splice(index, 1);
    scenes.splice(next, 0, item);
    set({ project: { ...get().project, scenes } });
  },

  reorder: (fromId, toId) => {
    const scenes = [...get().project.scenes];
    const from = scenes.findIndex((scene) => scene.id === fromId);
    const to = scenes.findIndex((scene) => scene.id === toId);
    if (from < 0 || to < 0 || from === to) return;
    const [item] = scenes.splice(from, 1);
    scenes.splice(to, 0, item);
    set({ project: { ...get().project, scenes } });
  },

  duplicateScene: (id) => {
    const project = get().project;
    const scene = project.scenes.find((item) => item.id === id);
    if (!scene) return;
    const copyId = uid();
    const copy: Scene = {
      ...scene,
      id: copyId,
      name: `${scene.name} копия`,
      hotspots: scene.hotspots.map((hotspot) => ({ ...hotspot, id: uid() })),
    };
    const scenes = [...project.scenes];
    const index = scenes.findIndex((item) => item.id === id);
    scenes.splice(index + 1, 0, copy);
    set({ project: { ...project, scenes, activeSceneId: copyId } });
  },

  addFiles: async (files) => {
    let added = 0;
    let skipped = 0;
    const created: Scene[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        skipped += 1;
        continue;
      }
      try {
        const raw = await readFile(file);
        const encoded = await transcode(raw, 4096, 0.82);
        created.push({
          id: uid(),
          name: file.name.replace(/\.[^.]+$/, "") || "Сцена",
          description: "",
          imageData: encoded.dataUrl,
          pitch: 0,
          yaw: 0,
          hfov: 100,
          hotspots: [],
          mapX: null,
          mapY: null,
        });
        added += 1;
      } catch {
        skipped += 1;
      }
    }
    created.sort((a, b) => a.name.localeCompare(b.name, "ru", { numeric: true }));
    if (created.length) {
      const project = get().project;
      const scenes = [...project.scenes, ...created];
      set({
        project: {
          ...project,
          scenes,
          activeSceneId: project.activeSceneId ?? created[0].id,
        },
      });
    }
    return { added, skipped };
  },

  replaceImage: async (id, file) => {
    try {
      const raw = await readFile(file);
      const encoded = await transcode(raw, 4096, 0.82);
      get().updateScene(id, { imageData: encoded.dataUrl });
      return true;
    } catch {
      return false;
    }
  },

  rememberView: (pitch, yaw, hfov) => {
    const id = get().project.activeSceneId;
    if (!id) return;
    get().updateScene(id, { pitch, yaw, hfov });
  },

  setPlaceMode: (value) => set({ placeMode: value, mapPlace: value ? false : get().mapPlace }),
  setMapPlace: (value) => set({ mapPlace: value, placeMode: value ? false : get().placeMode }),

  openCreate: (pitch, yaw) =>
    set({
      draft: {
        mode: "create",
        pitch,
        yaw,
        kind: "info",
        title: "Новая точка",
        body: "",
        url: "",
        targetSceneId: "",
      },
      placeMode: false,
    }),

  openEdit: (id) => {
    const scene = get().project.scenes.find((item) => item.hotspots.some((hotspot) => hotspot.id === id));
    const hotspot = scene?.hotspots.find((item) => item.id === id);
    if (!hotspot) return;
    set({
      draft: {
        mode: "edit",
        id: hotspot.id,
        pitch: hotspot.pitch,
        yaw: hotspot.yaw,
        kind: hotspot.kind,
        title: hotspot.title,
        body: hotspot.body,
        url: hotspot.url,
        targetSceneId: hotspot.targetSceneId,
      },
      placeMode: false,
    });
  },

  closeDraft: () => set({ draft: null }),

  saveDraft: () => {
    const { draft, project } = get();
    const sceneId = project.activeSceneId;
    if (!draft || !sceneId) return;
    const hotspot: Hotspot = {
      id: draft.id ?? uid(),
      pitch: draft.pitch,
      yaw: draft.yaw,
      kind: draft.kind,
      title: draft.title.trim() || "Точка",
      body: draft.body.trim(),
      url: draft.url.trim(),
      targetSceneId: draft.kind === "scene" ? draft.targetSceneId : "",
    };
    const scenes = project.scenes.map((scene) => {
      if (scene.id !== sceneId && draft.mode === "create") return scene;
      const owns = scene.hotspots.some((item) => item.id === hotspot.id);
      if (draft.mode === "edit") {
        if (!owns) return scene;
        return { ...scene, hotspots: scene.hotspots.map((item) => (item.id === hotspot.id ? hotspot : item)) };
      }
      if (scene.id !== sceneId) return scene;
      return { ...scene, hotspots: [...scene.hotspots, hotspot] };
    });
    set({ project: { ...project, scenes }, draft: null });
  },

  removeHotspot: (id) => {
    const project = get().project;
    set({
      project: {
        ...project,
        scenes: project.scenes.map((scene) => ({
          ...scene,
          hotspots: scene.hotspots.filter((hotspot) => hotspot.id !== id),
        })),
      },
      draft: get().draft?.id === id ? null : get().draft,
    });
  },

  replaceProject: (project) => set({ project, draft: null, placeMode: false, mapPlace: false }),
  resetProject: () => set({ project: emptyProject(), draft: null, placeMode: false, mapPlace: false }),
}));

let persistTimer = 0;
export function startAutosave() {
  return useTour.subscribe((state, prev) => {
    if (!state.ready || state.project === prev.project) return;
    window.clearTimeout(persistTimer);
    persistTimer = window.setTimeout(() => {
      void idbSet("project", useTour.getState().project)
        .then(() => useTour.setState({ savedAt: Date.now(), persistError: false }))
        .catch(() => useTour.setState({ persistError: true }));
    }, 500);
  });
}
