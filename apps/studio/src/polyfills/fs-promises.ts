/**
 * Browser-compatible fs/promises polyfill
 * Exports only the promises namespace from fs
 */

import { promises } from './fs';

export default promises;
export const { readFile, writeFile, mkdir, readdir, stat, unlink, rmdir, rm, copyFile, rename, access, appendFile, realpath } = promises;
