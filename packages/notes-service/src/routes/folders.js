import { Router } from 'express';
import { query } from '../db/connection.js';

const router = Router();

const requireUser = (req, res, next) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

router.use(requireUser);

// GET /folders — List folders (tree)
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, parent_id, created_at, updated_at FROM folders
       WHERE user_id = $1 ORDER BY name ASC`,
      [req.user.userId]
    );

    // Build tree structure
    const folders = result.rows;
    const map = new Map();
    const roots = [];

    folders.forEach(f => {
      map.set(f.id, { ...f, children: [] });
    });

    folders.forEach(f => {
      const node = map.get(f.id);
      if (f.parent_id && map.has(f.parent_id)) {
        map.get(f.parent_id).children.push(node);
      } else {
        roots.push(node);
      }
    });

    res.json({ folders: roots, flat: folders });
  } catch (err) {
    next(err);
  }
});

// POST /folders
router.post('/', async (req, res, next) => {
  try {
    const { name, parentId = null } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    const result = await query(
      `INSERT INTO folders (user_id, name, parent_id)
       VALUES ($1, $2, $3)
       RETURNING id, name, parent_id, created_at, updated_at`,
      [req.user.userId, name.trim(), parentId]
    );

    res.status(201).json({ folder: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /folders/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, parentId } = req.body;
    const setClauses = ['updated_at = NOW()'];
    const params = [req.params.id, req.user.userId];
    let paramIdx = 3;

    if (name !== undefined) {
      setClauses.push(`name = $${paramIdx++}`);
      params.push(name.trim());
    }
    if (parentId !== undefined) {
      setClauses.push(`parent_id = $${paramIdx++}`);
      params.push(parentId);
    }

    const result = await query(
      `UPDATE folders SET ${setClauses.join(', ')}
       WHERE id = $1 AND user_id = $2
       RETURNING id, name, parent_id, created_at, updated_at`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    res.json({ folder: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /folders/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM folders WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
