import log from 'loglevel';

if (import.meta.env.DEV) {
  log.setLevel('debug');
} else {
  log.setLevel('silent');
}

export function logRaw(...args: unknown[]): void {
  log.debug(...args);
}

export function logValue(name: string, value: any): void {
  log.debug(`${name}:`, value);
}

export function logStore(storeName: string, value: any): void {
  logValue(`STORE ${storeName}`, value);
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
