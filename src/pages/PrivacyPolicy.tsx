export function PrivacyPolicy() {
  return (
    <div className="py-8">
      <a
        href="#/"
        className="text-blue-400 hover:text-blue-300 transition-colors text-sm mb-6 inline-block"
      >
        &larr; Back to Home
      </a>

      <h1 className="text-3xl font-bold text-white mb-8">Privacy Policy</h1>

      <div className="prose prose-invert max-w-none space-y-6 text-slate-300">
        <p className="text-slate-400 text-sm">Last updated: January 2025</p>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-4">1. Introduction</h2>
          <p>
            Havoptic ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy
            explains how we collect, use, and safeguard information when you visit our website.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-4">2. Information We Collect</h2>
          <p>
            We collect minimal information necessary to provide and improve our Service:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>
              <strong>Usage Data:</strong> We may collect anonymous usage statistics such as page views,
              scroll depth, and general interaction patterns to improve the user experience.
            </li>
            <li>
              <strong>Technical Data:</strong> Standard web server logs may include IP addresses,
              browser type, and referring pages.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-4">3. How We Use Information</h2>
          <p>
            Any information collected is used solely to:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-2">
            <li>Operate and maintain the Service</li>
            <li>Improve user experience</li>
            <li>Analyze usage patterns to enhance functionality</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-4">4. Cookies</h2>
          <p>
            We may use cookies or similar technologies to enhance your experience. You can control
            cookie settings through your browser preferences.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-4">5. Third-Party Services</h2>
          <p>
            The Service may contain links to external websites. We are not responsible for the
            privacy practices of third-party sites. We encourage you to review their privacy policies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-4">6. Data Security</h2>
          <p>
            We implement reasonable security measures to protect any data we collect. However,
            no method of transmission over the Internet is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-4">7. Children's Privacy</h2>
          <p>
            The Service is not directed at children under 13. We do not knowingly collect
            personal information from children.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-4">8. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Changes will be posted on this page
            with an updated revision date.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mt-8 mb-4">9. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us through the project repository.
          </p>
        </section>
      </div>
    </div>
  );
}
