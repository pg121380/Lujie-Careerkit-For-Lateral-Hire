import { z } from "zod";

import { generateMaterialDraftWithAI } from "@/lib/ai/material-draft";
import { parseJsonRequest } from "@/lib/api-request";
import { getCareerScene, getEffectiveAiRuntimeSettings, addMaterialGeneration } from "@/lib/repository";

export const runtime = "nodejs";

const generateSchema = z.object({
  targetRole: z.string().trim().max(500).optional().default(""),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const parsed = await parseJsonRequest(request, generateSchema);
  if (!parsed.success) return parsed.response;

  try {
    const { getProjectMaterial } = await import("@/lib/repository");
    const material = await getProjectMaterial(id);
    if (!material) return Response.json({ error: "找不到该项目资料。" }, { status: 404 });

    const [settings, scene] = await Promise.all([getEffectiveAiRuntimeSettings(), getCareerScene()]);
    if (!settings.enabled) {
      return Response.json({ error: "请先在设置中完成 AI Provider 与 API Key 配置。" }, { status: 503 });
    }

    const result = await generateMaterialDraftWithAI(settings, {
      materialName: material.name,
      content: material.content,
      targetRole: parsed.data.targetRole || undefined,
      scene,
    });
    if (result.source !== "ai") {
      return Response.json({ error: result.message }, { status: 503 });
    }

    const { generation } = await addMaterialGeneration(id, result.data);
    return Response.json({ material: await getProjectMaterial(id), generation }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "素材提炼失败，请稍后重试。" },
      { status: 500 },
    );
  }
}
