import { parseJsonRequest } from "@/lib/api-request";
import {
  deleteMaterialGeneration,
  deleteProjectMaterial,
  getProjectMaterial,
  updateProjectMaterial,
} from "@/lib/repository";
import { materialUpdateSchema } from "@/lib/project-material";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const material = await getProjectMaterial(id);
  if (!material) return Response.json({ error: "找不到该项目资料。" }, { status: 404 });
  return Response.json({ material });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const parsed = await parseJsonRequest(request, materialUpdateSchema);
  if (!parsed.success) return parsed.response;
  try {
    const material = await updateProjectMaterial(id, parsed.data);
    return Response.json({ material });
  } catch {
    return Response.json({ error: "项目资料保存失败，请稍后重试。" }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const generationId = new URL(request.url).searchParams.get("generationId");
  try {
    if (generationId) {
      const material = await deleteMaterialGeneration(id, generationId);
      return Response.json({ material });
    }
    await deleteProjectMaterial(id);
    return Response.json({ deleted: true });
  } catch {
    return Response.json({ error: "删除失败，请稍后重试。" }, { status: 400 });
  }
}
