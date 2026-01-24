import { Link } from './Link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-slate-700 pt-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-400">
        <div className="flex flex-wrap gap-4">
          <Link
            href="/"
            className="hover:text-slate-300 transition-colors"
          >
            Timeline
          </Link>
          <Link
            href="/blog"
            className="hover:text-slate-300 transition-colors"
          >
            Insights
          </Link>
          <Link
            href="/compare"
            className="hover:text-slate-300 transition-colors"
          >
            Compare
          </Link>
          <span className="text-slate-600">|</span>
          <Link
            href="/terms"
            className="hover:text-slate-300 transition-colors"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="hover:text-slate-300 transition-colors"
          >
            Privacy
          </Link>
        </div>
        <div>
          {currentYear} Havoptic. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
