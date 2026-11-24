import { HALL_IMAGE, GALLERY_IMAGE, PLAN_IMAGE } from "@/lib/tour/demo-art";
import { emptyProject } from "@/lib/tour/project";
import type { Project } from "@/lib/tour/types";

const HALL = "demo-hall";
const GALLERY = "demo-gallery";

/** Stable first-run tour. Same bytes on the server and in the browser, so the studio is visible before WebGL. */
export function demoProject(): Project {
  const project = emptyProject("Демо-тур");
  project.settings.splashTitle = "Демо-тур";
  project.settings.showMap = true;
  project.settings.mapImage = PLAN_IMAGE;
  project.scenes = [
    {
      id: HALL,
      name: "Зал",
      description: "Первая сцена. Подписи точек видны сразу — клик открывает карточку.",
      imageData: HALL_IMAGE,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      mapX: 0.32,
      mapY: 0.62,
      hotspots: [
        {
          id: "demo-hall-info",
          pitch: -4,
          yaw: -40,
          kind: "info",
          title: "История зала",
          body: "Информационная точка. Этот текст видит гость тура.",
          url: "",
          targetSceneId: "",
        },
        {
          id: "demo-hall-next",
          pitch: -4,
          yaw: 28,
          kind: "scene",
          title: "В галерею",
          body: "",
          url: "",
          targetSceneId: GALLERY,
        },
      ],
    },
    {
      id: GALLERY,
      name: "Галерея",
      description: "Вторая сцена. Карусель и стрелки переключают залы без перезагрузки.",
      imageData: GALLERY_IMAGE,
      pitch: 0,
      yaw: 0,
      hfov: 100,
      mapX: 0.72,
      mapY: 0.38,
      hotspots: [
        {
          id: "demo-gallery-back",
          pitch: -4,
          yaw: -24,
          kind: "scene",
          title: "Обратно в зал",
          body: "",
          url: "",
          targetSceneId: HALL,
        },
        {
          id: "demo-gallery-note",
          pitch: -4,
          yaw: 36,
          kind: "info",
          title: "Заметка",
          body: "Сюда можно поставить ссылку, переход или короткий текст.",
          url: "",
          targetSceneId: "",
        },
      ],
    },
  ];
  project.activeSceneId = HALL;
  return project;
}
