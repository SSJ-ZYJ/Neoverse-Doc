import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { shouldSuppressHomeRouteEntry } from './home-route-shell-state';

describe('home route shell entry state', () => {
  it('keeps direct entry enabled for an idle initial mount', () => {
    assert.equal(shouldSuppressHomeRouteEntry(false, false, false), false);
  });

  it('does not replay direct entry after a managed transition settles', () => {
    const duringTransition = shouldSuppressHomeRouteEntry(false, true, false);
    assert.equal(shouldSuppressHomeRouteEntry(duringTransition, false, false), true);
  });

  it('does not replay direct entry after a BFCache restore frame', () => {
    const duringRestore = shouldSuppressHomeRouteEntry(false, false, true);
    assert.equal(shouldSuppressHomeRouteEntry(duringRestore, false, false), true);
  });
});
