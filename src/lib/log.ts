import log from 'loglevel';

if (import.meta.env.DEV) {
  log.setLevel('debug');
} else {
  log.setLevel('silent');
}

export default log;

/* Log the name of a function and its arguments */
export function logFnArgs(fnName: string, ...args: any[]) {
  log.debug(`[${fnName}()]`, ...args);
}

/* Log the name of a function and its return value */
export function logFnReturn(fnName: string, retVal: any) {
  log.debug(`↳ [${fnName}()]`, JSON.stringify(retVal));
}
