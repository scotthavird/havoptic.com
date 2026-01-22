export type ToolId = 'claude-code' | 'openai-codex' | 'cursor' | 'gemini-cli' | 'kiro' | 'github-copilot' | 'aider' | 'windsurf';

export interface Release {
  id: string;
  tool: ToolId;
  toolDisplayName: string;
  version: string;
  date: string;
  summary: string;
  fullNotes?: string;
  url: string;
  type: 'release' | 'prerelease';
  infographicUrl?: string;
  infographicUrl16x9?: string;
}

export interface ReleasesData {
  lastUpdated: string | null;
  releases: Release[];
}

export const TOOL_CONFIG: Record<ToolId, { displayName: string; color: string; bgColor: string; hashtag: string }> = {
  'claude-code': {
    displayName: 'Claude Code',
    color: 'text-claude',
    bgColor: 'bg-claude',
    hashtag: '#claudecode',
  },
  'openai-codex': {
    displayName: 'OpenAI Codex CLI',
    color: 'text-codex',
    bgColor: 'bg-codex',
    hashtag: '#codexcli',
  },
  'cursor': {
    displayName: 'Cursor',
    color: 'text-cursor',
    bgColor: 'bg-cursor',
    hashtag: '#cursorai',
  },
  'gemini-cli': {
    displayName: 'Gemini CLI',
    color: 'text-gemini',
    bgColor: 'bg-gemini',
    hashtag: '#geminicli',
  },
  'kiro': {
    displayName: 'Kiro CLI',
    color: 'text-kiro',
    bgColor: 'bg-kiro',
    hashtag: '#kirocli',
  },
  'github-copilot': {
    displayName: 'GitHub Copilot CLI',
    color: 'text-copilot',
    bgColor: 'bg-copilot',
    hashtag: '#githubcopilot',
  },
  'aider': {
    displayName: 'Aider',
    color: 'text-aider',
    bgColor: 'bg-aider',
    hashtag: '#aider',
  },
  'windsurf': {
    displayName: 'Windsurf',
    color: 'text-windsurf',
    bgColor: 'bg-windsurf',
    hashtag: '#windsurf',
  },
};
