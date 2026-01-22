import { ReactNode } from 'react';
import { Footer } from './Footer';

interface LayoutProps {
  children: ReactNode;
}

function Header() {
  return (
    <header className="border-b border-slate-800 py-4 mb-6">
      <nav className="flex items-center justify-between">
        <a href="#/" className="text-xl font-bold text-white hover:text-slate-200 transition-colors">
          Havoptic
        </a>
        <div className="flex items-center gap-6 text-sm">
          <a
            href="#/"
            className="text-slate-400 hover:text-white transition-colors"
          >
            Timeline
          </a>
          <a
            href="#/trends"
            className="text-slate-400 hover:text-white transition-colors"
          >
            Trends
          </a>
          <a
            href="#/blog"
            className="text-slate-400 hover:text-white transition-colors"
          >
            Insights
          </a>
          <a
            href="#/compare"
            className="text-slate-400 hover:text-white transition-colors"
          >
            Compare
          </a>
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
