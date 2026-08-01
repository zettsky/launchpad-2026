const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /devices/:deviceId/sessions — every session this device is host or member of,
// excluding ones it has dismissed ("End Session" on the client). Backs the Home
// screen's "ongoing sessions" list.
router.get('/:deviceId/sessions', (req, res) => {
  const rows = db
    .prepare(
      `SELECT
         s.code, s.group_name, s.state, s.deadline,
         m.id as member_id, m.is_host,
         (SELECT display_name FROM members WHERE session_id = s.id AND is_host = 1) as host_name,
         (SELECT COUNT(*) FROM members WHERE session_id = s.id) as member_count,
         (SELECT COUNT(*) FROM preferences WHERE session_id = s.id) as preferences_count
       FROM sessions s
       JOIN members m ON m.session_id = s.id
       WHERE m.device_id = ? AND m.dismissed_at IS NULL
       ORDER BY s.created_at DESC`
    )
    .all(req.params.deviceId);

  const sessions = rows.map((row) => ({
    code: row.code,
    groupName: row.group_name || null,
    hostName: row.host_name || null,
    memberId: row.member_id,
    isHost: !!row.is_host,
    memberCount: row.member_count,
    preferencesCount: row.preferences_count,
    deadline: row.deadline,
    state: row.state,
  }));

  res.json({ sessions });
});

module.exports = router;
