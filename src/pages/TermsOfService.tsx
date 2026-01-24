import { Link } from '../components/Link';

export function TermsOfService() {
  return (
    <div className="py-8">
      <Link
        href="/"
        className="text-blue-400 hover:text-blue-300 transition-colors text-sm mb-6 inline-block"
      >
        &larr; Back to Home
      </Link>

      <h1 className="text-3xl font-bold text-white mb-8">Terms of Service</h1>

      <div className="prose prose-invert max-w-none space-y-6 text-slate-300">
        <p className="text-slate-400 text-sm">Last updated: January 2025</p>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing and using Havoptic ("the Service"), you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-4">2. Description of Service</h2>
          <p>
            Havoptic provides a timeline of AI coding tool releases, including but not limited to Claude Code,
            OpenAI Codex CLI, Cursor, Gemini CLI, and Kiro CLI. The Service aggregates publicly available
            release information for informational purposes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-4">3. Intellectual Property</h2>
          <p>
            The content displayed on Havoptic, including release information, is sourced from publicly
            available data. Trademarks, logos, and brand names belong to their respective owners.
            Havoptic does not claim ownership of third-party content.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-4">4. Disclaimer of Warranties</h2>
          <p>
            The Service is provided "as is" without warranties of any kind, either express or implied.
            We do not guarantee the accuracy, completeness, or timeliness of the information displayed.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-4">5. Limitation of Liability</h2>
          <p>
            In no event shall Havoptic be liable for any indirect, incidental, special, consequential,
            or punitive damages arising from your use of the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-4">6. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. Continued use of the Service after
            changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-4">7. Contact</h2>
          <p>
            For questions about these Terms of Service, please contact us through the project repository.
          </p>
        </section>
      </div>
    </div>
  );
}
