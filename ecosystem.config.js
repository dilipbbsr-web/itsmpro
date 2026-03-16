// ════════════════════════════════════════════════════
// ITSM Pro — PM2 Ecosystem Config
// Usage:
//   pm2 start ecosystem.config.js
//   pm2 save
//   pm2 startup   (auto-start on reboot)
// ════════════════════════════════════════════════════
module.exports = {
  apps: [
    {
      name:      'itsmpro-api',
      script:    './backend/src/server.js',
      instances: 'max',           // use all CPU cores (cluster mode)
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT:     5000,
      },
      // Auto-restart on crash
      autorestart:  true,
      watch:        false,
      max_memory_restart: '512M',

      // Graceful reload
      kill_timeout:   5000,
      listen_timeout: 10000,
      shutdown_with_message: true,

      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file:   './logs/pm2-out.log',
      error_file: './logs/pm2-err.log',
      merge_logs: true,
      log_type:   'json',

      // Health monitoring
      exp_backoff_restart_delay: 100,
    }
  ],
};
