import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DocCallout, DocCalloutContainer } from '../src/components/mdx/doc-callout.tsx';

const warning = renderToStaticMarkup(
  createElement(
    DocCallout,
    { id: 'migration-callout', title: 'Before you continue', type: 'warn' },
    createElement('p', null, 'Keep the original guidance.'),
  ),
);
assert.ok(warning.includes('ui-notice--warning'));
assert.ok(warning.includes('data-callout-type="warn"'));
assert.ok(warning.includes('id="migration-callout"'));
assert.ok(warning.includes('Before you continue'));
assert.ok(warning.includes('Keep the original guidance.'));
assert.ok(warning.includes('lucide-triangle-alert'));

const error = renderToStaticMarkup(
  createElement(
    DocCalloutContainer,
    {
      'aria-label': 'Error details',
      icon: createElement('span', { 'data-custom-icon': '' }, 'Custom icon'),
      type: 'error',
    },
    'An error occurred.',
  ),
);
assert.ok(error.includes('ui-notice--danger'));
assert.ok(error.includes('aria-label="Error details"'));
assert.ok(error.includes('data-custom-icon=""'));
assert.ok(error.includes('An error occurred.'));

console.log('Fumadocs callout compatibility passed: aliases, status surfaces, icons, title, and native attributes.');