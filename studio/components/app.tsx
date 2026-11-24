import { useEffect, useRef, useState } from "react";
import { Download, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { parseProject } from "@/lib/tour/project";
import { startAutosave, useTour } from "@/lib/tour/store";
import { ExportDialog } from "@/components/builder/export-dialog";
import { HotspotDialog } from "@/components/builder/hotspot-dialog";
import { Inspector } from "@/components/builder/inspector";
import { Preview } from "@/components/builder/preview";
import { Scenes } from "@/components/builder/scenes";
import { Button, Mark, cn } from "@/components/builder/ui";

type Pane = "scenes" | "tour" | "settings";

export function BuilderApp() {
  const ready = useTour((state) => state.ready);
  const persistError = useTour((state) => state.persistError);
  const savedAt = useTour((state) => state.savedAt);
  const name = useTour((state) => state.project.name);
  const project = useTour((state) => state.project);
  const hydrate = useTour((state) => state.hydrate);
  const setName = useTour((state) => state.setName);
  const addFiles = useTour((state) => state.addFiles);
  const replaceProject = useTour((state) => state.replaceProject);
  const resetProject = useTour((state) => state.resetProject);

  const [pane, setPane] = useState<Pane>("tour");
  const [exportOpen, setExportOpen] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const projectRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void hydrate();
    return startAutosave();
  }, [hydrate]);

  async function ingest(files: File[]) {
    const result = await addFiles(files);
    if (result.added) toast.success(result.added === 1 ? "Сцена добавлена" : `Сцен добавлено: ${result.added}`);
    if (result.skipped) toast.error("Часть файлов пропущена. Нужны JPEG, PNG или WebP.");
    setPane("tour");
  }

  function downloadProject() {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${name || "tour"}.sfera.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas text-ink">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-3">
        <Mark />
        <input
          aria-label="Название тура"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-faint"
        />
        <span className="hidden text-xs text-faint lg:inline">
          {persistError ? "Сохраните файл проекта" : !ready ? "Открываем черновик" : savedAt ? "Черновик в браузере" : ""}
        </span>
        {confirmNew ? (
          <span className="flex items-center gap-1 text-sm">
            <span className="text-muted">Очистить?</span>
            <Button className="min-h-10" variant="danger" onClick={() => { resetProject(); setConfirmNew(false); }}>
              Да
            </Button>
            <Button className="min-h-10" onClick={() => setConfirmNew(false)}>
              Нет
            </Button>
          </span>
        ) : (
          <Button className="min-h-10 px-2 sm:px-3" onClick={() => setConfirmNew(true)}>
            Новый
          </Button>
        )}
        <Button className="min-h-10 px-2 sm:px-3" onClick={downloadProject} aria-label="Скачать проект">
          <Download className="size-4 sm:hidden" />
          <span className="hidden sm:inline">Проект</span>
        </Button>
        <Button className="min-h-10 px-2 sm:px-3" onClick={() => projectRef.current?.click()} aria-label="Открыть проект">
          <FolderOpen className="size-4 sm:hidden" />
          <span className="hidden sm:inline">Открыть</span>
        </Button>
        <Button variant="primary" className="min-h-10 px-2 sm:px-3" onClick={() => setExportOpen(true)}>
          <span className="sm:hidden">Сайт</span>
          <span className="hidden sm:inline">Скачать сайт</span>
        </Button>
      </header>

      <div className="flex shrink-0 gap-1 border-b border-line bg-surface p-1 lg:hidden">
        {(
          [
            ["scenes", "Сцены"],
            ["tour", "Тур"],
            ["settings", "Настройки"],
          ] as [Pane, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPane(id)}
            className={cn("min-h-11 flex-1 rounded-md text-sm", pane === id ? "bg-accent text-accent-ink" : "text-muted")}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[300px_minmax(0,1fr)_360px]">
        <aside className={cn("h-full min-h-0", pane === "scenes" ? "flex" : "hidden", "lg:flex")}>
          <div className="h-full min-h-0 w-full">
            <Scenes onAdd={() => fileRef.current?.click()} />
          </div>
        </aside>
        <main className={cn("h-full min-h-0", pane === "tour" ? "flex" : "hidden", "lg:flex")}>
          <Preview onDropFiles={(files) => void ingest(files)} />
        </main>
        <aside className={cn("h-full min-h-0", pane === "settings" ? "flex" : "hidden", "lg:flex")}>
          <div className="min-h-0 w-full border-l border-line">
            <Inspector />
          </div>
        </aside>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = "";
          if (files.length) void ingest(files);
        }}
      />
      <input
        ref={projectRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          void file.text().then((text) => {
            try {
              const parsed = parseProject(JSON.parse(text));
              if (!parsed) {
                toast.error("Это не файл тура SFERA.");
                return;
              }
              replaceProject(parsed);
              toast.success("Проект открыт");
            } catch {
              toast.error("Файл не читается.");
            }
          });
        }}
      />
      <HotspotDialog />
      {exportOpen ? <ExportDialog onClose={() => setExportOpen(false)} /> : null}
    </div>
  );
}
