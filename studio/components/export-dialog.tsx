import { useState } from "react";
import { toast } from "sonner";
import { buildSingleHtml, buildZip, downloadBlob, projectFilename, type ExportProgress } from "@/lib/tour/export";
import { useTour } from "@/lib/tour/store";
import type { ExportQuality } from "@/lib/tour/types";
import { Button } from "@/components/builder/ui";

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const project = useTour((state) => state.project);
  const patchSettings = useTour((state) => state.patchSettings);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const busy = progress !== null;

  async function run(kind: "html" | "zip") {
    setProgress({ label: "Готовим панорамы", ratio: 0.05 });
    try {
      if (kind === "html") {
        const html = await buildSingleHtml(project, setProgress);
        downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), projectFilename(project, "html"));
        toast.success("Один HTML скачан. Его можно залить на хостинг как index.html.");
      } else {
        const zip = await buildZip(project, setProgress);
        downloadBlob(zip, projectFilename(project, "zip"));
        toast.success("ZIP скачан. На хостинг нужны и index.html, и папка panoramas.");
      }
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Экспорт не собрался");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-canvas/70 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-lg border border-line bg-surface p-5">
        <h3 className="text-lg font-medium text-ink">Скачать сайт</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Один HTML надёжнее: панорамы лежат внутри файла. Ошибка «file could not be accessed» бывает, когда на хостинг попал index.html без папки panoramas.
        </p>
        <fieldset className="mt-4 space-y-2">
          <legend className="mb-2 text-xs text-muted">Качество</legend>
          {(
            [
              ["high", "Высокое, до 4096 px"],
              ["balanced", "Среднее, до 3072 px"],
              ["light", "Лёгкое, до 2048 px"],
            ] as [ExportQuality, string][]
          ).map(([value, label]) => (
            <label key={value} className="flex min-h-11 items-center gap-3 text-sm text-ink">
              <input
                type="radio"
                name="quality"
                checked={project.settings.exportQuality === value}
                onChange={() => patchSettings({ exportQuality: value })}
              />
              {label}
            </label>
          ))}
        </fieldset>
        {progress ? (
          <p className="mt-4 text-sm text-accent">
            {progress.label} · {Math.round(progress.ratio * 100)}%
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="primary" disabled={busy || project.scenes.length === 0} onClick={() => void run("html")}>
            Один HTML
          </Button>
          <Button disabled={busy || project.scenes.length === 0} onClick={() => void run("zip")}>
            ZIP с папкой
          </Button>
          <Button disabled={busy} onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  );
}
