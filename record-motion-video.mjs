import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('=== XFUN · GERADOR DE VÍDEO MOTION DESIGN (AUTOMATIZADO) ===\n');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9226',
  '--disable-gpu',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--autoplay-policy=no-user-gesture-required',
  'http://127.0.0.1:3000/motion-video.html'
]);

async function main() {
  await new Promise(r => setTimeout(r, 2000));

  try {
    const versionRes = await fetch('http://127.0.0.1:9226/json');
    const tabs = await versionRes.json();
    const pageTab = tabs.find(t => t.type === 'page');

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    await new Promise(r => ws.addEventListener('open', r));

    let reqId = 1;
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const curId = reqId++;
        const handler = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === curId) {
            ws.removeEventListener('message', handler);
            resolve(msg.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: curId, method, params }));
      });
    }

    console.log('1. Conectado ao motor de renderização Chrome...');

    // Trigger video recording via JavaScript MediaRecorder
    await send('Runtime.evaluate', {
      expression: `
        (async () => {
          window.recordedChunks = [];
          window.isRecordingComplete = false;

          const canvas = document.getElementById('render-canvas');
          const stream = canvas.captureStream(30);

          let mimeType = 'video/webm;codecs=vp9';
          if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

          const recorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: 8000000
          });

          recorder.ondataavailable = e => {
            if (e.data && e.data.size > 0) window.recordedChunks.push(e.data);
          };

          recorder.onstop = async () => {
            const blob = new Blob(window.recordedChunks, { type: 'video/webm' });
            const reader = new FileReader();
            reader.onloadend = () => {
              window.base64VideoResult = reader.result.split(',')[1];
              window.isRecordingComplete = true;
            };
            reader.readAsDataURL(blob);
          };

          recorder.start(500);

          // Fast frame stepper
          const totalDur = 18.0;
          const fps = 30;
          const totalSteps = Math.ceil(totalDur * fps);
          let currentStep = 0;

          const interval = setInterval(() => {
            currentStep++;
            const t = (currentStep / fps);
            if (typeof updateTimeline === 'function') {
              updateTimeline(t);
            }

            if (currentStep >= totalSteps) {
              clearInterval(interval);
              setTimeout(() => {
                recorder.stop();
              }, 600);
            }
          }, 1000 / fps);
        })()
      `
    });

    console.log('2. Gravando timeline (0s a 18s em 30-60 FPS)...');

    // Wait until recording is complete
    let attempts = 0;
    while (attempts < 60) {
      await new Promise(r => setTimeout(r, 1000));
      attempts++;
      const checkRes = await send('Runtime.evaluate', {
        expression: 'window.isRecordingComplete',
        returnByValue: true
      });
      if (checkRes.result && checkRes.result.value === true) break;
      process.stdout.write('.');
    }
    console.log('\n3. Gravação concluída! Extraindo arquivo de vídeo...');

    const dataRes = await send('Runtime.evaluate', {
      expression: 'window.base64VideoResult',
      returnByValue: true
    });

    const base64Data = dataRes.result.value;
    const outputPath = path.resolve('C:\\Users\\bielf\\.gemini\antigravity\\scratch\\siftq-minimax-h3\\xfun-sensual-motion.webm');
    fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));

    const stats = fs.statSync(outputPath);
    console.log(`\n✅ SUCESSO! Vídeo gerado e salvo com perfeição em:`);
    console.log(`   ${outputPath}`);
    console.log(`   Tamanho: ${(stats.size / 1024 / 1024).toFixed(2)} MB\n`);

    ws.close();
  } catch (err) {
    console.error('Erro na geração do vídeo:', err);
  } finally {
    chrome.kill();
  }
}

main();
