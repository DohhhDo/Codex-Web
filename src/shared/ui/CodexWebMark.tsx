import type { SVGProps } from 'react';

/** Used by auth, sidebar, settings and project-workspace for the Codex-Web identity. */
export function CodexWebMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" {...props}>
      <path d="m10 12 9 8-9 8M23 28h8" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
