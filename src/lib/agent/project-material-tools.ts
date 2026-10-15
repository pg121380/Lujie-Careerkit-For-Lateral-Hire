import { z } from "zod";
import { listProjectMaterials, getProjectMaterial } from "@/lib/repository";
import { toMaterialSummary } from "@/lib/project-material";

export const projectMaterialSearchSchema = z.object({
  materialId: z.string().trim().min(1).max(120).optional().describe("Exact project-material ID from a previous search. Reads that material in full, ignoring search keywords. This is not a Job, resume or campus-record ID."),
  q: z.string().trim().max(120).default("").describe("Short keywords against material name, source file name and content. Use short terms, not a natural-language sentence."),
  page: z.number().int().min(1).max(10_000).default(1).describe("Search page, five summaries per page. Read by materialId for the full extracted text."),
});

export async function searchProjectMaterials(input: z.input<typeof projectMaterialSearchSchema>) {
  const query = projectMaterialSearchSchema.parse(input);
  const materials = await listProjectMaterials();
  const keywords = query.q.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const matches = keywords.length
    ? materials.filter((material) => {
        const haystack = `${material.name} ${material.sourceFileName} ${material.content}`.toLocaleLowerCase();
        return keywords.every((keyword) => haystack.includes(keyword));
      })
    : materials;
  const pageSize = 5;
  const pages = Math.max(1, Math.ceil(matches.length / pageSize));
  const page = Math.min(query.page, pages);
  if (query.materialId) {
    const material = await getProjectMaterial(query.materialId).catch(() => null);
    return {
      status: material ? "ok" as const : "not_found" as const,
      total: material ? 1 : 0,
      page: 1,
      pages: 1,
      hasMore: false,
      materials: material ? [{ id: material.id, name: material.name, sourceFileName: material.sourceFileName, charCount: material.charCount, content: material.content }] : [],
    };
  }
  return {
    status: "ok" as const,
    total: matches.length,
    page,
    pages,
    hasMore: page < pages,
    materials: matches.slice((page - 1) * pageSize, page * pageSize).map((material) => {
      const summary = toMaterialSummary(material);
      return {
        id: summary.id,
        name: summary.name,
        sourceFileName: summary.sourceFileName,
        charCount: summary.charCount,
        preview: summary.preview,
        draftCount: summary.generations.length,
        updatedAt: summary.updatedAt,
      };
    }),
  };
}
