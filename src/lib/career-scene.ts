import { z } from "zod";

/** 求职场景：campus = 校招/实习；experienced = 社招（有工作经验）。 */
export const CAREER_SCENES = ["campus", "experienced"] as const;

export type CareerScene = (typeof CAREER_SCENES)[number];

export const DEFAULT_CAREER_SCENE: CareerScene = "campus";

export const careerSceneSchema = z.enum(CAREER_SCENES);

/** 容错归一化：非法或缺失值回退到默认场景，老数据库行无需迁移即可安全读取。 */
export function normalizeCareerScene(value: string | null | undefined): CareerScene {
  const parsed = careerSceneSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_CAREER_SCENE;
}
