import { ReactNode } from 'react';
import { Footer } from './Footer';
import { Link } from './Link';
import { SettingsDropdown } from './SettingsDropdown';

interface LayoutProps {
  children: ReactNode;
}

function Header() {
  return (
    <header className="border-b border-slate-800 py-2 mb-3">
      <nav className="flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-white hover:text-slate-200 transition-colors">
          Havoptic
        </Link>
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-4 sm:gap-6 text-sm">
            <Link
              href="/trends"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Trends
            </Link>
            <Link
              href="/blog"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Insights
            </Link>
            <Link
              href="/compare"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Compare
            </Link>
          </div>
          <SettingsDropdown />
        </div>
      </nav>
    </header>
  );
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 max-w-4xl mx-auto px-4 w-full">
        <Header />
        {children}
      </div>
      <div className="max-w-4xl mx-auto px-4 w-full">
        <Footer />
      </div>
    </div>
  );
}
