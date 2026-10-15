import {
  generateInterviewQuestionPackWithAI,
  generateInterviewReportWithAI,
} from "./ai/interview-tasks";
import { createInterviewService } from "./interview-service";
import { getCareerScene, getEffectiveAiRuntimeSettings, interviewSessionRepository } from "./repository";

export const interviewService = createInterviewService({
  repository: interviewSessionRepository,
  async generateQuestions(input) {
    const [settings, scene] = await Promise.all([getEffectiveAiRuntimeSettings(), getCareerScene()]);
    const result = await generateInterviewQuestionPackWithAI(settings, {
      mode: input.mode,
      company: input.context.company,
      title: input.context.title,
      jd: input.context.jd,
      resume: input.context.resume,
      materials: input.context.materials,
      scene,
    });
    if (result.source !== "ai") throw new Error(result.message);
    return result.data;
  },
  async generateReport(session) {
    const [settings, scene] = await Promise.all([getEffectiveAiRuntimeSettings(), getCareerScene()]);
    const result = await generateInterviewReportWithAI(settings, {
      context: session.context,
      questions: session.questions,
      answers: session.answers,
      materials: session.context.materials,
      scene,
    });
    if (result.source !== "ai") throw new Error(result.message);
    return result.data;
  },
});
