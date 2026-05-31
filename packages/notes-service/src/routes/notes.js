import { Router } from 'express';
import { query } from '../db/connection.js';

const router = Router();

// Middleware: require authenticated user
const requireUser = (req, res, next) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

router.use(requireUser);

// GET /notes — List notes
router.get('/', async (req, res, next) => {
  try {
    const { folderId, type, includeDeleted, limit = 50, offset = 0 } = req.query;
    const userId = req.user.userId;

    let sql = `SELECT id, user_id, folder_id, title, type, version, is_deleted, created_at, updated_at
               FROM notes WHERE user_id = $1`;
    const params = [userId];
    let paramIdx = 2;

    if (!includeDeleted) {
      sql += ` AND is_deleted = FALSE`;
    }
    if (folderId) {
      sql += ` AND folder_id = $${paramIdx++}`;
      params.push(folderId);
    }
    if (type) {
      sql += ` AND type = $${paramIdx++}`;
      params.push(type);
    }

    sql += ` ORDER BY updated_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    // Get total count
    let countSql = `SELECT COUNT(*) FROM notes WHERE user_id = $1`;
    const countParams = [userId];
    if (!includeDeleted) countSql += ` AND is_deleted = FALSE`;

    const countResult = await query(countSql, countParams);

    res.json({
      notes: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    next(err);
  }
});

// GET /notes/search?q=
router.get('/search', async (req, res, next) => {
  try {
    const { q, limit = 20 } = req.query;
    const userId = req.user.userId;

    if (!q || q.trim().length === 0) {
      return res.json({ notes: [] });
    }

    const result = await query(
      `SELECT id, title, type, folder_id, updated_at,
              ts_rank(search_vector, plainto_tsquery('english', $2)) AS rank,
              ts_headline('english', content, plainto_tsquery('english', $2),
                'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=20') AS snippet
       FROM notes
       WHERE user_id = $1 AND is_deleted = FALSE AND search_vector @@ plainto_tsquery('english', $2)
       ORDER BY rank DESC
       LIMIT $3`,
      [userId, q, parseInt(limit)]
    );

    res.json({ notes: result.rows, query: q });
  } catch (err) {
    next(err);
  }
});

// GET /notes/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, user_id, folder_id, title, type, content, version, is_deleted, created_at, updated_at
       FROM notes WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ note: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /notes
router.post('/', async (req, res, next) => {
  try {
    const { title, type = 'markdown', content = '', folderId = null } = req.body;
    const userId = req.user.userId;

    const result = await query(
      `INSERT INTO notes (user_id, folder_id, title, type, content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, folder_id, title, type, content, version, is_deleted, created_at, updated_at`,
      [userId, folderId, title || 'Untitled', type, content]
    );

    res.status(201).json({ note: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /notes/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { title, content, folderId, version } = req.body;
    const userId = req.user.userId;

    // Optimistic concurrency check
    if (version !== undefined) {
      const current = await query(
        'SELECT version FROM notes WHERE id = $1 AND user_id = $2',
        [req.params.id, userId]
      );

      if (current.rows.length === 0) {
        return res.status(404).json({ error: 'Note not found' });
      }

      if (current.rows[0].version !== version) {
        return res.status(409).json({
          error: 'Version conflict',
          serverVersion: current.rows[0].version,
          clientVersion: version,
        });
      }
    }

    const setClauses = ['updated_at = NOW()', 'version = version + 1'];
    const params = [req.params.id, userId];
    let paramIdx = 3;

    if (title !== undefined) {
      setClauses.push(`title = $${paramIdx++}`);
      params.push(title);
    }
    if (content !== undefined) {
      setClauses.push(`content = $${paramIdx++}`);
      params.push(content);
    }
    if (folderId !== undefined) {
      setClauses.push(`folder_id = $${paramIdx++}`);
      params.push(folderId);
    }

    const result = await query(
      `UPDATE notes SET ${setClauses.join(', ')}
       WHERE id = $1 AND user_id = $2
       RETURNING id, user_id, folder_id, title, type, content, version, is_deleted, created_at, updated_at`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ note: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /notes/:id (soft delete)
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE notes SET is_deleted = TRUE, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /notes/sync — Bulk sync from offline client
router.post('/sync', async (req, res, next) => {
  try {
    const { changes, lastSyncAt } = req.body;
    const userId = req.user.userId;
    const results = { synced: [], conflicts: [], serverChanges: [] };

    // Process client changes
    if (changes && changes.length > 0) {
      for (const change of changes) {
        try {
          if (change.action === 'create') {
            const result = await query(
              `INSERT INTO notes (id, user_id, folder_id, title, type, content, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (id) DO NOTHING
               RETURNING id`,
              [change.id, userId, change.folderId, change.title, change.type, change.content, change.createdAt, change.updatedAt]
            );
            if (result.rows.length > 0) {
              results.synced.push({ id: change.id, action: 'created' });
            }
          } else if (change.action === 'update') {
            const current = await query('SELECT version, updated_at FROM notes WHERE id = $1 AND user_id = $2', [change.id, userId]);

            if (current.rows.length === 0) {
              results.conflicts.push({ id: change.id, reason: 'not_found' });
              continue;
            }

            // Last-write-wins by timestamp
            if (new Date(change.updatedAt) > new Date(current.rows[0].updated_at)) {
              await query(
                `UPDATE notes SET title = $3, content = $4, folder_id = $5, version = version + 1, updated_at = $6
                 WHERE id = $1 AND user_id = $2`,
                [change.id, userId, change.title, change.content, change.folderId, change.updatedAt]
              );
              results.synced.push({ id: change.id, action: 'updated' });
            } else {
              results.conflicts.push({ id: change.id, reason: 'server_newer' });
            }
          } else if (change.action === 'delete') {
            await query(
              `UPDATE notes SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1 AND user_id = $2`,
              [change.id, userId]
            );
            results.synced.push({ id: change.id, action: 'deleted' });
          }
        } catch (err) {
          results.conflicts.push({ id: change.id, reason: err.message });
        }
      }
    }

    // Get server changes since last sync
    if (lastSyncAt) {
      const serverChanges = await query(
        `SELECT id, folder_id, title, type, content, version, is_deleted, created_at, updated_at
         FROM notes WHERE user_id = $1 AND updated_at > $2
         ORDER BY updated_at ASC`,
        [userId, lastSyncAt]
      );
      results.serverChanges = serverChanges.rows;
    }

    results.syncedAt = new Date().toISOString();
    res.json(results);
  } catch (err) {
    next(err);
  }
});

export default router;
