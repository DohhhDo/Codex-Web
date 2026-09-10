import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/Dialog';
afterEach(cleanup);
function Example() {
  // The test exercises nested controlled dialogs as used by settings and its subflows.
  const [outer, setOuter] = useState(true);
  const [inner, setInner] = useState(false);
  return <Dialog open={outer} onOpenChange={setOuter}><DialogContent><DialogTitle>Settings</DialogTitle><button onClick={() => setInner(true)}>Open guide</button><Dialog open={inner} onOpenChange={setInner}><DialogContent><DialogTitle>Guide</DialogTitle><button>Finish</button></DialogContent></Dialog></DialogContent></Dialog>;
}
test('Escape closes only the top dialog and retains the parent scroll lock', () => {
  render(<Example />);
  fireEvent.click(screen.getByText('Open guide'));
  expect(screen.getByRole('dialog', { name: 'Guide' })).toBeTruthy();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog', { name: 'Guide' })).toBeNull();
  expect(screen.getByRole('dialog', { name: 'Settings' })).toBeTruthy();
  expect(document.body.style.overflow).toBe('hidden');
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.body.style.overflow).not.toBe('hidden');
});
