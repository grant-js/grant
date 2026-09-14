import { describe, expect, it } from 'vitest';

import { escapeHtml } from '@/lib/email/html-escape.lib';

describe('escapeHtml', () => {
  it('escapes markup and quotes', () => {
    expect(escapeHtml(`<img src="x" onerror='alert(1)'>`)).toBe(
      '&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;'
    );
  });
});
