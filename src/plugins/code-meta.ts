/** 解析代码块 meta 字符串，例如 ```ts title="config.ts" */
export function parseCodeMeta(meta: string | undefined): { title?: string } {
  if (!meta) return {};
  const titleMatch = /title=(?:"([^"]*)"|'([^']*)'|(\S+))/.exec(meta);
  const title = titleMatch?.[1] ?? titleMatch?.[2] ?? titleMatch?.[3];
  return title ? { title } : {};
}
