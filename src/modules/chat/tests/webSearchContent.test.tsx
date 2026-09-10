import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { WebSearchContent } from '@/modules/chat/tools/ContentRenderers/WebSearchContent';

test('native search exposes deduplicated HTTP sources and does not link unsafe schemes', () => {
  render(<WebSearchContent content={JSON.stringify([{ results: [
    { title: 'Documentation', url: 'https://example.com/docs', snippet: 'Primary source' },
    { title: 'Documentation', url: 'https://example.com/docs' },
    { title: 'Unsafe', url: 'javascript:alert(1)' },
  ] }])} />);
  expect(screen.getAllByRole('link')).toHaveLength(1);
  expect(screen.getByRole('link', { name: 'Documentation' }).getAttribute('href')).toBe('https://example.com/docs');
});
