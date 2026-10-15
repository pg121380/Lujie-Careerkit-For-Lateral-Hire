import { getCareerScene, updateCareerScene } from "@/lib/repository";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ careerScene: await getCareerScene() });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    return Response.json({ careerScene: await updateCareerScene(body?.careerScene) });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "求职场景保存失败。" },
      { status: 400 },
    );
  }
}

// 兼容部分部署环境/代理只放行 POST 的情况：POST 与 PATCH 等价。
export async function POST(request: Request) {
  return PATCH(request);
}
