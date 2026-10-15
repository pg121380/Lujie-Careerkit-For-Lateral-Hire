import { describe, expect, it, vi } from "vitest";

import {
  buildMaterialDraftPrompt,
  generateMaterialDraftWithAI,
  truncateMaterialContent,
} from "./material-draft";
import type { EffectiveAiSettings } from "./settings";

vi.mock("./tasks", () => ({
  runAiObjectTask: vi.fn(),
}));

import { runAiObjectTask } from "./tasks";

const settings = { enabled: true } as EffectiveAiSettings;

describe("material draft AI task", () => {
  it("truncates long material content at the AI input budget", () => {
    const short = truncateMaterialContent("短内容");
    expect(short).toEqual({ text: "短内容", truncated: false });

    const long = truncateMaterialContent("a".repeat(35_000));
    expect(long.truncated).toBe(true);
    expect(long.text).toHaveLength(30_000);
  });

  it("includes facts boundary and target role in the prompt", () => {
    const prompt = buildMaterialDraftPrompt({
      materialName: "订单重构项目总结",
      content: "项目背景：重构到店订单服务……\n结果：峰值 QPS 提升 40%。",
      targetRole: "后端开发工程师",
    });

    expect(prompt).toContain("订单重构项目总结");
    expect(prompt).toContain("后端开发工程师");
    expect(prompt).toContain("峰值 QPS 提升 40%");
    expect(prompt).toContain("不得外推、平均化或夸大数字");
    expect(prompt).toContain("不得提升职责强度");
    expect(prompt).not.toContain("注意：资料过长");
  });

  it("marks truncation in the prompt for oversized materials", () => {
    const prompt = buildMaterialDraftPrompt({
      materialName: "长文档",
      content: "a".repeat(30_001),
    });

    expect(prompt).toContain("资料过长");
  });

  it("passes scene-specific emphasis to the system prompt", async () => {
    vi.mocked(runAiObjectTask).mockResolvedValue({
      source: "ai",
      data: {
        summary: "s",
        suggestedSection: "projects",
        item: { title: "t", subtitle: "", period: "", highlights: [], technologies: [], description: "" },
        missing: [],
        truncated: false,
      },
      message: "ok",
    } as never);

    await generateMaterialDraftWithAI(settings, {
      materialName: "项目总结",
      content: "内容",
      scene: "experienced",
    });

    const call = vi.mocked(runAiObjectTask).mock.calls[0][0];
    expect(call.system).toContain("社招");
  });
});
