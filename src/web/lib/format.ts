import type { Category } from "../../shared/types.js";

export const categoryLabels: Record<Category, string> = {
  ai: "AI",
  robotics: "机器人",
  chips: "芯片",
  internet: "互联网",
  bigtech: "大厂",
  research: "研究",
  business: "商业",
  policy: "政策",
  other: "其他"
};

export function formatDateTime(value?: string): string {
  if (!value) {
    return "暂无";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatDate(value?: string): string {
  if (!value) {
    return "暂无";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}
