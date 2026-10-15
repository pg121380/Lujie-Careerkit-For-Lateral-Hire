import { z } from "zod";

import type { ResumeContent } from "./types";

/** 上传解析支持的范围：本地可提取文本的文件类型。 */
export const MATERIAL_SOURCE_KINDS = ["text", "pdf", "word"] as const;

export type MaterialSourceKind = (typeof MATERIAL_SOURCE_KINDS)[number];

export const MAX_MATERIAL_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_MATERIAL_CONTENT_CHARS = 200_000;
/** 单次 AI 输入的资料文本上限，超出截断并在结果中提示。 */
export const MAX_MATERIAL_AI_INPUT_CHARS = 30_000;
/** 面试生成时最多附加的资料份数与总字符预算。 */
export const MAX_INTERVIEW_MATERIAL_COUNT = 3;
export const MAX_INTERVIEW_MATERIAL_TOTAL_CHARS = 60_000;

export const materialSourceKindSchema = z.enum(MATERIAL_SOURCE_KINDS);

export const materialGenerationItemSchema = z.object({
  title: z.string().trim().min(1).max(200),
  subtitle: z.string().trim().max(200).default(""),
  period: z.string().trim().max(120).default(""),
  highlights: z.array(z.string().trim().min(1).max(500)).max(10).default([]),
  technologies: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  description: z.string().trim().max(2000).default(""),
});

export const materialGenerationSchema = z.object({
  id: z.string().trim().min(1).max(80),
  createdAt: z.string().min(1),
  targetRole: z.string().trim().max(500).default(""),
  summary: z.string().trim().min(1).max(1000),
  suggestedSection: z.enum(["projects", "experiences", "internships"]),
  item: materialGenerationItemSchema,
  missing: z.array(z.string().trim().min(1).max(300)).max(8).default([]),
  truncated: z.boolean().default(false),
});

export type MaterialGenerationItem = z.infer<typeof materialGenerationItemSchema>;
export type MaterialGeneration = z.infer<typeof materialGenerationSchema>;
export type MaterialSuggestedSection = MaterialGeneration["suggestedSection"];

export const materialInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(MAX_MATERIAL_CONTENT_CHARS),
  sourceFileName: z.string().trim().max(300).default(""),
  sourceKind: materialSourceKindSchema.default("text"),
});

export type MaterialInput = z.infer<typeof materialInputSchema>;

export const materialUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  content: z.string().trim().min(1).max(MAX_MATERIAL_CONTENT_CHARS).optional(),
});

export type MaterialUpdate = z.infer<typeof materialUpdateSchema>;

export type ProjectMaterial = {
  id: string;
  name: string;
  sourceFileName: string;
  sourceKind: MaterialSourceKind;
  content: string;
  charCount: number;
  generations: MaterialGeneration[];
  createdAt: string;
  updatedAt: string;
};

/** 列表与选择器使用的摘要：不携带正文。 */
export type ProjectMaterialSummary = Omit<ProjectMaterial, "content"> & {
  preview: string;
};

export function normalizeSourceKind(kind: string): MaterialSourceKind {
  return materialSourceKindSchema.safeParse(kind).success ? (kind as MaterialSourceKind) : "text";
}

export function toMaterialSummary(material: ProjectMaterial): ProjectMaterialSummary {
  const { content, ...rest } = material;
  return { ...rest, preview: content.slice(0, 160) };
}

export function parseGenerations(value: unknown): MaterialGeneration[] {
  const parsed = z.array(materialGenerationSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function appendGeneration(
  generations: MaterialGeneration[],
  generation: Omit<MaterialGeneration, "id" | "createdAt">,
  existingIds: Set<string>,
): MaterialGeneration {
  const id = nextGenerationId(existingIds);
  return { ...generation, id, createdAt: new Date().toISOString() };
}

export function nextGenerationId(existingIds: Set<string>): string {
  let index = existingIds.size + 1;
  while (existingIds.has(`g-${index}`)) index += 1;
  return `g-${index}`;
}

/** 面试生成用：把选中资料裁剪为带预算的快照。 */
export function buildInterviewMaterialSnapshots(
  materials: Pick<ProjectMaterial, "name" | "content">[],
): { name: string; content: string }[] {
  const selected = materials.slice(0, MAX_INTERVIEW_MATERIAL_COUNT);
  const budget = Math.floor(MAX_INTERVIEW_MATERIAL_TOTAL_CHARS / Math.max(selected.length, 1));
  return selected.map((material) => ({
    name: material.name,
    content: material.content.slice(0, budget),
  }));
}

export const MATERIAL_UPLOAD_ACCEPT = ".txt,.md,.markdown,.pdf,.doc,.docx";

export function getMaterialUploadKind(fileName: string): MaterialSourceKind | null {
  const extension = fileName.toLowerCase().split(".").pop() ?? "";
  if (extension === "txt" || extension === "md" || extension === "markdown") return "text";
  if (extension === "pdf") return "pdf";
  if (extension === "doc" || extension === "docx") return "word";
  return null;
}

/**
 * 把提炼草稿合并为新的简历内容：新条目追加到建议模块的末尾。
 * 纯函数，不写库；返回值交给编辑器作为未保存状态展示，由用户确认后保存。
 */
export function applyGenerationToResume(
  resume: ResumeContent,
  generation: MaterialGeneration,
): ResumeContent {
  const highlights = [
    ...generation.item.highlights,
    ...(generation.item.technologies.length ? [generation.item.technologies.join("、")] : []),
    ...(generation.item.description.trim() ? [generation.item.description.trim()] : []),
  ];
  const { start, end } = splitPeriod(generation.item.period);
  if (generation.suggestedSection === "projects") {
    return {
      ...resume,
      projects: [
        ...resume.projects,
        {
          name: generation.item.title,
          role: generation.item.subtitle || generation.item.period,
          highlights,
        },
      ],
    };
  }
  const entry = {
    company: generation.item.title,
    role: generation.item.subtitle,
    start,
    end,
    highlights,
  };
  return generation.suggestedSection === "experiences"
    ? { ...resume, experiences: [...resume.experiences, entry] }
    : { ...resume, internships: [...resume.internships, entry] };
}

function splitPeriod(period: string): { start: string; end: string } {
 const match = period.match(/^(.+?)(?:[-–—至到~]\s*(.+))?$/);
  if (!match) return { start: period, end: "" };
  return { start: match[1].trim(), end: (match[2] ?? "").trim() };
}
