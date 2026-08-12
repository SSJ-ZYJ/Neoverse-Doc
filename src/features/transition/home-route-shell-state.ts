export function shouldSuppressHomeRouteEntry(
  wasSuppressed: boolean,
  isManagedTransition: boolean,
  isPageCacheRestore: boolean,
) {
  return wasSuppressed || isManagedTransition || isPageCacheRestore;
}
