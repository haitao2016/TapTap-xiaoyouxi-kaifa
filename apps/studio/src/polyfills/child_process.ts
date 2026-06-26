/**
 * Browser-safe mock for Node.js child_process module
 * All operations are no-ops that return empty results.
 */

export function spawn(_command: string, _args?: string[], _options?: any): any {
  return {
    stdout: { on: () => {}, setEncoding: () => {} },
    stderr: { on: () => {}, setEncoding: () => {} },
    on: (event: string, cb: Function) => {
      if (event === 'close') {
        setTimeout(() => cb(0), 0);
      }
    },
    kill: () => {},
  };
}

export function exec(_command: string, _options: any, callback?: Function): any {
  if (typeof _options === 'function') {
    callback = _options;
  }
  if (callback) {
    setTimeout(() => callback(null, '', ''), 0);
  }
  return { on: () => {}, kill: () => {} };
}

export function execFile(_file: string, _args?: string[], _options?: any, callback?: Function): any {
  if (typeof _options === 'function') {
    callback = _options;
  }
  if (callback) {
    setTimeout(() => callback(null, '', ''), 0);
  }
  return { on: () => {}, kill: () => {} };
}

export function fork(_modulePath: string, _args?: string[], _options?: any): any {
  return {
    on: () => {},
    send: () => {},
    kill: () => {},
    disconnect: () => {},
  };
}

export function spawnSync(_command: string, _args?: string[], _options?: any): any {
  return {
    status: 0,
    stdout: Buffer.from(''),
    stderr: Buffer.from(''),
    error: null,
  };
}

export function execSync(_command: string, _options?: any): Buffer {
  return Buffer.from('');
}

export function execFileSync(_file: string, _args?: string[], _options?: any): Buffer {
  return Buffer.from('');
}

export default {
  spawn,
  exec,
  execFile,
  fork,
  spawnSync,
  execSync,
  execFileSync,
};
