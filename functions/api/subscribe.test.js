import { describe, it, expect } from 'vitest';
import { generateWelcomeEmailContent } from './subscribe.js';

describe('generateWelcomeEmailContent', () => {
  it('returns subject, htmlBody, and textBody', () => {
    const result = generateWelcomeEmailContent();

    expect(result).toHaveProperty('subject');
    expect(result).toHaveProperty('htmlBody');
    expect(result).toHaveProperty('textBody');
  });

  it('has correct subject line', () => {
    const { subject } = generateWelcomeEmailContent();

    expect(subject).toBe('Welcome to Havoptic - Your AI Tool Release Tracker');
  });

  it('includes Havoptic branding in HTML', () => {
    const { htmlBody } = generateWelcomeEmailContent();

    expect(htmlBody).toContain('Havoptic');
    expect(htmlBody).toContain('AI Tool Release Intelligence');
  });

  it('includes all tracked tools in HTML', () => {
    const { htmlBody } = generateWelcomeEmailContent();

    expect(htmlBody).toContain('Claude Code');
    expect(htmlBody).toContain('OpenAI Codex CLI');
    expect(htmlBody).toContain('Cursor');
    expect(htmlBody).toContain('Gemini CLI');
    expect(htmlBody).toContain('Kiro CLI');
  });

  it('includes all tracked tools in text version', () => {
    const { textBody } = generateWelcomeEmailContent();

    expect(textBody).toContain('Claude Code');
    expect(textBody).toContain('OpenAI Codex CLI');
    expect(textBody).toContain('Cursor');
    expect(textBody).toContain('Gemini CLI');
    expect(textBody).toContain('Kiro CLI');
  });

  it('includes tool brand colors in HTML', () => {
    const { htmlBody } = generateWelcomeEmailContent();

    // Claude amber
    expect(htmlBody).toContain('#D97706');
    // Codex emerald
    expect(htmlBody).toContain('#059669');
    // Cursor violet
    expect(htmlBody).toContain('#7C3AED');
    // Gemini teal
    expect(htmlBody).toContain('#00ACC1');
    // Kiro purple
    expect(htmlBody).toContain('#8B5CF6');
  });

  it('includes unsubscribe placeholder in HTML', () => {
    const { htmlBody } = generateWelcomeEmailContent();

    expect(htmlBody).toContain('{{email}}');
    expect(htmlBody).toContain('unsubscribe');
  });

  it('includes unsubscribe placeholder in text version', () => {
    const { textBody } = generateWelcomeEmailContent();

    expect(textBody).toContain('{{email}}');
    expect(textBody).toContain('Unsubscribe');
  });

  it('includes CTA link to havoptic.com in HTML', () => {
    const { htmlBody } = generateWelcomeEmailContent();

    expect(htmlBody).toContain('https://havoptic.com');
    expect(htmlBody).toContain('Explore the Timeline');
  });

  it('includes CTA link to havoptic.com in text version', () => {
    const { textBody } = generateWelcomeEmailContent();

    expect(textBody).toContain('https://havoptic.com');
    expect(textBody).toContain('Explore the Timeline');
  });

  it('includes welcome message in HTML', () => {
    const { htmlBody } = generateWelcomeEmailContent();

    expect(htmlBody).toContain("You're In!");
    expect(htmlBody).toContain('competitive edge');
  });

  it('includes welcome message in text version', () => {
    const { textBody } = generateWelcomeEmailContent();

    expect(textBody).toContain("You're In!");
    expect(textBody).toContain('competitive edge');
  });

  it('mentions infographics in HTML', () => {
    const { htmlBody } = generateWelcomeEmailContent();

    expect(htmlBody).toContain('infographics');
  });

  it('mentions infographics in text version', () => {
    const { textBody } = generateWelcomeEmailContent();

    expect(textBody).toContain('infographics');
  });
});
