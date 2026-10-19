import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { sendSaleNotificationEmail } from './email_service.mjs';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Server-side security structures
const adminSessions = new Map(); // token -> { createdAt, expiresAt }
const adminLoginAttempts = new Map(); // ip -> { count, blockedUntil }
const rateLimitMap = new Map(); // key -> timestamps array

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

function checkRateLimit(ip, action, maxAllowed, windowMs) {
  const key = `${ip}:${action}`;
  const now = Date.now();
  const list = (rateLimitMap.get(key) || []).filter(t => now - t < windowMs);
  if (list.length >= maxAllowed) {
    rateLimitMap.set(key, list);
    return false;
  }
  list.push(now);
  rateLimitMap.set(key, list);
  return true;
}

function validateImageMagicBytes(buffer) {
  if (!buffer || buffer.length < 12) return null;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'jpg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
      buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) return 'png';
  // WEBP: RIFF....WEBP
  const riff = buffer.toString('ascii', 0, 4);
  const webp = buffer.toString('ascii', 8, 12);
  if (riff === 'RIFF' && webp === 'WEBP') return 'webp';
  return null;
}

function getAdminToken(req, parsedUrl) {
  const auth = req.headers['authorization'];
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  return parsedUrl.searchParams.get('token');
}

function verifyAdminAuth(req, res, parsedUrl) {
  const token = getAdminToken(req, parsedUrl);
  if (!token) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Acesso não autorizado. Faça login no painel.' }));
    return false;
  }
  const session = adminSessions.get(token);
  if (!session || Date.now() > session.expiresAt) {
    adminSessions.delete(token);
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Sessão expirada ou inválida. Faça login novamente.' }));
    return false;
  }
  return true;
}
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

  // 0. AUTH ADMIN: Login com Token Criptográfico e Bloqueio Anti-Brute Force
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    const ip = getClientIp(req);
    const attempt = adminLoginAttempts.get(ip) || { count: 0, blockedUntil: 0 };

    if (attempt.blockedUntil && Date.now() < attempt.blockedUntil) {
      const remainingMinutes = Math.ceil((attempt.blockedUntil - Date.now()) / 60000);
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `IP temporariamente bloqueado por tentativas incorretas. Tente novamente em ${remainingMinutes} minuto(s).` }));
      return;
    }

    readJson((err, data) => {
      if (err || !data || !data.password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Senha não fornecida.' }));
        return;
      }

      if (data.password !== ADMIN_PASSWORD) {
        attempt.count++;
        if (attempt.count >= 5) {
          attempt.blockedUntil = Date.now() + 15 * 60 * 1000; // 15 minutos de bloqueio
        }
        adminLoginAttempts.set(ip, attempt);

        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: attempt.count >= 5 
            ? 'Muitas tentativas incorretas. Seu IP foi bloqueado por 15 minutos.' 
            : `Senha incorreta. Tentativa ${attempt.count} de 5.`
        }));
        return;
      }

      // Senha correta -> Reset tentativas e gera token seguro
      adminLoginAttempts.delete(ip);
      const token = crypto.randomBytes(32).toString('hex');
      adminSessions.set(token, {
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 horas de validade
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, token }));
    });
    return;
  }

  // 1. AUTH: Cadastro de novo usuário (com Rate Limiting Anti-Flood)
  if (pathname === '/api/auth/register' && req.method === 'POST') {
    const ip = getClientIp(req);
    if (!checkRateLimit(ip, 'register', 5, 60 * 60 * 1000)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Muitas contas criadas a partir desta conexão. Tente novamente mais tarde.' }));
      return;
    }

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

  // 3. API: Enviar novo prompt e imagem (com Rate Limit e Validação Estrita de Imagem)
  if (pathname === '/api/submissions' && req.method === 'POST') {
    const ip = getClientIp(req);
    if (!checkRateLimit(ip, 'submission', 10, 10 * 60 * 1000)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Limite de envios atingido (máximo 10 uploads a cada 10 minutos). Aguarde um momento.' }));
      return;
    }

    readJson((err, data) => {
      if (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Dados inválidos.' }));
        return;
      }

      let imageUrl = data.imageUrl || '';

      if (data.imageBase64 && data.imageBase64.startsWith('data:image')) {
        const matches = data.imageBase64.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (matches) {
          const buffer = Buffer.from(matches[2], 'base64');
          
          // Validação de Tamanho (Máximo 10 MB)
          if (buffer.length > 10 * 1024 * 1024) {
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Arquivo muito grande. O limite máximo é 10 MB.' }));
            return;
          }

          // Validação Estrita de Assinatura Binária (Magic Bytes anti-malware)
          const verifiedExt = validateImageMagicBytes(buffer);
          if (!verifiedExt) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Arquivo inválido. Apenas imagens autênticas (JPEG, PNG ou WEBP) são permitidas.' }));
            return;
          }

          const fileName = `upload-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${verifiedExt}`;
          const filePath = path.join(UPLOADS_DIR, fileName);
          fs.writeFileSync(filePath, buffer);
          imageUrl = `/uploads/${fileName}`;
        }
      }

      // Validação estrita: Foto e prompt são obrigatórios para registrar uma submissão de vídeo
      if (!imageUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Uma imagem enviada pelo cliente é obrigatória.' }));
        return;
      }

      const promptText = (data.prompt || '').trim();
      if (!promptText) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'O prompt descritivo do vídeo é obrigatório.' }));
        return;
      }

      // Se já existir uma submissão pendente para esta sessão, atualiza ela ao invés de duplicar
      if (data.submissionId) {
        const existing = submissions.find(s => s.id === data.submissionId && s.status !== 'PAGO');
        if (existing) {
          existing.prompt = promptText;
          existing.imageUrl = imageUrl;
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
        userName: data.userName || 'Cliente Xfun',
        userEmail: data.userEmail || 'Desconhecido',
        userWhatsapp: data.userWhatsapp || '',
        prompt: promptText,
        imageUrl: imageUrl,
        resolution: data.resolution || '768P',
        duration: data.duration || 15,
        status: data.status || 'PAGO',
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

      const sub = submissions.find(s => s.id === submissionId);
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
    if (!verifyAdminAuth(req, res, parsedUrl)) return;

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

  // 8. API: Stream em tempo real para Admin (SSE com Proteção de Sessão)
  if (pathname === '/api/admin/stream' && req.method === 'GET') {
    if (!verifyAdminAuth(req, res, parsedUrl)) return;

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

  // 9. API: Listar Submissões e Usuários para Admin (Protegido)
  if (pathname === '/api/admin/submissions' && req.method === 'GET') {
    if (!verifyAdminAuth(req, res, parsedUrl)) return;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, submissions, totalUsers: users.length }));
    return;
  }

  // 10. API: Limpar Histórico (Admin Protegido)
  if (pathname === '/api/admin/clear' && req.method === 'POST') {
    if (!verifyAdminAuth(req, res, parsedUrl)) return;

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
