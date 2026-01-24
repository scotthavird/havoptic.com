import { ReactNode, MouseEvent } from 'react';

interface LinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  target?: string;
  rel?: string;
}

export function Link({ href, children, className, target, rel }: LinkProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Allow new tab behavior
    if (e.metaKey || e.ctrlKey || target === '_blank') return;

    // Only handle internal links (no protocol = internal)
    if (href.startsWith('http://') || href.startsWith('https://')) return;

    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <a href={href} onClick={handleClick} className={className} target={target} rel={rel}>
      {children}
    </a>
  );
}
