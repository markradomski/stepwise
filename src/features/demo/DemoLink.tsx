import type { MouseEvent, ReactNode } from 'react';

type Props = {
  href: string;
  onNavigate: (href: string) => void;
  className?: string;
  title?: string;
  current?: boolean;
  children: ReactNode;
};

export function DemoLink({ href, onNavigate, className, title, current, children }: Props) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    onNavigate(href);
  };

  return (
    <a href={href} className={className} title={title} aria-current={current ? 'page' : undefined} onClick={handleClick}>
      {children}
    </a>
  );
}
