import type { ReactNode } from 'react';

import { CodexWebMark } from '@/shared/ui';

type AuthScreenLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
  footerText: string;
  logo?: ReactNode;
};

/** Used by LoginForm and SetupForm for the Codex-Web authentication screen. */
export default function AuthScreenLayout({ title, description, children, footerText }: AuthScreenLayoutProps) {
  return (
    <div className="codex-auth-screen">
      <a href="/" className="flex items-center gap-2 self-start text-foreground"><CodexWebMark className="h-9 w-9 text-primary" /><span className="codex-wordmark">Codex-Web</span></a>
      <main className="codex-auth-main">
        <CodexWebMark className="mx-auto mb-5 h-14 w-14 text-primary" />
        <h1 className="text-center text-3xl font-medium tracking-tight">{title}</h1>
        <p className="mb-8 mt-3 text-center text-sm leading-6 text-muted-foreground">{description}</p>
        <div className="codex-auth-form">{children}</div>
        <p className="mt-6 text-center text-xs leading-6 text-muted-foreground">{footerText}</p>
      </main>
      <p className="text-center text-xs text-muted-foreground">Codex-Web</p>
    </div>
  );
}
