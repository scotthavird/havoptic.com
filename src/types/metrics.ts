import type { ToolId } from './release';

export interface GitHubStats {
  stars: number;
  forks: number;
  openIssues: number;
  contributors: number;
  lastCommitAt: string;
  starsThisWeek: number;
  starsThisMonth: number;
}

export interface NpmStats {
  weeklyDownloads: number;
  monthlyDownloads: number;
  totalDownloads: number;
  downloadsTrend: number; // percentage change week over week
}

export interface ToolMetrics {
  toolId: ToolId;
  github?: GitHubStats;
  npm?: NpmStats;
  fetchedAt: string;
}

export interface VelocityMetrics {
  toolId: ToolId;
  releasesThisWeek: number;
  releasesThisMonth: number;
  releasesThisQuarter: number;
  averageDaysBetweenReleases: number;
  featuresPerRelease: number;
  lastReleaseAt: string;
}

export interface MetricsData {
  lastUpdated: string | null;
  tools: Record<ToolId, ToolMetrics>;
}

export interface VelocityData {
  lastUpdated: string | null;
  tools: Record<ToolId, VelocityMetrics>;
}

export interface FeatureCategory {
  id: string;
  name: string;
  description: string;
}

export interface FeatureStatus {
  supported: boolean;
  partialSupport?: boolean;
  addedInVersion?: string;
  addedAt?: string;
  notes?: string;
}

export interface FeatureMatrixEntry {
  categoryId: string;
  featureId: string;
  featureName: string;
  description: string;
  tools: Record<ToolId, FeatureStatus>;
  lastUpdated: string;
}

export interface FeatureMatrixData {
  lastUpdated: string | null;
  categories: FeatureCategory[];
  features: FeatureMatrixEntry[];
}

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  { id: 'core-editing', name: 'Core Editing', description: 'Multi-file editing, streaming, undo capabilities' },
  { id: 'terminal', name: 'Terminal Integration', description: 'Shell and command execution support' },
  { id: 'mcp', name: 'MCP Support', description: 'Model Context Protocol server and client capabilities' },
  { id: 'ide', name: 'IDE Integrations', description: 'VS Code, JetBrains, and other editor support' },
  { id: 'languages', name: 'Language Support', description: 'Programming language coverage' },
  { id: 'context', name: 'Context Handling', description: 'Context window size and file handling' },
  { id: 'agentic', name: 'Agentic Features', description: 'Planning, tool use, and autonomous capabilities' },
  { id: 'auth', name: 'Authentication', description: 'Login and authentication options' },
  { id: 'pricing', name: 'Pricing', description: 'Cost and pricing model' },
];

export const TOOL_GITHUB_REPOS: Record<ToolId, string | null> = {
  'claude-code': 'anthropics/claude-code',
  'openai-codex': 'openai/codex',
  'cursor': null, // Closed source
  'gemini-cli': 'google-gemini/gemini-cli',
  'kiro': null, // Closed source
  'github-copilot': 'github/copilot-cli',
  'aider': 'Aider-AI/aider',
  'windsurf': null, // Closed source (Codeium)
};

export const TOOL_NPM_PACKAGES: Record<ToolId, string | null> = {
  'claude-code': '@anthropic-ai/claude-code',
  'openai-codex': '@openai/codex',
  'cursor': null, // Not an npm package
  'gemini-cli': '@anthropic-ai/gemini-cli', // Placeholder - verify actual package name
  'kiro': null, // Not an npm package
  'github-copilot': '@github/copilot',
  'aider': 'aider-chat', // pip package, not npm
  'windsurf': null, // Desktop app, not an npm package
};
