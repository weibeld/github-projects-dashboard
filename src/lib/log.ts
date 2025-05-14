import log from 'loglevel';

if (import.meta.env.DEV) {
  log.setLevel('debug');
} else {
  log.setLevel('silent');
}

export default log;

/* Log the name of a function and an arbitrary message */
export function logFn(fnName: string, msg: string) {
  log.debug(`[${fnName}()]`, msg);
}

/* Log the name of a function and its arguments (pass args as single object) */
export function logFnArgs(fnName: string, ...args: any[]) {
  log.debug(`[${fnName}()]`, ...args);
}

/* Log the name of a function and its return value */
export function logFnReturn(fnName: string, retVal: any) {
  log.debug(`↳ [${fnName}()]`, JSON.stringify(retVal));
}
