import { app } from '../server/index.js';

export default function handler(req, res) {
  // Asegurar que la URL comience con /api para compatibilidad estricta con Express en Vercel Serverless
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
}
