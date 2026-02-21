import { describe, it, expect } from 'vitest';
import {
  generateSendId,
  wrapLinksForTracking,
  addTrackingPixel,
} from '../_newsletter-utils.js';

describe('generateSendId', () => {
  it('returns a string', () => {
    const id = generateSendId();
    expect(typeof id).toBe('string');
  });

  it('returns a valid UUID format', () => {
    const id = generateSendId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it('generates unique IDs across calls', () => {
    const ids = new Set(Array.from({ length: 10 }, () => generateSendId()));
    expect(ids.size).toBe(10);
  });
});

describe('wrapLinksForTracking', () => {
  const sendId = 'test-send-id-123';
  const messageType = 'release';

  it('wraps https links with click tracking URL', () => {
    const html = '<a href="https://havoptic.com/r/claude-code-1.0">View</a>';
    const result = wrapLinksForTracking(html, sendId, messageType);

    expect(result).toContain('/api/t/click');
    expect(result).toContain(`sid=${sendId}`);
    expect(result).not.toContain('href="https://havoptic.com/r/claude-code-1.0"');
  });

  it('infers view-release label for /r/ URLs', () => {
    const html = '<a href="https://havoptic.com/r/some-release">View</a>';
    const result = wrapLinksForTracking(html, sendId, messageType);
    expect(result).toContain('label=view-release');
  });

  it('infers view-blog label for /blog/ URLs', () => {
    const html = '<a href="https://havoptic.com/blog/some-post">Read</a>';
    const result = wrapLinksForTracking(html, sendId, messageType);
    expect(result).toContain('label=view-blog');
  });

  it('infers unsubscribe label for /unsubscribe URLs', () => {
    const html = '<a href="https://havoptic.com/unsubscribe?email=test">Unsub</a>';
    const result = wrapLinksForTracking(html, sendId, messageType);
    expect(result).toContain('label=unsubscribe');
  });

  it('infers preferences label for /preferences URLs', () => {
    const html = '<a href="https://havoptic.com/preferences?email=test">Prefs</a>';
    const result = wrapLinksForTracking(html, sendId, messageType);
    expect(result).toContain('label=preferences');
  });

  it('infers confirm label for /api/confirm URLs', () => {
    const html = '<a href="https://havoptic.com/api/confirm?token=abc">Confirm</a>';
    const result = wrapLinksForTracking(html, sendId, messageType);
    expect(result).toContain('label=confirm');
  });

  it('infers visit-site label for havoptic.com root URLs', () => {
    const html = '<a href="https://havoptic.com">Visit</a>';
    const result = wrapLinksForTracking(html, sendId, messageType);
    expect(result).toContain('label=visit-site');
  });

  it('wraps multiple links in the same HTML', () => {
    const html = `
      <a href="https://havoptic.com/r/release-1">Release</a>
      <a href="https://havoptic.com/unsubscribe?email=test">Unsub</a>
    `;
    const result = wrapLinksForTracking(html, sendId, messageType);

    const matches = result.match(/\/api\/t\/click/g);
    expect(matches).toHaveLength(2);
  });

  it('does not wrap mailto: links', () => {
    const html = '<a href="mailto:test@example.com">Email</a>';
    const result = wrapLinksForTracking(html, sendId, messageType);
    expect(result).toContain('href="mailto:test@example.com"');
    expect(result).not.toContain('/api/t/click');
  });

  it('adds UTM params to havoptic.com URLs', () => {
    const html = '<a href="https://havoptic.com/r/test">View</a>';
    const result = wrapLinksForTracking(html, sendId, messageType);

    // The encoded URL in the tracking link should contain UTM params
    // Decode the base64url parameter to verify
    const urlMatch = result.match(/url=([^&"]+)/);
    expect(urlMatch).toBeTruthy();
    const encoded = urlMatch[1];
    const decoded = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
    expect(decoded).toContain('utm_source=newsletter');
    expect(decoded).toContain('utm_medium=email');
    expect(decoded).toContain(`utm_campaign=${messageType}`);
  });
});

describe('addTrackingPixel', () => {
  const sendId = 'test-send-id-456';

  it('inserts pixel img before </body>', () => {
    const html = '<html><body><p>Hello</p></body></html>';
    const result = addTrackingPixel(html, sendId);

    expect(result).toContain('<img src=');
    expect(result).toContain('/api/t/open');
    expect(result).toContain(`sid=${sendId}`);
  });

  it('includes correct sendId in pixel URL', () => {
    const html = '<body>Content</body>';
    const result = addTrackingPixel(html, sendId);
    expect(result).toContain(`sid=${sendId}`);
  });

  it('includes hidden styling on pixel', () => {
    const html = '<body>Content</body>';
    const result = addTrackingPixel(html, sendId);
    expect(result).toContain('display:none');
    expect(result).toContain('width:1px');
    expect(result).toContain('height:1px');
  });

  it('handles case-insensitive </body> tag', () => {
    const html = '<html><BODY><p>Content</p></BODY></html>';
    const result = addTrackingPixel(html, sendId);
    expect(result).toContain('/api/t/open');
  });

  it('preserves content before and after pixel injection', () => {
    const html = '<body><p>Hello World</p></body>';
    const result = addTrackingPixel(html, sendId);
    expect(result).toContain('<p>Hello World</p>');
    expect(result).toContain('</body>');
  });
});
