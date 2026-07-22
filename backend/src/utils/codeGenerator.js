const { customAlphabet } = require('nanoid');

// Excludes ambiguous characters (0/O, 1/I/L) since codes are read aloud/typed by a group.
const generateSessionCode = customAlphabet('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 6);

module.exports = { generateSessionCode };
