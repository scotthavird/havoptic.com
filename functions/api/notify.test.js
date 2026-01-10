import { describe, it, expect } from 'vitest';
import { generateEmailContent, TOOL_COLORS } from './notify.js';

describe('TOOL_COLORS', () => {
  it('has colors for all supported tools', () => {
    expect(TOOL_COLORS).toHaveProperty('claude-code');
    expect(TOOL_COLORS).toHaveProperty('openai-codex');
    expect(TOOL_COLORS).toHaveProperty('cursor');
    expect(TOOL_COLORS).toHaveProperty('gemini-cli');
    expect(TOOL_COLORS).toHaveProperty('kiro');
  });

  it('uses correct brand colors', () => {
    expect(TOOL_COLORS['claude-code']).toBe('#D97706');
    expect(TOOL_COLORS['openai-codex']).toBe('#059669');
    expect(TOOL_COLORS['cursor']).toBe('#7C3AED');
    expect(TOOL_COLORS['gemini-cli']).toBe('#00ACC1');
    expect(TOOL_COLORS['kiro']).toBe('#8B5CF6');
  });
});

describe('generateEmailContent', () => {
  const mockReleaseWithInfographic = {
    id: 'claude-code-2.1.3',
    tool: 'claude-code',
    toolDisplayName: 'Claude Code',
    version: '2.1.3',
    date: '2026-01-10',
    summary: 'New features and improvements',
    url: 'https://example.com/release',
    infographicUrl: '/images/infographics/claude-code-2.1.3.jpg',
  };

  const mockReleaseWithoutInfographic = {
    id: 'cursor-3.0.0',
    tool: 'cursor',
    toolDisplayName: 'Cursor',
    version: '3.0.0',
    date: '2026-01-09',
    summary: 'Major update with new editor features',
    url: 'https://example.com/cursor-release',
  };

  it('returns subject, htmlBody, and textBody', () => {
    const result = generateEmailContent([mockReleaseWithInfographic]);

    expect(result).toHaveProperty('subject');
    expect(result).toHaveProperty('htmlBody');
    expect(result).toHaveProperty('textBody');
  });

  describe('single release', () => {
    it('uses singular subject format', () => {
      const { subject } = generateEmailContent([mockReleaseWithInfographic]);

      expect(subject).toContain('Claude Code');
      expect(subject).toContain('2.1.3');
      expect(subject).toContain('Just Shipped');
    });

    it('includes "Fresh Off the Wire" intro in HTML', () => {
      const { htmlBody } = generateEmailContent([mockReleaseWithInfographic]);

      expect(htmlBody).toContain('Fresh Off the Wire');
    });

    it('includes "Fresh Off the Wire" intro in text', () => {
      const { textBody } = generateEmailContent([mockReleaseWithInfographic]);

      expect(textBody).toContain('Fresh Off the Wire');
    });
  });

  describe('multiple releases', () => {
    it('uses plural subject format', () => {
      const { subject } = generateEmailContent([
        mockReleaseWithInfographic,
        mockReleaseWithoutInfographic,
      ]);

      expect(subject).toContain('2');
      expect(subject).toContain('Updates');
      expect(subject).toContain('You Need to See');
    });

    it('includes "Updates Just Dropped" intro in HTML', () => {
      const { htmlBody } = generateEmailContent([
        mockReleaseWithInfographic,
        mockReleaseWithoutInfographic,
      ]);

      expect(htmlBody).toContain('2 Updates Just Dropped');
    });

    it('includes all releases in HTML', () => {
      const { htmlBody } = generateEmailContent([
        mockReleaseWithInfographic,
        mockReleaseWithoutInfographic,
      ]);

      expect(htmlBody).toContain('Claude Code');
      expect(htmlBody).toContain('Cursor');
      expect(htmlBody).toContain('v2.1.3');
      expect(htmlBody).toContain('v3.0.0');
    });
  });

  describe('infographic handling', () => {
    it('includes infographic image when available', () => {
      const { htmlBody } = generateEmailContent([mockReleaseWithInfographic]);

      expect(htmlBody).toContain('<img');
      expect(htmlBody).toContain('https://havoptic.com/images/infographics/claude-code-2.1.3.jpg');
    });

    it('includes alt text for infographic image', () => {
      const { htmlBody } = generateEmailContent([mockReleaseWithInfographic]);

      expect(htmlBody).toContain('alt="Claude Code v2.1.3 release highlights"');
    });

    it('falls back to summary when no infographic', () => {
      const { htmlBody } = generateEmailContent([mockReleaseWithoutInfographic]);

      expect(htmlBody).toContain('Major update with new editor features');
      expect(htmlBody).not.toContain('/images/infographics/cursor');
    });

    it('includes infographic URL in text version when available', () => {
      const { textBody } = generateEmailContent([mockReleaseWithInfographic]);

      expect(textBody).toContain('Infographic: https://havoptic.com/images/infographics/claude-code-2.1.3.jpg');
    });

    it('shows summary in text version when no infographic', () => {
      const { textBody } = generateEmailContent([mockReleaseWithoutInfographic]);

      expect(textBody).toContain('Major update with new editor features');
    });
  });

  describe('tool styling', () => {
    it('applies correct tool color for Claude Code', () => {
      const { htmlBody } = generateEmailContent([mockReleaseWithInfographic]);

      expect(htmlBody).toContain('#D97706');
    });

    it('applies correct tool color for Cursor', () => {
      const { htmlBody } = generateEmailContent([mockReleaseWithoutInfographic]);

      expect(htmlBody).toContain('#7C3AED');
    });

    it('applies default color for unknown tool', () => {
      const unknownToolRelease = {
        ...mockReleaseWithInfographic,
        tool: 'unknown-tool',
        toolDisplayName: 'Unknown Tool',
      };
      const { htmlBody } = generateEmailContent([unknownToolRelease]);

      // Should fall back to default amber color
      expect(htmlBody).toContain('#D97706');
    });
  });

  describe('links and CTAs', () => {
    it('includes release URL in HTML', () => {
      const { htmlBody } = generateEmailContent([mockReleaseWithInfographic]);

      expect(htmlBody).toContain('https://example.com/release');
      expect(htmlBody).toContain('View Full Release Notes');
    });

    it('includes release URL in text version', () => {
      const { textBody } = generateEmailContent([mockReleaseWithInfographic]);

      expect(textBody).toContain('View release: https://example.com/release');
    });

    it('includes View Complete Timeline CTA', () => {
      const { htmlBody } = generateEmailContent([mockReleaseWithInfographic]);

      expect(htmlBody).toContain('https://havoptic.com');
      expect(htmlBody).toContain('View Complete Timeline');
    });
  });

  describe('unsubscribe link', () => {
    it('includes unsubscribe placeholder in HTML', () => {
      const { htmlBody } = generateEmailContent([mockReleaseWithInfographic]);

      expect(htmlBody).toContain('{{email}}');
      expect(htmlBody).toContain('Unsubscribe');
    });

    it('includes unsubscribe placeholder in text version', () => {
      const { textBody } = generateEmailContent([mockReleaseWithInfographic]);

      expect(textBody).toContain('{{email}}');
      expect(textBody).toContain('Unsubscribe');
    });
  });

  describe('date formatting', () => {
    it('formats date correctly in HTML', () => {
      const { htmlBody } = generateEmailContent([mockReleaseWithInfographic]);

      // Jan 10, 2026 format
      expect(htmlBody).toContain('Jan');
      expect(htmlBody).toContain('10');
      expect(htmlBody).toContain('2026');
    });

    it('includes date in text version', () => {
      const { textBody } = generateEmailContent([mockReleaseWithInfographic]);

      expect(textBody).toContain('Released:');
    });
  });

  describe('branding', () => {
    it('includes Havoptic branding in HTML', () => {
      const { htmlBody } = generateEmailContent([mockReleaseWithInfographic]);

      expect(htmlBody).toContain('Havoptic');
      expect(htmlBody).toContain('Release Intelligence');
    });

    it('includes Havoptic branding in text version', () => {
      const { textBody } = generateEmailContent([mockReleaseWithInfographic]);

      expect(textBody).toContain('HAVOPTIC');
      expect(textBody).toContain('Release Intelligence');
    });
  });
});
