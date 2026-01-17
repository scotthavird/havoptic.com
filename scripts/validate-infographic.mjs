import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'releases.json');
const PROMPTS_DIR = path.join(__dirname, '..', 'generated-prompts');

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    tool: null,
    version: null,
    all: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--tool=')) {
      options.tool = arg.split('=')[1];
    } else if (arg.startsWith('--version=')) {
      options.version = arg.split('=')[1];
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node validate-infographic.mjs [options]

Validates that generated infographic features match the actual release notes.

Options:
  --tool=<id>          Tool ID to validate (claude-code, kiro, openai-codex, gemini-cli, cursor)
  --version=<ver>      Specific version to validate (default: latest)
  --all                Validate all releases with infographics
  --help, -h           Show this help message

Environment Variables:
  ANTHROPIC_API_KEY    Required for validation

Examples:
  node validate-infographic.mjs --tool=kiro
  node validate-infographic.mjs --tool=gemini-cli --version=v0.22.0
  node validate-infographic.mjs --all
`);
      process.exit(0);
    }
  }

  return options;
}

// Load releases data
async function loadReleases() {
  const content = await fs.readFile(DATA_PATH, 'utf-8');
  return JSON.parse(content);
}

// Fetch release notes from URL
async function fetchReleaseNotes(url) {
  console.log(`  Fetching: ${url}`);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!res.ok) {
      return null;
    }

    return await res.text();
  } catch (err) {
    console.error(`  Error fetching: ${err.message}`);
    return null;
  }
}

// Validate features against source using Claude
async function validateFeatures(client, features, sourceContent, release, isFullNotes = false) {
  const featureList = features.features
    .map((f) => `- ${f.name}: ${f.description}`)
    .join('\n');

  const sourceLabel = isFullNotes ? 'release notes' : 'release page HTML';

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are validating an infographic for ${release.toolDisplayName} ${release.version}.

The infographic claims these features:
${featureList}

Here is the actual ${sourceLabel}:
${sourceContent.slice(0, 30000)}

For each feature, determine if it is:
- VERIFIED: Clearly mentioned in the source
- INFERRED: Reasonable inference from the source
- FABRICATED: Not mentioned or supported by the source

Return JSON only:
{
  "validations": [
    {"feature": "...", "status": "VERIFIED|INFERRED|FABRICATED", "evidence": "..."}
  ],
  "accuracy": "HIGH|MEDIUM|LOW",
  "summary": "..."
}`,
      },
    ],
  });

  const text = response.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse validation response');
  }

  return JSON.parse(jsonMatch[0]);
}

// Main validation function
async function validateRelease(client, release) {
  console.log(`\n📋 Validating: ${release.toolDisplayName} ${release.version}`);

  // Find the features JSON file
  const featureFiles = await fs.readdir(PROMPTS_DIR);
  const featureFile = featureFiles.find(
    (f) => f.includes(release.tool) && f.includes(release.version) && f.endsWith('-features.json')
  );

  if (!featureFile) {
    console.log('  ⚠️  No features file found - skipping');
    return null;
  }

  // Load features
  const featuresPath = path.join(PROMPTS_DIR, featureFile);
  const features = JSON.parse(await fs.readFile(featuresPath, 'utf-8'));
  console.log(`  Features file: ${featureFile}`);
  console.log(`  Features count: ${features.features.length}`);

  // Get source content - prefer stored sourceContent from features.json,
  // then fullNotes from release, otherwise fetch from URL
  let sourceContent;
  let isFullNotes = false;

  if (features.sourceContent && features.sourceContent.length > 100) {
    // Best option: use the exact source content that was used for feature extraction
    console.log(`  Using stored sourceContent (${features.sourceContent.length} chars, origin: ${features.sourceOrigin || 'unknown'})`);
    sourceContent = features.sourceContent;
    isFullNotes = true;
  } else if (release.fullNotes && release.fullNotes.length > 100) {
    console.log(`  Using stored fullNotes (${release.fullNotes.length} chars)`);
    sourceContent = release.fullNotes;
    isFullNotes = true;
  } else {
    // Fetch from URL as fallback
    console.log(`  Fetching from URL (no stored source available)`);
    sourceContent = await fetchReleaseNotes(release.url);
    if (!sourceContent) {
      console.log('  ⚠️  Could not fetch source - skipping');
      return null;
    }
  }

  // Validate
  console.log('  Validating with Claude...');
  const validation = await validateFeatures(client, features, sourceContent, release, isFullNotes);

  // Report results
  console.log(`\n  Accuracy: ${validation.accuracy}`);
  console.log(`  Summary: ${validation.summary}\n`);

  for (const v of validation.validations) {
    const icon =
      v.status === 'VERIFIED' ? '✅' : v.status === 'INFERRED' ? '🟡' : '❌';
    console.log(`  ${icon} ${v.feature}: ${v.status}`);
    if (v.status === 'FABRICATED') {
      console.log(`     Evidence: ${v.evidence}`);
    }
  }

  return validation;
}

async function main() {
  const options = parseArgs();

  if (!options.tool && !options.all) {
    console.error('Error: --tool or --all is required');
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is required');
    process.exit(1);
  }

  const client = new Anthropic();
  const data = await loadReleases();

  let releasesToValidate = [];

  if (options.all) {
    // Validate all releases with infographics
    releasesToValidate = data.releases.filter((r) => r.infographicUrl);
  } else {
    // Find specific release
    const release = options.version
      ? data.releases.find(
          (r) => r.tool === options.tool && r.version === options.version
        )
      : data.releases.find((r) => r.tool === options.tool);

    if (!release) {
      console.error(`Error: Release not found for ${options.tool}`);
      process.exit(1);
    }

    releasesToValidate = [release];
  }

  console.log(`\n🔍 Validating ${releasesToValidate.length} release(s)...\n`);

  const results = { verified: 0, inferred: 0, fabricated: 0 };

  for (const release of releasesToValidate) {
    const validation = await validateRelease(client, release);
    if (validation) {
      for (const v of validation.validations) {
        if (v.status === 'VERIFIED') results.verified++;
        else if (v.status === 'INFERRED') results.inferred++;
        else results.fabricated++;
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Verified:   ${results.verified}`);
  console.log(`🟡 Inferred:   ${results.inferred}`);
  console.log(`❌ Fabricated: ${results.fabricated}`);

  const total = results.verified + results.inferred + results.fabricated;
  const accuracyPct = total > 0 ? ((results.verified / total) * 100).toFixed(1) : 0;
  console.log(`\n📈 Accuracy: ${accuracyPct}% verified`);

  if (results.fabricated > 0) {
    console.log('\n⚠️  Some features may be inaccurate. Consider regenerating affected infographics.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
