export const writeFileSync = () => { throw new Error('fs not available in browser') };
export const readFileSync = () => { throw new Error('fs not available in browser') };
export const existsSync = () => false;
export const mkdirSync = () => { throw new Error('fs not available in browser') };
export const rmSync = () => { throw new Error('fs not available in browser') };
export const statSync = () => { throw new Error('fs not available in browser') };
export const readdirSync = () => { throw new Error('fs not available in browser') };
export const unlinkSync = () => { throw new Error('fs not available in browser') };
export const renameSync = () => { throw new Error('fs not available in browser') };
export const copyFileSync = () => { throw new Error('fs not available in browser') };
export const appendFileSync = () => { throw new Error('fs not available in browser') };
export const lstatSync = () => { throw new Error('fs not available in browser') };
export const realpathSync = () => { throw new Error('fs not available in browser') };
export const rmdirSync = () => { throw new Error('fs not available in browser') };
export const createReadStream = () => { throw new Error('fs not available in browser') };
export const createWriteStream = () => { throw new Error('fs not available in browser') };
export const watch = () => { throw new Error('fs not available in browser') };
export const watchFile = () => { throw new Error('fs not available in browser') };
export const unwatchFile = () => { throw new Error('fs not available in browser') };
export const accessSync = () => { throw new Error('fs not available in browser') };
export const chmodSync = () => { throw new Error('fs not available in browser') };
export const chownSync = () => { throw new Error('fs not available in browser') };
export const closeSync = () => { throw new Error('fs not available in browser') };
export const openSync = () => { throw new Error('fs not available in browser') };
export const readSync = () => { throw new Error('fs not available in browser') };
export const writeSync = () => { throw new Error('fs not available in browser') };
export const fsyncSync = () => { throw new Error('fs not available in browser') };
export const fdatasyncSync = () => { throw new Error('fs not available in browser') };
export const ftruncateSync = () => { throw new Error('fs not available in browser') };
export const futimesSync = () => { throw new Error('fs not available in browser') };
export const fstatSync = () => { throw new Error('fs not available in browser') };
export const linkSync = () => { throw new Error('fs not available in browser') };
export const symlinkSync = () => { throw new Error('fs not available in browser') };
export const readlinkSync = () => { throw new Error('fs not available in browser') };
export const mkdtempSync = () => { throw new Error('fs not available in browser') };
export const cpSync = () => { throw new Error('fs not available in browser') };
export const lutimesSync = () => { throw new Error('fs not available in browser') };
export const opendirSync = () => { throw new Error('fs not available in browser') };

export const promises = {
  readFile: async () => { throw new Error('fs not available in browser') },
  writeFile: async () => { throw new Error('fs not available in browser') },
  mkdir: async () => { throw new Error('fs not available in browser') },
  readdir: async () => { throw new Error('fs not available in browser') },
  stat: async () => { throw new Error('fs not available in browser') },
  unlink: async () => { throw new Error('fs not available in browser') },
  rm: async () => { throw new Error('fs not available in browser') },
  copyFile: async () => { throw new Error('fs not available in browser') },
  rename: async () => { throw new Error('fs not available in browser') },
  access: async () => { throw new Error('fs not available in browser') },
  appendFile: async () => { throw new Error('fs not available in browser') },
  chmod: async () => { throw new Error('fs not available in browser') },
  chown: async () => { throw new Error('fs not available in browser') },
  lstat: async () => { throw new Error('fs not available in browser') },
  symlink: async () => { throw new Error('fs not available in browser') },
  link: async () => { throw new Error('fs not available in browser') },
  readlink: async () => { throw new Error('fs not available in browser') },
  realpath: async () => { throw new Error('fs not available in browser') },
  utimes: async () => { throw new Error('fs not available in browser') },
  rmdir: async () => { throw new Error('fs not available in browser') },
  mkdtemp: async () => { throw new Error('fs not available in browser') },
  open: async () => { throw new Error('fs not available in browser') },
  opendir: async () => { throw new Error('fs not available in browser') },
  watch: async () => { throw new Error('fs not available in browser') },
  cp: async () => { throw new Error('fs not available in browser') },
};

export default {
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  statSync,
  readdirSync,
  unlinkSync,
  renameSync,
  copyFileSync,
  appendFileSync,
  lstatSync,
  realpathSync,
  rmdirSync,
  createReadStream,
  createWriteStream,
  watch,
  watchFile,
  unwatchFile,
  accessSync,
  chmodSync,
  chownSync,
  closeSync,
  openSync,
  readSync,
  writeSync,
  fsyncSync,
  fdatasyncSync,
  ftruncateSync,
  futimesSync,
  fstatSync,
  linkSync,
  symlinkSync,
  readlinkSync,
  mkdtempSync,
  cpSync,
  lutimesSync,
  opendirSync,
  promises,
};
