export type ToolId = 'claude-code' | 'openai-codex' | 'cursor' | 'gemini-cli';

export interface Release {
  id: string;
  tool: ToolId;
  toolDisplayName: string;
  version: string;
  date: string;
  summary: string;
  url: string;
  type: 'release' | 'prerelease';
}

export interface ReleasesData {
  lastUpdated: string | null;
  releases: Release[];
}

export const TOOL_CONFIG: Record<ToolId, { displayName: string; color: string; bgColor: string }> = {
  'claude-code': {
    displayName: 'Claude Code',
    color: 'text-claude',
    bgColor: 'bg-claude',
  },
  'openai-codex': {
    displayName: 'OpenAI Codex CLI',
    color: 'text-codex',
    bgColor: 'bg-codex',
  },
  'cursor': {
    displayName: 'Cursor',
    color: 'text-cursor',
    bgColor: 'bg-cursor',
  },
  'gemini-cli': {
    displayName: 'Gemini CLI',
    color: 'text-gemini',
    bgColor: 'bg-gemini',
  },
};
