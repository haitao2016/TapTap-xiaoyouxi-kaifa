export const spawn = () => { throw new Error('child_process not available in browser') };
export const exec = () => { throw new Error('child_process not available in browser') };
export const execFile = () => { throw new Error('child_process not available in browser') };
export const fork = () => { throw new Error('child_process not available in browser') };
export const spawnSync = () => { throw new Error('child_process not available in browser') };
export const execSync = () => { throw new Error('child_process not available in browser') };
export const execFileSync = () => { throw new Error('child_process not available in browser') };
export const forkSync = () => { throw new Error('child_process not available in browser') };

export default {
  spawn,
  exec,
  execFile,
  fork,
  spawnSync,
  execSync,
  execFileSync,
  forkSync,
};
