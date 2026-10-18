import http from 'http';
import fs from 'fs';
import path from 'path';
import { sendSaleNotificationEmail } from './email_service.mjs';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DIR = __dirname;
const DATA_FILE = path.join(DIR, "submissions.json");
const USERS_FILE = path.join(DIR, "users.json");
const UPLOADS_DIR = path.join(DIR, "uploads");

// Ensure folders exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Load submissions
let submissions = [];
if (fs.existsSync(DATA_FILE)) {
  try {
    submissions = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    submissions = [];
  }
}

// Load users
let users = [];
if (fs.existsSync(USERS_FILE)) {
  try {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch (e) {
    users = [];
  }
}

// Active SSE Connections
const sseClients = new Set();

// Keep-Alive Ping every 15s to keep Cloudflare / Render reverse proxy SSE connections open
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(': ping\n\n');
    } catch (e) {
      sseClients.delete(client);
    }
  }
}, 15000);

function broadcastToAdmin(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Helper read JSON body
  const readJson = (callback) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 20 * 1024 * 1024) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload muito grande' }));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        callback(null, parsed);
      } catch (err) {
        callback(err);
      }
    });
  };

  // Health check for Cloud Hosting Platforms (Render, Railway, Fly, etc.)
  if (pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), time: new Date().toISOString() }));
    return;
  }

  // 1. AUTH: Cadastro de novo usuário
  if (pathname === '/api/auth/register' && req.method === 'POST') {
    readJson((err, data) => {
      if (err || !data.email || !data.password || !data.name) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Preencha todos os campos obrigatórios.' }));
        return;
      }

      const existing = users.find(u => u.email.toLowerCase() === data.email.toLowerCase());
      if (existing) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Este e-mail já está cadastrado. Faça login.' }));
        return;
      }

      const newUser = {
        id: 'usr-' + Date.now(),
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        whatsapp: (data.whatsapp || '').trim(),
        password: data.password, // In production this would be hashed
        createdAt: new Date().toISOString(),
        hasPaid: false,
        credits: 0
      };

      users.unshift(newUser);
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

      // Notificar Admin que novo usuário se cadastrou
      broadcastToAdmin({
        type: 'NEW_USER',
        user: { name: newUser.name, email: newUser.email, whatsapp: newUser.whatsapp, time: newUser.createdAt }
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        user: { id: newUser.id, name: newUser.name, email: newUser.email, whatsapp: newUser.whatsapp }
      }));
    });
    return;
  }

  // 2. AUTH: Login
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    readJson((err, data) => {
      if (err || !data.email || !data.password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Informe e-mail e senha.' }));
        return;
      }

      const user = users.find(u => u.email.toLowerCase() === data.email.toLowerCase() && u.password === data.password);
      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'E-mail ou senha incorretos.' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        user: { id: user.id, name: user.name, email: user.email }
      }));
    });
    return;
  }

  // 3. API: Enviar novo prompt e imagem (somente usuários cadastrados)
  if (pathname === '/api/submissions' && req.method === 'POST') {
    readJson((err, data) => {
      if (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Dados inválidos' }));
        return;
      }

      let imageUrl = data.imageUrl || '';

      if (data.imageBase64 && data.imageBase64.startsWith('data:image')) {
        const matches = data.imageBase64.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (matches) {
          const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
          const buffer = Buffer.from(matches[2], 'base64');
          const fileName = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
          const filePath = path.join(UPLOADS_DIR, fileName);
          fs.writeFileSync(filePath, buffer);
          imageUrl = `/uploads/${fileName}`;
        }
      }

      // Se já existir uma submissão pendente para esta sessão, atualiza ela ao invés de duplicar
      if (data.submissionId) {
        const existing = submissions.find(s => s.id === data.submissionId && s.status !== 'PAGO');
        if (existing) {
          existing.prompt = data.prompt || existing.prompt;
          if (imageUrl) existing.imageUrl = imageUrl;
          if (data.userWhatsapp) existing.userWhatsapp = data.userWhatsapp;
          existing.resolution = data.resolution || existing.resolution;
          existing.duration = data.duration || existing.duration;
          existing.status = data.status || existing.status;
          existing.paidAmount = data.paidAmount || existing.paidAmount;
          existing.timestamp = new Date().toISOString();
          fs.writeFileSync(DATA_FILE, JSON.stringify(submissions.slice(0, 500), null, 2));

          broadcastToAdmin({
            type: 'UPDATE_SUBMISSION',
            submission: existing
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, submissionId: existing.id }));
          return;
        }
      }

      const newSubmission = {
        id: 'sub-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
        userName: data.userName || 'Usuário Não Identificado',
        userEmail: data.userEmail || 'Desconhecido',
        userWhatsapp: data.userWhatsapp || '',
        prompt: data.prompt || '',
        imageUrl: imageUrl || 'assets/sweet-resistance.jpg',
        resolution: data.resolution || '768P',
        duration: data.duration || 15,
        status: data.status || 'AGUARDANDO_PAGAMENTO',
        paidAmount: data.paidAmount || 4.99,
        timestamp: new Date().toISOString(),
        ip: req.socket.remoteAddress || '127.0.0.1'
      };

      submissions.unshift(newSubmission);
      fs.writeFileSync(DATA_FILE, JSON.stringify(submissions.slice(0, 500), null, 2));

      broadcastToAdmin({
        type: 'NEW_SUBMISSION',
        submission: newSubmission
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, submissionId: newSubmission.id }));
    });
    return;
  }

  // 4. API: Confirmar Pagamento do Vídeo e Disparar Notificação por E-mail
  if (pathname === '/api/payment/confirm' && req.method === 'POST') {
    readJson(async (err, data) => {
      const submissionId = data.submissionId;
      const amount = data.amount || 4.99;

      const sub = submissions.find(s => s.id === submissionId) || submissions[0];
      if (sub) {
        sub.status = 'PAGO';
        sub.paidAmount = amount;
        sub.paidAt = new Date().toISOString();
        if (data.userEmail && (!sub.userEmail || sub.userEmail === 'Desconhecido')) {
          sub.userEmail = data.userEmail;
        }
        if (data.userName && (!sub.userName || sub.userName === 'Usuário Não Identificado')) {
          sub.userName = data.userName;
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(submissions, null, 2));

        broadcastToAdmin({
          type: 'PAYMENT_RECEIVED',
          submission: sub,
          amount
        });

        // DISPARO AUTOMÁTICO DE E-MAIL PARA xfun.usocom.ia@gmail.com
        try {
          const buyerEmail = sub.userEmail || data.userEmail || 'email_nao_identificado@cliente.com';
          const buyerName = sub.userName || data.userName || 'Cliente Xfun';

          const emailResult = await sendSaleNotificationEmail({
            buyerEmail,
            buyerName,
            amount,
            submissionId: sub.id,
            prompt: sub.prompt,
            resolution: sub.resolution,
            duration: sub.duration
          });

          broadcastToAdmin({
            type: 'SALE_EMAIL_NOTIFICATION',
            emailStatus: emailResult.status,
            recipient: 'xfun.usocom.ia@gmail.com',
            buyerEmail
          });
        } catch (mailErr) {
          console.error('[EMAIL ERROR] Falha no envio da notificação:', mailErr);
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, status: 'PAGO' }));
    });
    return;
  }

  // 5. API: Upload de Vídeo Concluído pelo Administrador
  if (pathname === '/api/admin/upload-video' && req.method === 'POST') {
    const submissionId = parsedUrl.searchParams.get('submissionId');
    if (!submissionId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'submissionId é obrigatório' }));
      return;
    }

    const sub = submissions.find(s => s.id === submissionId);
    if (!sub) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Submissão não encontrada' }));
      return;
    }

    const rawFileName = req.headers['x-file-name'] ? decodeURIComponent(req.headers['x-file-name']) : 'video.mp4';
    const ext = path.extname(rawFileName) || '.mp4';
    const videoFileName = `delivered-${submissionId}-${Date.now()}${ext}`;
    const videoFilePath = path.join(UPLOADS_DIR, videoFileName);
    const writeStream = fs.createWriteStream(videoFilePath);

    req.pipe(writeStream);

    writeStream.on('finish', () => {
      const videoUrl = `/uploads/${videoFileName}`;
      sub.deliveredVideoUrl = videoUrl;
      sub.status = 'ENTREGUE';
      sub.deliveredAt = new Date().toISOString();
      fs.writeFileSync(DATA_FILE, JSON.stringify(submissions.slice(0, 500), null, 2));

      console.log(`[VIDEO ENTREGUE] Vídeo salvo para pedido ${submissionId}: ${videoUrl}`);

      broadcastToAdmin({
        type: 'VIDEO_DELIVERED',
        submissionId: sub.id,
        userEmail: sub.userEmail,
        videoUrl: videoUrl,
        prompt: sub.prompt,
        deliveredAt: sub.deliveredAt
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, videoUrl, submission: sub }));
    });

    writeStream.on('error', (err) => {
      console.error('Erro ao salvar vídeo entregue:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    });
    return;
  }

  // 6. API: Consultar Status de Entrega do Vídeo para o Cliente
  if (pathname === '/api/submission/status' && req.method === 'GET') {
    const submissionId = parsedUrl.searchParams.get('id');
    const sub = submissions.find(s => s.id === submissionId);
    if (sub) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        status: sub.status,
        deliveredVideoUrl: sub.deliveredVideoUrl || null,
        prompt: sub.prompt,
        imageUrl: sub.imageUrl
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Pedido não encontrado' }));
    }
    return;
  }

  // 7. API: Stream em tempo real para Clientes
  if (pathname === '/api/client/stream' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('retry: 2000\n\n');
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED_CLIENT' })}\n\n`);

    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // 8. API: Stream em tempo real para Admin (SSE)
  if (pathname === '/api/admin/stream' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('retry: 2000\n\n');
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', total: submissions.length, totalUsers: users.length })}\n\n`);

    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // 6. API: Listar Submissões e Usuários para Admin
  if (pathname === '/api/admin/submissions' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, submissions, totalUsers: users.length }));
    return;
  }

  // 7. API: Limpar Histórico (Admin)
  if (pathname === '/api/admin/clear' && req.method === 'POST') {
    submissions = [];
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
    broadcastToAdmin({ type: 'CLEARED' });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // 8. Arquivos Estáticos
  let reqPath = decodeURI(pathname);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const filePath = path.join(DIR, reqPath);
  const ext = path.extname(filePath).toLowerCase();

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Support HTTP Range Requests for HTML5 Video Streaming
    const range = req.headers.range;
    if (range && ext === '.mp4') {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      file.pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT} (port ${PORT})`);
});
