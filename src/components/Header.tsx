import { ShareButtons } from './ShareButtons';

interface HeaderProps {
  lastUpdated: string | null;
}

export function Header({ lastUpdated }: HeaderProps) {
  const formattedDate = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <header className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">
            AI Tool Releases
          </h1>
          <p className="text-slate-400 text-lg mb-2">
            Track the latest releases from Claude Code, OpenAI Codex CLI, Cursor, Gemini CLI, and Kiro CLI.
          </p>
          {formattedDate && (
            <p className="text-slate-500 text-sm">
              Last updated: {formattedDate}
            </p>
          )}
        </div>
        <ShareButtons className="sm:mt-1" />
      </div>
    </header>
  );
}
