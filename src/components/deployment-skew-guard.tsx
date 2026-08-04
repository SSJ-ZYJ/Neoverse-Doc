'use client';

import { useEffect } from 'react';

const RELOAD_KEY = '__neoverse_deployment_reload__';
const RELOAD_COOLDOWN_MS = 30_000;

function isDeploymentSkewError(message: string) {
  return /ChunkLoadError|Loading chunk|dynamically imported module|module script failed|RSC payload/i.test(
    message,
  );
}

function recoverFromDeploymentSkew() {
  const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);

  if (Date.now() - lastReload < RELOAD_COOLDOWN_MS) return;

  sessionStorage.setItem(RELOAD_KEY, String(Date.now()));

  const url = new URL(window.location.href);
  url.searchParams.set('__reload', String(Date.now()));
  window.location.replace(url);
}

export function DeploymentSkewGuard() {
  useEffect(() => {
    const handleResourceError = (event: ErrorEvent) => {
      const target = event.target as Element | null;
      const resourceUrl = target?.getAttribute('src') ?? target?.getAttribute('href') ?? '';
      const message = `${event.message ?? ''} ${event.error?.message ?? ''}`;
      const tagName = target?.tagName;
      const isScriptOrStylesheet =
        tagName === 'SCRIPT' ||
        (tagName === 'LINK' && target?.getAttribute('rel') === 'stylesheet');

      if (
        (isScriptOrStylesheet && resourceUrl.includes('/_next/static/')) ||
        isDeploymentSkewError(message)
      ) {
        recoverFromDeploymentSkew();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = String(event.reason?.message ?? event.reason ?? '');

      if (isDeploymentSkewError(message)) {
        recoverFromDeploymentSkew();
      }
    };

    window.addEventListener('error', handleResourceError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleResourceError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
