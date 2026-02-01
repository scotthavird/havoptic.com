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

/**
 * Track SPA page views for route changes.
 * GA4 automatically tracks the initial page load, but SPA navigation
 * requires manual tracking.
 */
export function trackPageView(pagePath: string, pageTitle: string): void {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'page_view', {
      page_location: window.location.origin + pagePath,
      page_title: pageTitle,
      page_path: pagePath,
    });
  }
}

/**
 * Track newsletter funnel events.
 * These events help understand conversion from form view to subscription.
 */
export function trackNewsletterEvent(
  action: 'form_view' | 'form_focus' | 'submit' | 'success' | 'error' | 'already_subscribed' | 'dismiss',
  params?: Record<string, string | number | boolean>
): void {
  trackEvent(`newsletter_${action}`, {
    event_category: 'newsletter',
    ...params,
  });
}

/**
 * Track outbound link clicks to external tool websites.
 * Helps understand which tools users are most interested in.
 */
export function trackOutboundClick(url: string, toolName?: string): void {
  trackEvent('click', {
    event_category: 'outbound',
    link_url: url,
    ...(toolName && { tool_name: toolName }),
  });
}

/**
 * Track infographic interactions.
 */
export function trackInfographicView(tool: string, version: string): void {
  trackEvent('infographic_view', {
    event_category: 'engagement',
    tool_name: tool,
    version: version,
  });
}

export function trackInfographicZoom(tool: string, version: string): void {
  trackEvent('infographic_zoom', {
    event_category: 'engagement',
    tool_name: tool,
    version: version,
  });
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

export function trackShare(
  method:
    | 'native'
    | 'copy'
    | 'rss'
    | 'twitter'
    | 'linkedin'
    | 'slack'
    | 'teams'
    | 'email_invite'
    | 'twitter_invite'
    | 'linkedin_invite'
    | 'copy_invite'
): void {
  trackEvent('share', {
    method: method,
    event_category: 'engagement',
  });
}

/**
 * Track watchlist actions (add/remove tools).
 */
export function trackWatchlistAction(
  action: 'add' | 'remove',
  toolId: string
): void {
  trackEvent(`watchlist_${action}`, {
    tool_name: toolId,
    event_category: 'watchlist',
  });
}

/**
 * Track when user clicks the "Watching" filter.
 */
export function trackWatchlistFilterClick(): void {
  trackEvent('watchlist_filter_click', {
    event_category: 'watchlist',
  });
}
