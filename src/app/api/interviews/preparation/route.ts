import { generateInterviewPreparationWithAI } from "@/lib/ai/interview-preparation-task";
import { createInterviewPreparationInputSchema } from "@/lib/interview-preparation";
import {
  clearInterviewPreparationRecords,
  createInterviewPreparationRecord,
  getCareerScene,
  getEffectiveAiRuntimeSettings,
} from "@/lib/repository";

import { interviewRouteError } from "../route-utils";

export const runtime = "nodejs";

export function GET() {
  return new Response(null, { status: 204 });
}

export async function POST(request: Request) {
  try {
    const input = createInterviewPreparationInputSchema.parse(await request.json());
    const [settings, scene] = await Promise.all([getEffectiveAiRuntimeSettings(), getCareerScene()]);
    const result = await generateInterviewPreparationWithAI(settings, { ...input, scene });
    if (result.source !== "ai") throw new Error(result.message);
    const record = await createInterviewPreparationRecord(input, result.data);
    return Response.json({
      record,
      message: result.message,
    }, { status: 201 });
  } catch (error) {
    return interviewRouteError(error);
  }
}

export async function DELETE() {
  try {
    return Response.json({ deletedCount: await clearInterviewPreparationRecords() });
  } catch (error) {
    return interviewRouteError(error);
  }
}
