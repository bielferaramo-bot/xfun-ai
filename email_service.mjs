import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EMAILS_LOG_FILE = path.join(__dirname, 'emails_sent.json');
const CONFIG_FILE = path.join(__dirname, 'email_config.json');

// Carregar ou inicializar arquivo de configurações
function loadEmailConfig() {
  const defaultConfig = {
    notificationEmail: 'xfun.usocom.ia@gmail.com',
    smtpUser: 'xfun.usocom.ia@gmail.com',
    smtpPass: process.env.SMTP_PASS || '', // Senha de App do Gmail (16 caracteres)
    smtpService: 'gmail'
  };

  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return { ...defaultConfig, ...saved };
    } catch (e) {
      return defaultConfig;
    }
  } else {
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
    } catch (e) {}
    return defaultConfig;
  }
}

// Salvar email no log local (Outbox)
function logEmailToOutbox(emailRecord) {
  try {
    let outbox = [];
    if (fs.existsSync(EMAILS_LOG_FILE)) {
      outbox = JSON.parse(fs.readFileSync(EMAILS_LOG_FILE, 'utf8'));
    }
    outbox.unshift(emailRecord);
    fs.writeFileSync(EMAILS_LOG_FILE, JSON.stringify(outbox.slice(0, 500), null, 2));
  } catch (err) {
    console.error('Erro ao salvar no outbox local:', err);
  }
}

/**
 * Envia notificação por e-mail de nova venda realizada via PIX
 */
export async function sendSaleNotificationEmail({
  buyerEmail,
  buyerName,
  amount = 4.99,
  submissionId = 'N/A',
  prompt = '',
  resolution = '768P',
  duration = 15
}) {
  const config = loadEmailConfig();
  const recipient = config.notificationEmail || 'xfun.usocom.ia@gmail.com';
  const formattedAmount = `R$ ${Number(amount).toFixed(2).replace('.', ',')}`;
  const now = new Date();
  const dateStr = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const subject = `🎉 Nova Venda Confirmada no Xfun! (${formattedAmount}) - ${buyerEmail}`;

  const textContent = `
🎉 NOVA VENDA CONFIRMADA NO XFUN!
==============================================
Uma nova geração de vídeo foi paga com sucesso via PIX!

💰 Valor: ${formattedAmount}
👤 Cliente: ${buyerName || 'Cliente'}
📧 E-mail do Cliente: ${buyerEmail}
🆔 Pedido: ${submissionId}
⏱ Data/Hora: ${dateStr}
🎬 Prompt Solicitado:
"${prompt || 'Prompt padrão'}"
⚙ Resolução / Duração: ${resolution} · ${duration}s

Acesse o Painel Administrativo em:
http://localhost:3000/admin.html
==============================================
`.trim();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0c090b; color: #f3f5f1; margin: 0; padding: 24px; }
    .card { max-width: 580px; margin: 0 auto; background: #140d12; border: 1px solid #381a25; border-radius: 14px; padding: 32px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
    .header { text-align: center; border-bottom: 1px solid #2d141e; padding-bottom: 20px; margin-bottom: 24px; }
    .badge { display: inline-block; background: rgba(34, 197, 94, 0.15); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.35); padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 13px; margin-bottom: 12px; }
    .title { font-size: 24px; font-weight: 800; color: #ffffff; margin: 0 0 6px; }
    .subtitle { font-size: 14px; color: #a8949b; margin: 0; }
    .amount-box { background: linear-gradient(135deg, rgba(255, 30, 66, 0.12) 0%, rgba(20, 10, 15, 0.8) 100%); border: 1px solid rgba(255, 30, 66, 0.35); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
    .amount-label { font-size: 12px; color: #ff6b8b; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; }
    .amount-value { font-size: 38px; font-weight: 900; color: #ff1e42; margin: 4px 0 0; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .info-table td { padding: 10px 0; border-bottom: 1px solid #25121b; font-size: 14px; }
    .info-label { color: #a8949b; font-weight: 600; width: 40%; }
    .info-val { color: #f3f5f1; font-weight: 700; }
    .highlight-email { color: #ff3355; font-weight: 800; background: rgba(255, 30, 66, 0.1); padding: 3px 8px; border-radius: 6px; }
    .prompt-box { background: #0c080b; border: 1px solid #2d141e; border-radius: 8px; padding: 14px; font-size: 13px; color: #d6ded4; line-height: 1.5; margin-bottom: 24px; white-space: pre-wrap; }
    .btn { display: block; text-align: center; background: #ff1e42; color: #ffffff !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 20px; border-radius: 8px; box-shadow: 0 4px 15px rgba(255, 30, 66, 0.35); }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #6e5e64; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="badge">● PAGAMENTO PIX CONFIRMADO</span>
      <h1 class="title">🎉 Mais uma Venda no Xfun!</h1>
      <p class="subtitle">Um cliente acabou de concluir a compra de geração de vídeo.</p>
    </div>

    <div class="amount-box">
      <div class="amount-label">Valor Recebido via PIX</div>
      <div class="amount-value">${formattedAmount}</div>
    </div>

    <table class="info-table">
      <tr>
        <td class="info-label">📧 E-mail do Cliente:</td>
        <td class="info-val"><span class="highlight-email">${buyerEmail}</span></td>
      </tr>
      <tr>
        <td class="info-label">👤 Nome do Cliente:</td>
        <td class="info-val">${buyerName || 'Cliente Cadastrado'}</td>
      </tr>
      <tr>
        <td class="info-label">🆔 ID da Transação:</td>
        <td class="info-val" style="font-family: monospace; font-size: 12px;">${submissionId}</td>
      </tr>
      <tr>
        <td class="info-label">⏱ Data e Horário:</td>
        <td class="info-val">${dateStr}</td>
      </tr>
      <tr>
        <td class="info-label">📐 Resolução e Tempo:</td>
        <td class="info-val">${resolution} · ${duration}s</td>
      </tr>
    </table>

    <div style="font-size: 12px; font-weight: 700; color: #a8949b; margin-bottom: 6px;">Prompt Solicitado pelo Cliente:</div>
    <div class="prompt-box">${prompt || 'Nenhum prompt adicional'}</div>

    <a href="http://localhost:3000/admin.html" class="btn">
      Abrir Painel Administrativo em Tempo Real →
    </a>

    <div class="footer">
      Xfun AI Video Platform · Notificação Automática de Vendas<br>
      Enviado para: ${recipient}
    </div>
  </div>
</body>
</html>
`.trim();

  const record = {
    id: 'eml-' + Date.now(),
    to: recipient,
    buyerEmail,
    buyerName,
    amount,
    submissionId,
    timestamp: now.toISOString(),
    status: 'PENDENTE'
  };

  // Se tiver senha de SMTP configurada, dispara o e-mail real via Gmail
  if (config.smtpPass && config.smtpPass.trim().length > 0) {
    try {
      const transporter = nodemailer.createTransport({
        service: config.smtpService || 'gmail',
        auth: {
          user: config.smtpUser || 'xfun.usocom.ia@gmail.com',
          pass: config.smtpPass.replace(/\s+/g, '') // Remove espaços comuns de senhas de app
        }
      });

      const info = await transporter.sendMail({
        from: `"Xfun Notificações" <${config.smtpUser || 'xfun.usocom.ia@gmail.com'}>`,
        to: recipient,
        subject,
        text: textContent,
        html: htmlContent
      });

      record.status = 'ENVIADO';
      record.messageId = info.messageId;
      console.log(`[EMAIL] Notificação de venda enviada com sucesso para ${recipient}! Message ID: ${info.messageId}`);
    } catch (err) {
      record.status = 'ERRO';
      record.error = err.message;
      console.error(`[EMAIL] Erro ao enviar e-mail via Gmail SMTP:`, err.message);
    }
  } else {
    // Sem senha de SMTP no momento: registra na fila/outbox local com sucesso
    record.status = 'REGISTRADO_OUTBOX';
    record.note = 'Adicione a senha de app do Gmail em email_config.json para disparo externo imediato.';
    console.log(`[EMAIL] Venda registrada no outbox local para ${recipient}. Cliente: ${buyerEmail} (${formattedAmount})`);
  }

  logEmailToOutbox(record);
  return record;
}
