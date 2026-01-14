import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'public', 'data');
const RELEASES_PATH = path.join(DATA_DIR, 'releases.json');
const FEATURE_MATRIX_PATH = path.join(DATA_DIR, 'feature-matrix.json');

const TOOL_IDS = ['claude-code', 'openai-codex', 'cursor', 'gemini-cli', 'kiro'];

const TOOL_DISPLAY_NAMES = {
  'claude-code': 'Claude Code',
  'openai-codex': 'OpenAI Codex CLI',
  'cursor': 'Cursor',
  'gemini-cli': 'Gemini CLI',
  'kiro': 'Kiro CLI',
};

// Feature categories to track
const FEATURE_CATEGORIES = [
  {
    id: 'core-editing',
    name: 'Core Editing',
    description: 'Multi-file editing, streaming, undo capabilities',
    features: [
      { id: 'multi-file-editing', name: 'Multi-file Editing', description: 'Edit multiple files in a single operation' },
      { id: 'streaming-output', name: 'Streaming Output', description: 'Real-time streaming of AI responses' },
      { id: 'undo-redo', name: 'Undo/Redo', description: 'Ability to undo and redo changes' },
      { id: 'diff-view', name: 'Diff View', description: 'Visual comparison of changes' },
    ],
  },
  {
    id: 'terminal',
    name: 'Terminal Integration',
    description: 'Shell and command execution support',
    features: [
      { id: 'command-execution', name: 'Command Execution', description: 'Run shell commands' },
      { id: 'shell-integration', name: 'Shell Integration', description: 'Integration with user shell environment' },
      { id: 'background-tasks', name: 'Background Tasks', description: 'Run tasks in background' },
    ],
  },
  {
    id: 'mcp',
    name: 'MCP Support',
    description: 'Model Context Protocol server and client capabilities',
    features: [
      { id: 'mcp-client', name: 'MCP Client', description: 'Connect to MCP servers' },
      { id: 'mcp-server', name: 'MCP Server', description: 'Expose as MCP server' },
      { id: 'custom-tools', name: 'Custom Tools', description: 'Define and use custom tools' },
    ],
  },
  {
    id: 'ide',
    name: 'IDE Integrations',
    description: 'VS Code, JetBrains, and other editor support',
    features: [
      { id: 'vscode', name: 'VS Code', description: 'Visual Studio Code integration' },
      { id: 'jetbrains', name: 'JetBrains', description: 'IntelliJ/WebStorm integration' },
      { id: 'vim-neovim', name: 'Vim/Neovim', description: 'Vim or Neovim integration' },
      { id: 'web-ui', name: 'Web UI', description: 'Browser-based interface' },
    ],
  },
  {
    id: 'agentic',
    name: 'Agentic Features',
    description: 'Planning, tool use, and autonomous capabilities',
    features: [
      { id: 'planning', name: 'Planning Mode', description: 'Plan before executing changes' },
      { id: 'autonomous-mode', name: 'Autonomous Mode', description: 'Extended autonomous operation' },
      { id: 'task-decomposition', name: 'Task Decomposition', description: 'Break complex tasks into steps' },
      { id: 'context-management', name: 'Context Management', description: 'Manage context across conversations' },
    ],
  },
];

// Keywords that indicate feature support in release notes
const FEATURE_KEYWORDS = {
  'multi-file-editing': ['multi-file', 'multiple files', 'batch edit', 'multi file'],
  'streaming-output': ['streaming', 'stream', 'real-time', 'live output'],
  'undo-redo': ['undo', 'revert', 'rollback'],
  'diff-view': ['diff', 'compare', 'changes view'],
  'command-execution': ['shell', 'terminal', 'command', 'bash', 'execute'],
  'shell-integration': ['shell integration', 'zsh', 'bash integration'],
  'background-tasks': ['background', 'async', 'parallel'],
  'mcp-client': ['mcp', 'model context protocol', 'mcp client', 'mcp server'],
  'mcp-server': ['mcp server', 'expose mcp'],
  'custom-tools': ['custom tool', 'tool definition', 'tool use'],
  'vscode': ['vscode', 'vs code', 'visual studio code'],
  'jetbrains': ['jetbrains', 'intellij', 'webstorm', 'pycharm'],
  'vim-neovim': ['vim', 'neovim', 'nvim'],
  'web-ui': ['web', 'browser', 'web interface', 'web ui'],
  'planning': ['plan', 'planning mode', 'plan mode'],
  'autonomous-mode': ['autonomous', 'auto', 'headless', 'unattended'],
  'task-decomposition': ['task', 'subtask', 'step by step', 'decompose'],
  'context-management': ['context', 'memory', 'conversation history'],
};

// Load JSON file safely
async function loadJson(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// Check if release notes mention a feature
function checkFeatureInNotes(notes, featureId) {
  const keywords = FEATURE_KEYWORDS[featureId] || [];
  const lowerNotes = notes.toLowerCase();
  return keywords.some((kw) => lowerNotes.includes(kw.toLowerCase()));
}

// Scan releases to detect feature support
function scanReleasesForFeatures(releases, toolId) {
  const toolReleases = releases.filter((r) => r.tool === toolId);
  const features = {};

  for (const category of FEATURE_CATEGORIES) {
    for (const feature of category.features) {
      // Check all releases for this feature
      for (const release of toolReleases) {
        const notes = `${release.summary} ${release.fullNotes || ''}`;
        if (checkFeatureInNotes(notes, feature.id)) {
          if (!features[feature.id]) {
            features[feature.id] = {
              supported: true,
              addedInVersion: release.version,
              addedAt: release.date,
            };
          }
        }
      }
    }
  }

  return features;
}

// Use Claude to analyze and verify feature detection
async function analyzeWithClaude(client, toolId, releases, existingFeatures) {
  const toolReleases = releases.filter((r) => r.tool === toolId);
  if (toolReleases.length === 0) return existingFeatures;

  // Get recent releases for analysis
  const recentReleases = toolReleases.slice(0, 10);
  const notesContext = recentReleases
    .map((r) => `v${r.version} (${r.date.split('T')[0]}): ${r.summary}`)
    .join('\n');

  const featureList = FEATURE_CATEGORIES.flatMap((c) =>
    c.features.map((f) => `- ${f.id}: ${f.name} - ${f.description}`)
  ).join('\n');

  const systemPrompt = `You analyze AI coding tool capabilities based on release notes.
Return a JSON object mapping feature IDs to {supported: boolean, notes?: string}.
Only mark features as supported if there's clear evidence in the release notes.
Be conservative - if unsure, don't mark as supported.`;

  const userPrompt = `Analyze ${TOOL_DISPLAY_NAMES[toolId]} capabilities based on these recent releases:

${notesContext}

Determine support for these features:
${featureList}

Return JSON: { "feature-id": { "supported": true/false, "notes": "optional evidence" }, ... }
Only include features you're confident about.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      system: systemPrompt,
    });

    const text = response.content[0].text;

    // Parse response
    let analysis;
    try {
      analysis = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[1]);
      } else {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
          analysis = JSON.parse(text.slice(start, end + 1));
        }
      }
    }

    // Merge with existing features
    if (analysis) {
      for (const [featureId, data] of Object.entries(analysis)) {
        if (data.supported && !existingFeatures[featureId]) {
          existingFeatures[featureId] = {
            supported: true,
            notes: data.notes,
          };
        }
      }
    }
  } catch (err) {
    console.log(`  Claude analysis error: ${err.message}`);
  }

  return existingFeatures;
}

// Build the full feature matrix
async function buildFeatureMatrix(releases, useAI = false) {
  const client = useAI ? new Anthropic() : null;
  const matrix = {
    lastUpdated: new Date().toISOString(),
    categories: FEATURE_CATEGORIES.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
    })),
    features: [],
  };

  // Process each feature
  for (const category of FEATURE_CATEGORIES) {
    for (const feature of category.features) {
      const entry = {
        categoryId: category.id,
        featureId: feature.id,
        featureName: feature.name,
        description: feature.description,
        tools: {},
        lastUpdated: new Date().toISOString(),
      };

      // Check each tool
      for (const toolId of TOOL_IDS) {
        let toolFeatures = scanReleasesForFeatures(releases, toolId);

        if (useAI && client) {
          console.log(`  Analyzing ${TOOL_DISPLAY_NAMES[toolId]} with Claude...`);
          toolFeatures = await analyzeWithClaude(client, toolId, releases, toolFeatures);
        }

        if (toolFeatures[feature.id]) {
          entry.tools[toolId] = {
            supported: true,
            addedInVersion: toolFeatures[feature.id].addedInVersion,
            addedAt: toolFeatures[feature.id].addedAt,
            notes: toolFeatures[feature.id].notes,
          };
        } else {
          entry.tools[toolId] = {
            supported: false,
          };
        }
      }

      matrix.features.push(entry);
    }
  }

  return matrix;
}

// Main export function
export async function updateFeatureMatrix(useAI = false) {
  console.log('\nUpdating feature matrix...');

  // Load releases
  const releasesData = await loadJson(RELEASES_PATH);
  if (!releasesData) {
    throw new Error('Could not load releases.json');
  }

  console.log(`Loaded ${releasesData.releases.length} releases`);

  // Load existing matrix
  const existingMatrix = await loadJson(FEATURE_MATRIX_PATH);
  if (existingMatrix) {
    console.log(`Existing matrix has ${existingMatrix.features?.length || 0} features`);
  }

  // Build new matrix
  console.log(`Building feature matrix${useAI ? ' with AI analysis' : ''}...`);
  const matrix = await buildFeatureMatrix(releasesData.releases, useAI);

  // Write output
  await fs.writeFile(FEATURE_MATRIX_PATH, JSON.stringify(matrix, null, 2));
  console.log(`\nWritten ${matrix.features.length} features to ${FEATURE_MATRIX_PATH}`);

  // Summary
  for (const toolId of TOOL_IDS) {
    const supported = matrix.features.filter((f) => f.tools[toolId]?.supported).length;
    console.log(`  ${TOOL_DISPLAY_NAMES[toolId]}: ${supported}/${matrix.features.length} features`);
  }

  return matrix;
}

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const useAI = args.includes('--ai');

  updateFeatureMatrix(useAI)
    .then(() => {
      console.log('\nFeature matrix update complete!');
    })
    .catch((err) => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}
