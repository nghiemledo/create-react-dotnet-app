import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False during server rendering and hydration, true afterwards. The persisted Zustand stores read
 * localStorage synchronously in the browser, so anything that depends on them must wait for this to
 * avoid hydration mismatches.
 */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
