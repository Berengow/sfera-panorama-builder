import { useTour } from "@/lib/tour/store";
import type { HotspotKind } from "@/lib/tour/types";
import { Button, Field, fieldClass } from "@/components/builder/ui";

export function HotspotDialog() {
  const draft = useTour((state) => state.draft);
  const scenes = useTour((state) => state.project.scenes);
  const activeId = useTour((state) => state.project.activeSceneId);
  const closeDraft = useTour((state) => state.closeDraft);
  const saveDraft = useTour((state) => state.saveDraft);
  const removeHotspot = useTour((state) => state.removeHotspot);

  if (!draft) return null;
  const others = scenes.filter((scene) => scene.id !== activeId);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-canvas/70 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-lg border border-line bg-surface p-4 shadow-xl">
        <h3 className="mb-3 text-base font-medium text-ink">{draft.mode === "create" ? "Новая точка" : "Точка"}</h3>
        <Field label="Тип">
          <select
            className={fieldClass}
            value={draft.kind}
            onChange={(event) => useTour.setState({ draft: { ...draft, kind: event.target.value as HotspotKind } })}
          >
            <option value="info">Текст</option>
            <option value="link">Ссылка</option>
            <option value="scene">Переход в сцену</option>
          </select>
        </Field>
        <Field label="Подпись">
          <input
            className={fieldClass}
            value={draft.title}
            onChange={(event) => useTour.setState({ draft: { ...draft, title: event.target.value } })}
          />
        </Field>
        {draft.kind === "info" || draft.kind === "link" ? (
          <Field label="Текст карточки">
            <textarea
              className={`${fieldClass} min-h-20`}
              value={draft.body}
              onChange={(event) => useTour.setState({ draft: { ...draft, body: event.target.value } })}
            />
          </Field>
        ) : null}
        {draft.kind === "link" ? (
          <Field label="Ссылка">
            <input
              className={fieldClass}
              placeholder="https://"
              value={draft.url}
              onChange={(event) => useTour.setState({ draft: { ...draft, url: event.target.value } })}
            />
          </Field>
        ) : null}
        {draft.kind === "scene" ? (
          <Field label="Куда перейти">
            {others.length === 0 ? (
              <p className="text-sm text-muted">Добавьте вторую сцену, чтобы связать переход.</p>
            ) : (
              <select
                className={fieldClass}
                value={draft.targetSceneId}
                onChange={(event) => useTour.setState({ draft: { ...draft, targetSceneId: event.target.value } })}
              >
                <option value="">Выберите сцену</option>
                {others.map((scene) => (
                  <option key={scene.id} value={scene.id}>
                    {scene.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        ) : null}
        <p className="mb-3 text-xs text-faint">
          pitch {draft.pitch.toFixed(1)} · yaw {draft.yaw.toFixed(1)}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            onClick={saveDraft}
            disabled={draft.kind === "scene" && !draft.targetSceneId}
          >
            Сохранить
          </Button>
          <Button onClick={closeDraft}>Отмена</Button>
          {draft.mode === "edit" && draft.id ? (
            <Button
              variant="danger"
              onClick={() => {
                if (draft.id) removeHotspot(draft.id);
              }}
            >
              Удалить точку
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
