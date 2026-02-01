import { ShareButtons } from './ShareButtons';
import { LoginButton } from './LoginButton';
import { HeaderBell } from './HeaderBell';
import { PushNotificationToggle } from './PushNotificationToggle';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  lastUpdated: string | null;
}

export function Header({ lastUpdated }: HeaderProps) {
  const { user } = useAuth();
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
    <header className="mb-6 sm:mb-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">
            AI Coding Tool Releases
          </h1>
          <p className="text-slate-400 text-sm sm:text-lg mb-2">
            Track every update from Claude Code, Cursor, Gemini CLI & more — in one place.
          </p>
          {formattedDate && (
            <p className="text-slate-500 text-xs sm:text-sm">
              Last updated: {formattedDate}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 sm:mt-1 shrink-0 w-full sm:w-auto justify-end">
          <HeaderBell />
          {/* Show push notification toggle for logged-in users */}
          {user && <PushNotificationToggle />}
          <LoginButton />
          <ShareButtons />
        </div>
      </div>
    </header>
  );
}
