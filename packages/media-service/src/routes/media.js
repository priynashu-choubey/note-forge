import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/connection.js';
import { getFilePath, getThumbnailPath, deleteFile, deleteThumbnail, getStoragePath } from '../utils/storage.js';

const router = Router();

// Multer configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(getStoragePath(), 'originals'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

const requireUser = (req, res, next) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

router.use(requireUser);

// POST /media/upload
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { noteId } = req.body;
    const file = req.file;
    const storageKey = file.filename;
    let thumbnailKey = null;

    // Generate thumbnail for images
    if (file.mimetype.startsWith('image/') && file.mimetype !== 'image/svg+xml') {
      try {
        thumbnailKey = `thumb_${storageKey}`;
        await sharp(file.path)
          .resize(300, 300, { fit: 'cover', withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toFile(getThumbnailPath(thumbnailKey));
      } catch (err) {
        console.error('[Media] Thumbnail generation failed:', err.message);
        thumbnailKey = null;
      }
    }

    // Save metadata to DB
    const result = await query(
      `INSERT INTO attachments (note_id, user_id, filename, mime_type, size_bytes, storage_key, thumbnail_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, note_id, filename, mime_type, size_bytes, thumbnail_key, created_at`,
      [noteId || null, req.user.userId, file.originalname, file.mimetype, file.size, storageKey, thumbnailKey]
    );

    res.status(201).json({ attachment: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /media/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM attachments WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const attachment = result.rows[0];
    const filePath = getFilePath(attachment.storage_key);

    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.setHeader('Content-Type', attachment.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${attachment.filename}"`);
    const fileBuffer = await fs.readFile(filePath);
    res.send(fileBuffer);
  } catch (err) {
    next(err);
  }
});

// GET /media/:id/thumbnail
router.get('/:id/thumbnail', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM attachments WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].thumbnail_key) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    const thumbPath = getThumbnailPath(result.rows[0].thumbnail_key);

    try {
      await fs.access(thumbPath);
    } catch {
      return res.status(404).json({ error: 'Thumbnail file not found' });
    }

    res.setHeader('Content-Type', 'image/jpeg');
    const fileBuffer = await fs.readFile(thumbPath);
    res.send(fileBuffer);
  } catch (err) {
    next(err);
  }
});

// GET /media/note/:noteId
router.get('/note/:noteId', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, note_id, filename, mime_type, size_bytes, thumbnail_key, created_at
       FROM attachments WHERE note_id = $1 AND user_id = $2
       ORDER BY created_at DESC`,
      [req.params.noteId, req.user.userId]
    );

    res.json({ attachments: result.rows });
  } catch (err) {
    next(err);
  }
});

// DELETE /media/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM attachments WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const attachment = result.rows[0];

    // Delete files from disk
    await deleteFile(attachment.storage_key);
    if (attachment.thumbnail_key) {
      await deleteThumbnail(attachment.thumbnail_key);
    }

    // Delete from DB
    await query('DELETE FROM attachments WHERE id = $1', [attachment.id]);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
