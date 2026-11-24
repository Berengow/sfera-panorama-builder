import { ChevronDown, ChevronUp, Copy, Trash2 } from "lucide-react";
import { useTour } from "@/lib/tour/store";
import { Button, cn } from "@/components/builder/ui";

export function Scenes({ onAdd }: { onAdd: () => void }) {
  const scenes = useTour((state) => state.project.scenes);
  const activeId = useTour((state) => state.project.activeSceneId);
  const setActive = useTour((state) => state.setActive);
  const moveScene = useTour((state) => state.moveScene);
  const removeScene = useTour((state) => state.removeScene);
  const duplicateScene = useTour((state) => state.duplicateScene);
  const reorder = useTour((state) => state.reorder);

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-3">
        <h2 className="text-sm font-medium text-ink">Сцены <span className="text-faint">{scenes.length}</span></h2>
        <Button variant="primary" className="min-h-10 px-3" onClick={onAdd}>
          Добавить
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {scenes.length === 0 ? (
          <p className="px-2 py-6 text-sm text-muted">Пока пусто. JPEG или PNG, соотношение 2:1.</p>
        ) : (
          scenes.map((scene, index) => (
            <div
              key={scene.id}
              draggable
              onDragStart={(event) => event.dataTransfer.setData("text/plain", scene.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                reorder(event.dataTransfer.getData("text/plain"), scene.id);
              }}
              className={cn(
                "mb-1.5 flex items-center gap-2 rounded-md border px-2 py-2",
                scene.id === activeId ? "border-accent bg-raised" : "border-transparent hover:bg-raised",
              )}
            >
              <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setActive(scene.id)}>
                <img src={scene.imageData} alt="" className="h-11 w-16 shrink-0 rounded-sm object-cover" />
                <span className="min-w-0">
                  <span className="block truncate text-sm text-ink">{scene.name}</span>
                  <span className="text-xs text-faint">{scene.hotspots.length} точек</span>
                </span>
              </button>
              <div className="flex shrink-0 flex-col">
                <button type="button" className="text-faint hover:text-ink" aria-label="Выше" onClick={() => moveScene(scene.id, -1)} disabled={index === 0}>
                  <ChevronUp className="size-4" />
                </button>
                <button type="button" className="text-faint hover:text-ink" aria-label="Ниже" onClick={() => moveScene(scene.id, 1)} disabled={index === scenes.length - 1}>
                  <ChevronDown className="size-4" />
                </button>
              </div>
              <button type="button" className="text-faint hover:text-ink" aria-label="Дублировать" onClick={() => duplicateScene(scene.id)}>
                <Copy className="size-4" />
              </button>
              <button type="button" className="text-faint hover:text-danger" aria-label="Удалить сцену" onClick={() => removeScene(scene.id)}>
                <Trash2 className="size-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
