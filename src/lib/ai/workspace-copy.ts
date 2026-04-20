/** Plain-text clipboard copy — strips common markdown without looking “sanitized”. */
export function stripMarkdownForClipboard(md: string): string {
  let s = md;
  s = s.replace(/\r\n/g, "\n");
  s = s.replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*\n?/g, "").replace(/```/g, ""));
  s = s.replace(/`([^`]+)`/g, "$1");
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/\*([^*]+)\*/g, "$1");
  s = s.replace(/^#{1,6}\s+/gm, "");
  s = s.replace(/^\s*[-*]\s+/gm, "• ");
  s = s.replace(/^\s*\d+\.\s+/gm, "");
  s = s.replace(/\[(.*?)]\([^)]+\)/g, "$1");
  return s.replace(/\n{3,}/g, "\n\n").trim();
}
