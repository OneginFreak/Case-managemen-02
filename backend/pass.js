const bcrypt = require('bcrypt');
bcrypt.hash('password123', 10, (err, hash) => {
  if (err) console.error(err);
  console.log(hash);
});

INSERT INTO users (username, password, role, created_at)
VALUES ('admin2', '$2b$10$wQEIYlRgghlVA6KCIoc8mO3/J.vFS6s2SmQhhMJbprzIZYdzNLt06', 'admin', CURRENT_TIMESTAMP);
$2b$10$wQEIYlRgghlVA6KCIoc8mO3/J.vFS6s2SmQhhMJbprzIZYdzNLt06