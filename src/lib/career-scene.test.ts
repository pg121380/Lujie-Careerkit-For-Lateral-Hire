import { describe, expect, it } from "vitest";

import { CAREER_SCENES, DEFAULT_CAREER_SCENE, normalizeCareerScene } from "./career-scene";

describe("career scene", () => {
  it("keeps valid scene values", () => {
    expect(normalizeCareerScene("campus")).toBe("campus");
    expect(normalizeCareerScene("experienced")).toBe("experienced");
  });

  it("falls back to the default for legacy or invalid values", () => {
    expect(normalizeCareerScene(undefined)).toBe(DEFAULT_CAREER_SCENE);
    expect(normalizeCareerScene(null)).toBe(DEFAULT_CAREER_SCENE);
    expect(normalizeCareerScene("")).toBe(DEFAULT_CAREER_SCENE);
    expect(normalizeCareerScene("student")).toBe(DEFAULT_CAREER_SCENE);
  });

  it("exposes the scene list used by settings UI", () => {
    expect(CAREER_SCENES).toEqual(["campus", "experienced"]);
  });
});
