import { useRef } from "react";
import { useTour } from "@/lib/tour/store";
import { PRESETS, applyPreset } from "@/lib/tour/project";
import { readFile, transcode } from "@/lib/tour/image";
import type { HotspotShape, TourFont } from "@/lib/tour/types";
import { Button, Field, Section, Toggle, fieldClass } from "@/components/builder/ui";
import { toast } from "sonner";

const FONTS: TourFont[] = ["Outfit", "Unbounded", "Manrope", "Literata"];

export function Inspector() {
  const project = useTour((state) => state.project);
  const patchSettings = useTour((state) => state.patchSettings);
  const updateScene = useTour((state) => state.updateScene);
  const replaceImage = useTour((state) => state.replaceImage);
  const removeScene = useTour((state) => state.removeScene);
  const openEdit = useTour((state) => state.openEdit);
  const removeHotspot = useTour((state) => state.removeHotspot);
  const mapPlace = useTour((state) => state.mapPlace);
  const setMapPlace = useTour((state) => state.setMapPlace);
  const replaceRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  const settings = project.settings;
  const scene = project.scenes.find((item) => item.id === project.activeSceneId) ?? null;

  async function takeImage(file: File | undefined, apply: (dataUrl: string) => void, max = 1600) {
    if (!file) return;
    try {
      const raw = await readFile(file);
      const encoded = await transcode(raw, max, 0.82);
      apply(encoded.dataUrl);
    } catch {
      toast.error("Этот файл не открылся. Нужен JPEG или PNG.");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-medium text-ink">Настройки тура</h2>
        <p className="text-xs text-faint">Всё, что включено, сразу видно в центре.</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section title="Сцена" open>
          {scene ? (
            <>
              <Field label="Название">
                <input className={fieldClass} value={scene.name} onChange={(event) => updateScene(scene.id, { name: event.target.value })} />
              </Field>
              <Field label="Описание на панораме">
                <textarea
                  className={`${fieldClass} min-h-20 resize-y`}
                  value={scene.description}
                  onChange={(event) => updateScene(scene.id, { description: event.target.value })}
                />
              </Field>
              <div className="mb-3 flex flex-wrap gap-2">
                <Button className="min-h-10" onClick={() => replaceRef.current?.click()}>
                  Заменить фото
                </Button>
                <Button variant="danger" className="min-h-10" onClick={() => removeScene(scene.id)}>
                  Удалить
                </Button>
              </div>
              <input
                ref={replaceRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  void replaceImage(scene.id, file).then((ok) => {
                    if (!ok) toast.error("Не получилось заменить панораму.");
                  });
                }}
              />
              <p className="mb-2 text-xs text-muted">Точки</p>
              {scene.hotspots.length === 0 ? (
                <p className="text-sm text-faint">Нажмите «Поставить точку» и кликните по сфере. Подпись появится сразу.</p>
              ) : (
                <ul className="space-y-1">
                  {scene.hotspots.map((hotspot) => (
                    <li key={hotspot.id} className="flex items-center gap-2 rounded-md bg-canvas px-2 py-1.5">
                      <button type="button" className="min-w-0 flex-1 truncate text-left text-sm text-ink" onClick={() => openEdit(hotspot.id)}>
                        {hotspot.title || "Точка"}
                        <span className="ml-2 text-xs text-faint">{hotspot.kind === "scene" ? "переход" : hotspot.kind === "link" ? "ссылка" : "текст"}</span>
                      </button>
                      <button type="button" className="text-xs text-danger" onClick={() => removeHotspot(hotspot.id)}>
                        Удалить
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">Выберите сцену слева.</p>
          )}
        </Section>

        <Section title="Модули" open>
          <Toggle checked={settings.showCarousel} onChange={(value) => patchSettings({ showCarousel: value })} label="Карусель сцен" />
          <Toggle checked={settings.showLogo} onChange={(value) => patchSettings({ showLogo: value })} label="Логотип" />
          <Toggle checked={settings.showAbout} onChange={(value) => patchSettings({ showAbout: value })} label="Кнопка «Об аудитории»" />
          <Toggle checked={settings.showHotspots} onChange={(value) => patchSettings({ showHotspots: value })} label="Хотспоты" />
          <Toggle checked={settings.showHotspotLabels} onChange={(value) => patchSettings({ showHotspotLabels: value })} label="Подписи точек" />
          <Toggle checked={settings.showMap} onChange={(value) => patchSettings({ showMap: value })} label="Мини-карта" />
          <Toggle checked={settings.showInfoCard} onChange={(value) => patchSettings({ showInfoCard: value })} label="Карточка описания" />
          <Toggle checked={settings.showCompass} onChange={(value) => patchSettings({ showCompass: value })} label="Компас" />
          <Toggle checked={settings.showTitle} onChange={(value) => patchSettings({ showTitle: value })} label="Название сцены" />
          <Toggle checked={settings.showNav} onChange={(value) => patchSettings({ showNav: value })} label="Стрелки сцен" />
          <Toggle checked={settings.showFullscreen} onChange={(value) => patchSettings({ showFullscreen: value })} label="Полный экран" />
          <Toggle checked={settings.showProgress} onChange={(value) => patchSettings({ showProgress: value })} label="Полоса загрузки" />
          <Toggle checked={settings.showSplash} onChange={(value) => patchSettings({ showSplash: value })} label="Заставка" />
          <Toggle checked={settings.showAudio} onChange={(value) => patchSettings({ showAudio: value })} label="Звук" />
          <Toggle checked={settings.autoRotate} onChange={(value) => patchSettings({ autoRotate: value })} label="Автоповорот" />
          <Toggle checked={settings.gyro} onChange={(value) => patchSettings({ gyro: value })} label="Гироскоп телефона" />
          {settings.autoRotate ? (
            <Field label={`Скорость ${settings.autoRotateSpeed.toFixed(1)}`}>
              <input
                type="range"
                min={0.4}
                max={12}
                step={0.2}
                value={settings.autoRotateSpeed}
                onChange={(event) => patchSettings({ autoRotateSpeed: Number(event.target.value) })}
                className="w-full accent-accent"
              />
            </Field>
          ) : null}
        </Section>

        <Section title="Оформление" open>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => patchSettings(applyPreset(settings, preset.id))}
                className={`rounded-md border px-2 py-2 text-left text-xs ${settings.preset === preset.id ? "border-accent" : "border-line"}`}
              >
                <span className="mb-1 flex gap-1">
                  <i className="size-3 rounded-full" style={{ background: preset.accent }} />
                  <i className="size-3 rounded-full" style={{ background: preset.chromeBg }} />
                </span>
                {preset.name}
              </button>
            ))}
          </div>
          <Color label="Акцент" value={settings.accent} onChange={(accent) => patchSettings({ accent })} />
          <Color label="Панели" value={settings.chromeBg} onChange={(chromeBg) => patchSettings({ chromeBg })} />
          <Color label="Текст" value={settings.chromeFg} onChange={(chromeFg) => patchSettings({ chromeFg })} />
          <Color label="Точки" value={settings.hotspot} onChange={(hotspot) => patchSettings({ hotspot })} />
          <Field label="Шрифт тура">
            <select className={fieldClass} value={settings.font} onChange={(event) => patchSettings({ font: event.target.value as TourFont })}>
              {FONTS.map((font) => (
                <option key={font}>{font}</option>
              ))}
            </select>
          </Field>
          <Field label={`Скругление ${settings.radius}px`}>
            <input type="range" min={0} max={32} value={settings.radius} onChange={(event) => patchSettings({ radius: Number(event.target.value) })} className="w-full accent-accent" />
          </Field>
          <Field label={`Плотность ${settings.opacity.toFixed(2)}`}>
            <input type="range" min={0.35} max={1} step={0.01} value={settings.opacity} onChange={(event) => patchSettings({ opacity: Number(event.target.value) })} className="w-full accent-accent" />
          </Field>
          <Field label={`Размытие ${settings.blur}px`}>
            <input type="range" min={0} max={40} value={settings.blur} onChange={(event) => patchSettings({ blur: Number(event.target.value) })} className="w-full accent-accent" />
          </Field>
          <Field label={`Размер точек ${settings.hotspotScale.toFixed(2)}`}>
            <input type="range" min={0.6} max={1.8} step={0.05} value={settings.hotspotScale} onChange={(event) => patchSettings({ hotspotScale: Number(event.target.value) })} className="w-full accent-accent" />
          </Field>
          <Field label="Форма точек">
            <select
              className={fieldClass}
              value={settings.hotspotShape}
              onChange={(event) => patchSettings({ hotspotShape: event.target.value as HotspotShape })}
            >
              <option value="dot">Круг</option>
              <option value="ring">Кольцо</option>
              <option value="diamond">Ромб</option>
            </select>
          </Field>
          <Field label={`Масштаб интерфейса ${settings.uiScale.toFixed(2)}`}>
            <input type="range" min={0.8} max={1.25} step={0.01} value={settings.uiScale} onChange={(event) => patchSettings({ uiScale: Number(event.target.value) })} className="w-full accent-accent" />
          </Field>
        </Section>

        <Section title="Камера">
          <Field label={`Переход ${settings.fadeMs} мс`}>
            <input type="range" min={0} max={1600} step={50} value={settings.fadeMs} onChange={(event) => patchSettings({ fadeMs: Number(event.target.value) })} className="w-full accent-accent" />
          </Field>
          <Field label={`Мин. зум ${settings.minHfov}°`}>
            <input type="range" min={30} max={90} value={settings.minHfov} onChange={(event) => patchSettings({ minHfov: Number(event.target.value) })} className="w-full accent-accent" />
          </Field>
          <Field label={`Макс. обзор ${settings.maxHfov}°`}>
            <input type="range" min={80} max={140} value={settings.maxHfov} onChange={(event) => patchSettings({ maxHfov: Number(event.target.value) })} className="w-full accent-accent" />
          </Field>
          <Field label={`Север компаса ${settings.northOffset.toFixed(0)}°`}>
            <input type="range" min={-180} max={180} value={settings.northOffset} onChange={(event) => patchSettings({ northOffset: Number(event.target.value) })} className="w-full accent-accent" />
          </Field>
        </Section>

        <Section title="Логотип">
          <Field label="Текст">
            <input className={fieldClass} value={settings.logoText} onChange={(event) => patchSettings({ logoText: event.target.value })} />
          </Field>
          <div className="flex gap-2">
            <Button className="min-h-10" onClick={() => logoRef.current?.click()}>
              Картинка
            </Button>
            {settings.logoImage ? (
              <Button variant="danger" className="min-h-10" onClick={() => patchSettings({ logoImage: "" })}>
                Убрать
              </Button>
            ) : null}
          </div>
          <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(event) => void takeImage(event.target.files?.[0], (logoImage) => patchSettings({ logoImage, showLogo: true }))} />
        </Section>

        <Section title="Об аудитории">
          <Field label="Кнопка">
            <input className={fieldClass} value={settings.aboutLabel} onChange={(event) => patchSettings({ aboutLabel: event.target.value, showAbout: true })} />
          </Field>
          <Field label="Заголовок">
            <input className={fieldClass} value={settings.aboutTitle} onChange={(event) => patchSettings({ aboutTitle: event.target.value, showAbout: true })} />
          </Field>
          <Field label="Текст">
            <textarea className={`${fieldClass} min-h-24`} value={settings.aboutBody} onChange={(event) => patchSettings({ aboutBody: event.target.value, showAbout: true })} />
          </Field>
        </Section>

        <Section title="Карусель">
          <Field label="Положение">
            <select className={fieldClass} value={settings.carouselPosition} onChange={(event) => patchSettings({ carouselPosition: event.target.value as typeof settings.carouselPosition, showCarousel: true })}>
              <option value="bottom">Снизу</option>
              <option value="top">Сверху</option>
              <option value="left">Слева</option>
              <option value="right">Справа</option>
            </select>
          </Field>
          <Field label="Вид">
            <select className={fieldClass} value={settings.carouselStyle} onChange={(event) => patchSettings({ carouselStyle: event.target.value as typeof settings.carouselStyle, showCarousel: true })}>
              <option value="thumbs">Миниатюры</option>
              <option value="titles">Названия</option>
            </select>
          </Field>
        </Section>

        <Section title="Карта">
          <div className="mb-3 flex gap-2">
            <Button className="min-h-10" onClick={() => mapRef.current?.click()}>
              Загрузить план
            </Button>
            {settings.mapImage ? (
              <Button variant="danger" className="min-h-10" onClick={() => patchSettings({ mapImage: "" })}>
                Убрать
              </Button>
            ) : null}
          </div>
          <Toggle checked={mapPlace} onChange={setMapPlace} label="Клик по плану ставит текущую сцену" />
          <input
            ref={mapRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => void takeImage(event.target.files?.[0], (mapImage) => patchSettings({ mapImage, showMap: true }), 1800)}
          />
        </Section>

        <Section title="Звук">
          <div className="mb-3 flex gap-2">
            <Button className="min-h-10" onClick={() => audioRef.current?.click()}>
              Файл
            </Button>
            {settings.audioData ? (
              <Button variant="danger" className="min-h-10" onClick={() => patchSettings({ audioData: "" })}>
                Убрать
              </Button>
            ) : null}
          </div>
          <Field label="Или ссылка на mp3">
            <input
              className={fieldClass}
              placeholder="https://"
              value={settings.audioData.startsWith("data:") ? "" : settings.audioData}
              onChange={(event) => patchSettings({ audioData: event.target.value, showAudio: true })}
            />
          </Field>
          <Field label={`Громкость ${Math.round(settings.audioVolume * 100)}%`}>
            <input type="range" min={0} max={1} step={0.01} value={settings.audioVolume} onChange={(event) => patchSettings({ audioVolume: Number(event.target.value) })} className="w-full accent-accent" />
          </Field>
          <input
            ref={audioRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              void readFile(file).then((audioData) => patchSettings({ audioData, showAudio: true })).catch(() => toast.error("Аудио не прочиталось."));
            }}
          />
        </Section>

        <Section title="Заставка">
          <Field label="Заголовок">
            <input className={fieldClass} value={settings.splashTitle} onChange={(event) => patchSettings({ splashTitle: event.target.value })} />
          </Field>
          <Field label="Текст">
            <textarea className={`${fieldClass} min-h-20`} value={settings.splashText} onChange={(event) => patchSettings({ splashText: event.target.value })} />
          </Field>
          <Field label="Кнопка">
            <input className={fieldClass} value={settings.splashButton} onChange={(event) => patchSettings({ splashButton: event.target.value })} />
          </Field>
          <Field label="Надпись загрузки">
            <input className={fieldClass} value={settings.loadingText} onChange={(event) => patchSettings({ loadingText: event.target.value })} />
          </Field>
        </Section>
      </div>
    </div>
  );
}

function Color({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <span className="text-xs text-muted">{label}</span>
      <input type="color" aria-label={label} value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#e4a04a"} onChange={(event) => onChange(event.target.value)} className="h-9 w-12 cursor-pointer rounded-md border border-line bg-transparent" />
    </div>
  );
}
