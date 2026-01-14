import { NewsletterSignup } from './NewsletterSignup';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-slate-700 pt-6 pb-8">
      <div className="mb-6">
        <NewsletterSignup variant="footer" />
      </div>
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-slate-400">
        <div className="flex flex-wrap gap-4">
          <a
            href="#/"
            className="hover:text-slate-300 transition-colors"
          >
            Timeline
          </a>
          <a
            href="#/blog"
            className="hover:text-slate-300 transition-colors"
          >
            Insights
          </a>
          <a
            href="#/compare"
            className="hover:text-slate-300 transition-colors"
          >
            Compare
          </a>
          <span className="text-slate-600">|</span>
          <a
            href="#/terms"
            className="hover:text-slate-300 transition-colors"
          >
            Terms
          </a>
          <a
            href="#/privacy"
            className="hover:text-slate-300 transition-colors"
          >
            Privacy
          </a>
        </div>
        <div>
          {currentYear} Havoptic. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
