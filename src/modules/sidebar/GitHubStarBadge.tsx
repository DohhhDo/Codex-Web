import { GithubLogoIcon } from '@phosphor-icons/react/dist/csr/GithubLogo';
import { StarIcon as Star } from '@phosphor-icons/react/dist/csr/Star';
import { XIcon as X } from '@phosphor-icons/react/dist/csr/X';

import { useGitHubStars } from '@/modules/sidebar/hooks/useGitHubStars';
import { IS_PLATFORM } from '@/shared/utils';

const GITHUB_REPO_URL = 'https://github.com/siteboon/claudecodeui';

function GitHubIcon({ className }: { className?: string }) {
  return (
    <GithubLogoIcon className={className} weight="fill" aria-hidden />
  );
}

/** Rendered by SidebarHeader on self-hosted (non-platform) builds to link to the GitHub repo with its star count. */
export default function GitHubStarBadge() {
  const { formattedCount, isDismissed, dismiss } = useGitHubStars('siteboon', 'claudecodeui');

  if (IS_PLATFORM || isDismissed) return null;

  return (
    <div className="group/star relative hidden md:block">
      <a
        href={GITHUB_REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
      >
        <GitHubIcon className="h-3.5 w-3.5" />
        <Star className="h-3 w-3" />
        <span className="font-normal">Star</span>
        {formattedCount && (
          <span className="border-l border-border/50 pl-1.5 tabular-nums">{formattedCount}</span>
        )}
      </a>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          dismiss();
        }}
        className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full border border-border/50 bg-muted text-muted-foreground transition-colors hover:text-foreground group-hover/star:flex"
        aria-label="Dismiss"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}
