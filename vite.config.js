import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { app as sqliteApiApp } from './server/index.js';

function sqliteDatabasePlugin() {
  return {
    name: 'sqlite-database-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/api')) {
          return sqliteApiApp(req, res, next);
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/api')) {
          return sqliteApiApp(req, res, next);
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), sqliteDatabasePlugin()],
});
