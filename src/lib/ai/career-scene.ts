import type { CareerScene } from "../career-scene";

/**
 * 按求职场景集中维护 AI 提示词片段。输出 schema 与事实边界规则与场景无关；
 * 这里只切换人设、考察重点和要素清单。
 */

/** 模拟面试出题的面试官人设（system prompt）。 */
export function interviewQuestionPersona(scene: CareerScene): string {
  return scene === "experienced"
    ? "你是面向有工作经验候选人的社招模拟面试官，严格、注重事实与业务结果。只返回符合 schema 的 JSON。"
    : "你是面向国内大学生实习与校招的模拟面试官。只返回符合 schema 的 JSON。";
}

/** 模拟面试出题的场景考察重点（追加在出题指令中）。 */
export function interviewQuestionFocusRules(scene: CareerScene): string[] {
  return scene === "experienced"
    ? [
        "候选人是有工作经验的社招求职者：优先围绕真实工作经历出题。",
        "重点考察职责边界与个人贡献、业绩的量化与归因、方案取舍、跨团队影响、职级晋升逻辑、方法论沉淀。",
        "HR 类问题应覆盖离职原因与求职动机、期望薪资的沟通方式、职业连续性与稳定性、未来 1-3 年的发展规划。",
        "避免学生化提问，例如课程、绩点、毕业时间或可实习时长；仅当简历显示相关事实且 JD 要求时才涉及教育背景。",
      ]
    : [
        "候选人是国内实习/校招学生：优先围绕实习、课程项目、校园经历和可迁移能力出题。",
        "重点考察基础能力、学习能力、项目真实性与个人贡献、潜力与成长性。",
        "HR 类问题应覆盖求职偏好与稳定性、职业规划与成长性。",
      ];
}

/** 面试复盘教练人设（system prompt）。 */
export function interviewReportPersona(scene: CareerScene): string {
  return scene === "experienced"
    ? "你是严格但建设性的社招面试教练，关注经历与目标职级的匹配、owner 意识和业务结果表达。只返回符合 schema 的 JSON，不编造候选人经历或数据。"
    : "你是严格但建设性的校招面试教练。只返回符合 schema 的 JSON，不编造候选人经历或数据。";
}

/** 招呼语第一句硬匹配信息要素。 */
export function greetingFirstSentenceRules(scene: CareerScene): string[] {
  return scene === "experienced"
    ? [
        "第一句话先给招聘方最关心的硬匹配信息：当前在职状态、离职或交接周期、最快到岗时间、与 JD 对应的工作年限或方向等。在职状态、离职周期和到岗时间只能来自补充信息；工作年限和方向可以使用简历中的明确事实。没有这些信息时，第一句话直接写最强岗位匹配点。",
        "不要提及可实习时长、每周到岗天数或毕业时间等校园要素，除非用户在补充信息中明确要求。",
      ]
    : [
        "第一句话先给招聘方最关心的硬匹配信息：到岗时间、可实习时长、每周到岗天数、毕业时间或地点等。到岗时间、可实习时长和每周天数只能来自补充信息；毕业时间和地点可以使用简历中的明确事实。没有这些信息时，第一句话直接写最强岗位匹配点。",
      ];
}

/** 求职信的语气与结构要点补充。 */
export function coverLetterSceneRules(scene: CareerScene): string[] {
  return scene === "experienced"
    ? [
        "候选人是有工作经验的社招求职者：以连续的职业经历、量化业绩和职级晋升证据支撑匹配度，语气专业克制，避免学生腔和校园表述。",
      ]
    : [
        "候选人偏实习/校招：可围绕实习、课程项目与学习能力组织证据，突出潜力与成长性。",
      ];
}
