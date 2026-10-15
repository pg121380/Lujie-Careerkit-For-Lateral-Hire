import { Buffer } from "node:buffer";

import { parseJsonRequest } from "@/lib/api-request";
import {
  createProjectMaterial,
  listProjectMaterials,
} from "@/lib/repository";
import {
  getMaterialUploadKind,
  materialInputSchema,
  MAX_MATERIAL_FILE_SIZE,
  type ProjectMaterial,
} from "@/lib/project-material";
import { extractPdfText, extractWordText } from "@/lib/resume-file-parsers";

export const runtime = "nodejs";

export async function GET() {
  const materials = await listProjectMaterials();
  return Response.json({ materials });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const material = await createFromUpload(request);
      return Response.json({ material }, { status: 201 });
    }

    const parsed = await parseJsonRequest(request, materialInputSchema);
    if (!parsed.success) return parsed.response;
    const material = await createProjectMaterial(parsed.data);
    return Response.json({ material }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "项目资料保存失败，请稍后重试。" },
      { status: 400 },
    );
  }
}

async function createFromUpload(request: Request): Promise<ProjectMaterial> {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("请选择要上传的项目资料文件。");
  if (file.size === 0) throw new Error("文件内容为空。");
  if (file.size > MAX_MATERIAL_FILE_SIZE) throw new Error("文件不能超过 10 MB。");

  const kind = getMaterialUploadKind(file.name);
  if (!kind) throw new Error("支持 txt、md、pdf、doc、docx 文件；图片与扫描件暂不支持。");

  const fileNameWithoutExtension = file.name.replace(/\.[^.]+$/, "").trim() || "未命名资料";
  const name = (formData.get("name") as string | null)?.trim() || fileNameWithoutExtension;

  let content = "";
  if (kind === "text") {
    content = (await file.text()).trim();
  } else {
    const buffer = Buffer.from(await file.arrayBuffer());
    content = kind === "pdf" ? await extractPdfText(buffer) : await extractWordText(buffer);
    content = content.trim();
  }
  if (content.replace(/\s/g, "").length < 10) {
    throw new Error("未能从该文件提取到有效文本；扫描件或图片暂不支持，请转换为文本后重试。");
  }

  return createProjectMaterial({
    name,
    content,
    sourceFileName: file.name,
    sourceKind: kind,
  });
}
