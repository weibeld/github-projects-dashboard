import type { Readable } from 'svelte/store';
import log from 'loglevel';

if (import.meta.env.DEV) {
  log.setLevel('debug');
} else {
  log.setLevel('silent');
}

export function logRaw(...args: unknown[]): void {
  log.debug(...args);
}

/* Log a single name-value pair */
export function logValue(name: string, value: any): void {
  log.debug(`${name}:`, value);
}

/* Log any changes to the passed store by printing the new value of the store */
export function logStore<T>(store: Readable<T>, storeName: string): void {
  store.subscribe(val => { logValue(`STORE ${storeName}`, val); });
}

/* Log the name of a function and an optional message */
export function logFn(fnName: string, msg: string = ''): void {
  log.debug(`[${fnName}()]`, msg);
}

/* Log the name of a function and its arguments (pass args as single object) */
export function logFnArgs(fnName: string, ...args: any[]): void {
  log.debug(`[${fnName}()]`, ...args);
}

/* Log the name of a function and its return value and return the passed
 * return value to the caller. */
export function logFnReturn(fnName: string, ret: any): any {
  log.debug(`↳ [${fnName}()]`, JSON.stringify(ret));
  return ret;
}
