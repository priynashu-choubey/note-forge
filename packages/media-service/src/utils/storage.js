import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_ROOT = process.env.STORAGE_PATH || path.join(__dirname, '..', '..', 'storage');

export const getStoragePath = () => STORAGE_ROOT;

export const ensureStorageDir = async () => {
  try {
    await fs.mkdir(path.join(STORAGE_ROOT, 'originals'), { recursive: true });
    await fs.mkdir(path.join(STORAGE_ROOT, 'thumbnails'), { recursive: true });
    console.log('[Storage] Directory ready:', STORAGE_ROOT);
  } catch (err) {
    console.error('[Storage] Failed to create directory:', err);
    throw err;
  }
};

export const getFilePath = (key) => path.join(STORAGE_ROOT, 'originals', key);
export const getThumbnailPath = (key) => path.join(STORAGE_ROOT, 'thumbnails', key);

export const deleteFile = async (key) => {
  try {
    await fs.unlink(getFilePath(key));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
};

export const deleteThumbnail = async (key) => {
  try {
    await fs.unlink(getThumbnailPath(key));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
};
