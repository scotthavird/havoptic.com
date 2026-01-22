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

export type ToolCategory = 'cli' | 'ide' | 'hybrid';

export interface ToolConfig {
  displayName: string;
  shortName: string;
  color: string;
  bgColor: string;
  hashtag: string;
  category: ToolCategory;
}

export const TOOL_CONFIG: Record<ToolId, ToolConfig> = {
  'claude-code': {
    displayName: 'Claude Code',
    shortName: 'Claude',
    color: 'text-claude',
    bgColor: 'bg-claude',
    hashtag: '#claudecode',
    category: 'cli',
  },
  'openai-codex': {
    displayName: 'OpenAI Codex CLI',
    shortName: 'Codex',
    color: 'text-codex',
    bgColor: 'bg-codex',
    hashtag: '#codexcli',
    category: 'cli',
  },
  'cursor': {
    displayName: 'Cursor',
    shortName: 'Cursor',
    color: 'text-cursor',
    bgColor: 'bg-cursor',
    hashtag: '#cursorai',
    category: 'ide',
  },
  'gemini-cli': {
    displayName: 'Gemini CLI',
    shortName: 'Gemini',
    color: 'text-gemini',
    bgColor: 'bg-gemini',
    hashtag: '#geminicli',
    category: 'cli',
  },
  'kiro': {
    displayName: 'Kiro CLI',
    shortName: 'Kiro',
    color: 'text-kiro',
    bgColor: 'bg-kiro',
    hashtag: '#kirocli',
    category: 'ide',
  },
  'github-copilot': {
    displayName: 'GitHub Copilot CLI',
    shortName: 'Copilot',
    color: 'text-copilot',
    bgColor: 'bg-copilot',
    hashtag: '#githubcopilot',
    category: 'hybrid',
  },
  'aider': {
    displayName: 'Aider',
    shortName: 'Aider',
    color: 'text-aider',
    bgColor: 'bg-aider',
    hashtag: '#aider',
    category: 'cli',
  },
  'windsurf': {
    displayName: 'Windsurf',
    shortName: 'Windsurf',
    color: 'text-windsurf',
    bgColor: 'bg-windsurf',
    hashtag: '#windsurf',
    category: 'ide',
  },
};
