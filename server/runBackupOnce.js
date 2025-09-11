// filepath: /home/skitt/Simon/wgcastingapp/server/runBackupOnce.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

(async () => {
  try {
    const svc = require('./backupService');
    if (!svc || typeof svc.performBackup !== 'function') {
      console.error('Backup service not loaded or performBackup is not a function:', svc);
      process.exit(2);
    }
    const ok = await svc.performBackup();
    process.exit(ok ? 0 : 1);
  } catch (e) {
    console.error('Backup runner failed:', e);
    process.exit(1);
  }
})();

