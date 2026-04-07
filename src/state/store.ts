import { createStore } from 'jotai';

/**
 * Optional: a shared store instance if you want non-React access,
 * or multi-root / testing patterns. Otherwise you can just use Provider-less atoms.
 */
export const appStore = createStore();

