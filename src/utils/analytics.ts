declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(
  eventName: string,
  params: Record<string, string | number | boolean>
): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
}

export function trackToolFilterClick(tool: string): void {
  trackEvent('tool_filter_click', {
    tool_name: tool,
    event_category: 'engagement',
  });
}

export function trackReleaseClick(
  tool: string,
  version: string,
  url: string
): void {
  trackEvent('release_link_click', {
    tool_name: tool,
    version: version,
    link_url: url,
    event_category: 'engagement',
  });
}

export function trackScrollDepth(percentage: number): void {
  trackEvent('scroll_depth', {
    percent_scrolled: percentage,
    event_category: 'engagement',
  });
}
