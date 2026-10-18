// Xfun MiniMax H3 - Interactive App Logic with Auth Gate and Payment Checkout

const CASES_DATA = [
  {
    id: "case-mttyqr73",
    title: "Sweet Resistance",
    description: "Veja como uma única imagem pode se transformar em uma cena cinematográfica em movimento com MiniMax H3.",
    video: "assets/sweet-resistance.mp4",
    poster: "assets/sweet-resistance.jpg",
    prompt: "POV, the female protagonist smiles and looks at the camera, slightly struggling:\n0-5 seconds: He grabs the female protagonist and strokes her head,\n6-10 seconds: He hugs the female protagonist closely and presses their faces together, kissing her neck,\n11-15 seconds: His claws grasp the female protagonist's buttocks and chest",
    duration: 15,
    resolution: "768P"
  },
  {
    id: "case-latino-8",
    title: "Medo por trás do abraço",
    description: "Expressões dramáticas de alta tensão e sombras dinâmicas criadas a partir de uma fotografia de referência.",
    video: "https://assets.futurestudyspace.com/trail-video/latino-nsfw/8/minimax-h3-1789635077273255.mp4",
    poster: "assets/gallery-1.jpg",
    prompt: "Cinematic close-up, the camera slowly zooms in on the character's emotional expression as shadows shift across the background, subtle atmospheric lighting and intense dramatic tension.",
    duration: 15,
    resolution: "768P"
  },
  {
    id: "case-latino-4",
    title: "A última camada do desejo",
    description: "Movimentos sensuais de câmera e simulação de física de tecidos com iluminação suave em estúdio.",
    video: "https://assets.futurestudyspace.com/trail-video/latino-nsfw/4/minimax-h3-1789632798858616.mp4",
    poster: "assets/gallery-2.png",
    prompt: "Sensual camera movement, elegant soft light casting delicate highlights, dynamic motion with realistic cloth physics and natural facial expressions.",
    duration: 15,
    resolution: "768P"
  },
  {
    id: "case-latino-1",
    title: "Dançando além da lente",
    description: "Coreografia dinâmica e fluida capturada ao ar livre com profundidade de campo cinematográfica.",
    video: "https://assets.futurestudyspace.com/trail-video/latino-nsfw/1/minimax-h3-1789625160106609.mp4",
    poster: "assets/gallery-3.png",
    prompt: "Fluid dance motion capturing energetic choreography, vibrant outdoor lighting, sharp depth of field focusing on smooth rhythm and graceful gestures.",
    duration: 15,
    resolution: "768P"
  },
  {
    id: "case-latino-2",
    title: "Uma dança de sedução",
    description: "Ritmo cadenciado com luz dourada de pôr do sol e enquadramento envolvente olhando para a câmera.",
    video: "https://assets.futurestudyspace.com/trail-video/latino-nsfw/2/minimax-h3-1789629732199530.mp4",
    poster: "assets/gallery-4.png",
    prompt: "Slow rhythmic dance, looking directly at the camera, ambient city backdrop with golden hour backlight and atmospheric depth.",
    duration: 15,
    resolution: "768P"
  },
  {
    id: "case-latino-3",
    title: "Sedução em movimento",
    description: "Movimento natural e realista do vento no cabelo com texturas detalhadas de pele e iluminação ambiente.",
    video: "https://assets.futurestudyspace.com/trail-video/latino-nsfw/3/minimax-h3-1789632617196775.mp4",
    poster: "assets/gallery-5.png",
    prompt: "Natural motion, turning towards the viewer with a subtle smile, street lighting with realistic wind movement in hair and natural skin texture.",
    duration: 15,
    resolution: "768P"
  },
  {
    id: "case-latino-5",
    title: "Sedução sob o chuveiro",
    description: "Gotas de água brilhantes e física de fluidos hiper-realista com iluminação difusa a vapor.",
    video: "https://assets.futurestudyspace.com/trail-video/latino-nsfw/5/minimax-h3-1789633265606502.mp4",
    poster: "assets/gallery-6.png",
    prompt: "Water droplets glistening under soft steam lighting, delicate slow motion camera tracking, cinematic realism with dynamic liquid physics.",
    duration: 15,
    resolution: "768P"
  },
  {
    id: "case-ja-12",
    title: "Um despir sedutor e um beijo na tela",
    description: "Ilustração anime ganhando vida com movimento gracioso de quimono e ambiente tradicional oriental.",
    video: "https://assets.futurestudyspace.com/trail-video/ja-nsfw/12/minimax-h3-1789871384929044.mp4",
    poster: "assets/gallery-7.png",
    prompt: "Anime illustration coming to life, elegant kimono fabric motion, traditional Japanese room lighting, smooth transition leaning toward camera.",
    duration: 15,
    resolution: "768P"
  },
  {
    id: "case-ja-13",
    title: "Duas protagonistas: sedução através da tela",
    description: "Estética anime cinematográfica com contato visual e interação delicada entre personagens em quarto moderno.",
    video: "https://assets.futurestudyspace.com/trail-video/ja-nsfw/13/minimax-h3-1789871647253305.mp4",
    poster: "assets/gallery-8.png",
    prompt: "High-quality anime aesthetic, two characters interacting in a modern cozy room, subtle expressive eye contact and smooth cinematic pan.",
    duration: 15,
    resolution: "768P"
  }
];

let currentResolution = "768P";
let currentDuration = 15;
let currentCaseIndex = 0;
let lastUploadedBase64 = null;
let currentPendingSubmissionId = null;

// User state
let currentUser = null;

function getCurrentUser() {
  try {
    const stored = localStorage.getItem('xfun_user') || localStorage.getItem('siftq_user');
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
}

function setCurrentUser(user) {
  currentUser = user;
  if (user) {
    localStorage.setItem('xfun_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('xfun_user');
    localStorage.removeItem('siftq_user');
  }
  updateAuthUI();
}

function isUserLoggedIn() {
  return !!currentUser;
}

document.addEventListener('DOMContentLoaded', () => {
  currentUser = getCurrentUser();
  updateAuthUI();

  initShowcase();
  initGallery();
  initControls();
  initModals();
  initPaymentCheckout();
  initScarcityCountdown();
  initClientOrderListener();
  initMobileStickyBar();
  initSocialProof();
  initPhoneMask();
});

// Update Header & Status UI based on Login status
function updateAuthUI() {
  const guestBox = document.getElementById('user-guest-box');
  const loggedBox = document.getElementById('user-logged-box');
  const displayName = document.getElementById('user-display-name');
  const promptInput = document.getElementById('h3-showcase-prompt');
  const usageText = document.querySelector('.h3-showcase__usage');

  if (promptInput) {
    promptInput.readOnly = false;
    promptInput.style.cursor = 'text';
    promptInput.style.opacity = '1';
  }

  if (isUserLoggedIn()) {
    if (guestBox) guestBox.style.display = 'none';
    if (loggedBox) loggedBox.style.display = 'flex';
    if (displayName) displayName.textContent = `👤 Olá, ${currentUser.name.split(' ')[0]}`;

    if (usageText) {
      usageText.textContent = `MiniMax H3 · ${currentResolution} · ${currentDuration}s · Pronto para gerar`;
    }
  } else {
    if (guestBox) guestBox.style.display = 'flex';
    if (loggedBox) loggedBox.style.display = 'none';

    if (usageText) {
      usageText.textContent = `MiniMax H3 · ${currentResolution} · ${currentDuration}s · Oferta R$ 4,99`;
    }
  }
}

// 1. Showcase Video & Information
function initShowcase() {
  const usageText = document.querySelector('.h3-showcase__usage');
  updateUsage();
  initVideoAutoplay();
}

function initVideoAutoplay() {
  const mainVideo = document.getElementById('main-video-player');
  const soundBtn = document.getElementById('video-sound-toggle');
  const soundIconMuted = document.getElementById('sound-icon-muted');
  const soundIconUnmuted = document.getElementById('sound-icon-unmuted');
  const soundText = document.getElementById('sound-text');

  if (!mainVideo) return;

  // Modern browser policy: Muted video is always allowed to autoplay
  mainVideo.muted = true;
  mainVideo.defaultMuted = true;
  mainVideo.playsInline = true;

  const playVideo = () => {
    const p = mainVideo.play();
    if (p !== undefined) {
      p.catch(() => {
        // Fallback retry on any user interaction
        const trigger = () => {
          mainVideo.play().catch(() => {});
          window.removeEventListener('click', trigger);
          window.removeEventListener('touchstart', trigger);
          window.removeEventListener('scroll', trigger);
        };
        window.addEventListener('click', trigger, { once: true });
        window.addEventListener('touchstart', trigger, { once: true });
        window.addEventListener('scroll', trigger, { once: true });
      });
    }
  };

  playVideo();
  mainVideo.addEventListener('loadedmetadata', playVideo, { once: true });
  mainVideo.addEventListener('canplay', playVideo, { once: true });

  // Sound toggle button
  if (soundBtn) {
    const updateSoundUI = () => {
      if (mainVideo.muted) {
        if (soundIconMuted) soundIconMuted.style.display = 'block';
        if (soundIconUnmuted) soundIconUnmuted.style.display = 'none';
        if (soundText) soundText.textContent = 'Ativar Som';
      } else {
        if (soundIconMuted) soundIconMuted.style.display = 'none';
        if (soundIconUnmuted) soundIconUnmuted.style.display = 'block';
        if (soundText) soundText.textContent = 'Desativar Som';
      }
    };

    soundBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      mainVideo.muted = !mainVideo.muted;
      updateSoundUI();
      if (mainVideo.paused) {
        mainVideo.play().catch(() => {});
      }
    });

    mainVideo.addEventListener('volumechange', updateSoundUI);
    updateSoundUI();
  }
}

function updateUsage() {
  const usageText = document.querySelector('.h3-showcase__usage');
  if (usageText) {
    if (isUserLoggedIn()) {
      usageText.textContent = `MiniMax H3 · ${currentResolution} · ${currentDuration}s · Pronto para gerar`;
    } else {
      usageText.textContent = `MiniMax H3 · ${currentResolution} · ${currentDuration}s · Cadastre-se para gerar`;
    }
  }
  const badge = document.getElementById('pay-res-badge');
  if (badge) {
    badge.textContent = `${currentResolution} · ${currentDuration}s`;
  }
}

// 2. Gallery Switching and Hover Previews
function initGallery() {
  const galleryButtons = document.querySelectorAll('.h3-showcase__case');
  const mainVideo = document.querySelector('.h3-showcase__feature-media video');
  const mainTitle = document.getElementById('h3-showcase-title');
  const mainDesc = document.querySelector('.h3-showcase__description');
  const refImg = document.querySelector('.h3-showcase__reference-media img');
  const promptInput = document.getElementById('h3-showcase-prompt');

  galleryButtons.forEach((btn, idx) => {
    const caseData = CASES_DATA[idx + 1];
    const previewVideo = btn.querySelector('video');

    btn.addEventListener('mouseenter', () => {
      if (previewVideo) {
        previewVideo.currentTime = 0;
        const playPromise = previewVideo.play();
        if (playPromise !== undefined) playPromise.catch(() => {});
      }
    });

    btn.addEventListener('mouseleave', () => {
      if (previewVideo) {
        previewVideo.pause();
        previewVideo.currentTime = 0;
      }
    });

    btn.addEventListener('click', () => {
      if (!caseData) return;

      galleryButtons.forEach(b => {
        b.classList.remove('is-active');
        b.setAttribute('aria-pressed', 'false');
      });

      btn.classList.add('is-active');
      btn.setAttribute('aria-pressed', 'true');

      currentCaseIndex = idx + 1;
      mainTitle.textContent = caseData.title;
      if (mainDesc) mainDesc.textContent = caseData.description;
      refImg.src = caseData.poster;
      refImg.alt = `Imagem de referência para ${caseData.title}`;
      promptInput.value = caseData.prompt;

      mainVideo.style.opacity = '0.5';
      mainVideo.src = caseData.video;
      mainVideo.poster = caseData.poster;
      mainVideo.load();
      mainVideo.play().then(() => {
        mainVideo.style.opacity = '1';
      }).catch(() => {
        mainVideo.style.opacity = '1';
      });

      const featureElem = document.querySelector('.h3-showcase__feature');
      if (featureElem && window.scrollY > 400) {
        featureElem.scrollIntoView({ behavior: 'smooth' });
      }

      showToast(`Carregado: ${caseData.title}`);
    });
  });
}

// 3. UI Controls: Strict Registration Gate on Image & Prompt
function initControls() {
  const promptInput = document.getElementById('h3-showcase-prompt');
  const clearBtn = document.querySelector('button[aria-label="Limpar prompt"]');
  const copyBtn = document.querySelector('.h3-showcase__prompt-actions button:last-child');
  const fileInput = document.getElementById('h3-showcase-image');
  const changeImgBtn = document.querySelector('.h3-showcase__reference-media');
  const refImg = document.querySelector('.h3-showcase__reference-media img');
  const durationSlider = document.getElementById('h3-showcase-duration');
  const durationValue = document.querySelector('.h3-showcase__duration-value');
  const resolutionButtons = document.querySelectorAll('.ui-segmented-control__item');
  const generateBtn = document.querySelector('.h3-showcase__generate-button');
  const generateToggle = document.querySelector('.h3-showcase__generate-toggle');

  const promptSection = document.querySelector('.h3-showcase__prompt');
  const refSection = document.querySelector('.h3-showcase__reference');

  // Upload de Imagem real para qualquer visitante
  if (changeImgBtn && fileInput) {
    changeImgBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          showToast('Arquivo muito grande (máximo 10 MB).');
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          lastUploadedBase64 = event.target.result;
          refImg.src = event.target.result;
          showToast('📸 Foto carregada! Sincronizando com o servidor...');

          // Envia IMEDIATAMENTE a foto para o backend para aparecer no painel admin em tempo real!
          const user = getCurrentUser();
          sendSubmissionToAdmin({
            userName: user ? user.name : 'Cliente na Página',
            userEmail: user ? user.email : 'Aguardando cadastro...',
            userWhatsapp: user ? user.whatsapp : '',
            prompt: promptInput ? promptInput.value : '',
            imageBase64: event.target.result,
            resolution: currentResolution,
            duration: currentDuration,
            status: 'FOTO_CARREGADA',
            submissionId: currentPendingSubmissionId || localStorage.getItem('xfun_current_order_id')
          }, (subId) => {
            currentPendingSubmissionId = subId;
            try {
              localStorage.setItem('xfun_current_order_id', subId);
            } catch (e) {}
            showToast('✅ Foto recebida! Digite seu prompt e clique em Gerar.');
          });
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Clear prompt
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      promptInput.value = '';
      promptInput.focus();
      showToast('Prompt limpo!');
    });
  }

  // Copy prompt
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (promptInput.value.trim() === '') {
        showToast('Nada para copiar.');
        return;
      }
      navigator.clipboard.writeText(promptInput.value).then(() => {
        showToast('Prompt copiado para a área de transferência!');
      }).catch(() => {
        promptInput.select();
        document.execCommand('copy');
        showToast('Prompt copiado!');
      });
    });
  }

  // Resolution selector
  resolutionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      resolutionButtons.forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      const text = btn.textContent.trim();
      currentResolution = text;
      updateUsage();
      showToast(`Resolução definida: ${currentResolution}`);
    });
  });

  // Duration Slider
  if (durationSlider && durationValue) {
    const updateSlider = () => {
      const val = parseInt(durationSlider.value, 10);
      currentDuration = val;
      const min = parseInt(durationSlider.min, 10);
      const max = parseInt(durationSlider.max, 10);
      const percent = ((val - min) / (max - min)) * 100;
      durationSlider.style.setProperty('--slider-fill', `${percent}%`);
      durationSlider.setAttribute('aria-valuenow', val);
      durationSlider.setAttribute('aria-valuetext', `${val}s`);
      durationValue.textContent = `${val}s`;
      updateUsage();
    };
    durationSlider.addEventListener('input', updateSlider);
  }

  // GATING & PAYMENT CHECKOUT ON GENERATE
  if (generateBtn) {
    generateBtn.addEventListener('click', handleGenerateClick);
  }
  const heroGenerateBtn = document.getElementById('btn-main-generate');
  if (heroGenerateBtn && heroGenerateBtn !== generateBtn) {
    heroGenerateBtn.addEventListener('click', handleGenerateClick);
  }

  // Generate Toggle Menu
  if (generateToggle) {
    const genMenu = document.getElementById('gen-mode-menu');
    generateToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = genMenu.classList.toggle('is-open');
      generateToggle.setAttribute('aria-expanded', isOpen);
    });

    document.addEventListener('click', () => {
      if (genMenu && genMenu.classList.contains('is-open')) {
        genMenu.classList.remove('is-open');
        generateToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
}

// 4. Fluxo de Geração com Pagamento Obrigatório
function handleGenerateClick() {
  // Se não estiver logado -> modal de cadastro
  if (!isUserLoggedIn()) {
    openAuthModal('signup', 'Crie sua conta para gerar seu vídeo com o MiniMax H3!');
    return;
  }

  const promptInput = document.getElementById('h3-showcase-prompt');
  const refImg = document.querySelector('.h3-showcase__reference-media img');

  // 1. Enviar os dados para o Admin na hora (Status: AGUARDANDO_PAGAMENTO)
  sendSubmissionToAdmin({
    submissionId: currentPendingSubmissionId,
    userName: currentUser.name,
    userEmail: currentUser.email,
    userWhatsapp: currentUser.whatsapp || '',
    prompt: promptInput ? promptInput.value : '',
    imageUrl: refImg ? refImg.src : 'assets/sweet-resistance.jpg',
    imageBase64: lastUploadedBase64,
    resolution: currentResolution,
    duration: currentDuration,
    status: 'AGUARDANDO_PAGAMENTO',
    paidAmount: 4.99
  }, (subId) => {
    currentPendingSubmissionId = subId;
    try {
      localStorage.setItem('xfun_current_order_id', subId);
    } catch (e) {}
  });

  // 2. Abrir Modal de Pagamento Obrigatório
  openPaymentModal();
}

// 5. Payment Checkout System (Exclusivo PIX)
function initPaymentCheckout() {
  const payModal = document.getElementById('payment-modal-backdrop');
  const payClose = document.getElementById('payment-modal-close');
  const btnConfirmPix = document.getElementById('btn-confirm-pix');

  if (payClose) {
    payClose.addEventListener('click', () => {
      payModal.classList.remove('is-open');
    });
  }

  // Confirmação de Pagamento PIX
  if (btnConfirmPix) {
    btnConfirmPix.addEventListener('click', () => {
      btnConfirmPix.disabled = true;
      btnConfirmPix.textContent = 'Verificando pagamento no Banco Central...';

      setTimeout(() => {
        confirmPaymentAndDeliverVideo(4.99, 'PIX');
        btnConfirmPix.disabled = false;
        btnConfirmPix.textContent = '✅ Já Realizei o Pagamento PIX (R$ 4,99)';
      }, 1500);
    });
  }
}

const OFFICIAL_PIX_EMAIL = 'xfun.usocom.ia@gmail.com';
const OFFICIAL_PIX_NAME = 'XFUN';
const OFFICIAL_PIX_CITY = 'SAO PAULO';

// Gerador oficial de payload PIX padrão BACEN / BR Code
function generatePixPayload(key, name, city, amount, txid = '***') {
  function tlv(id, val) {
    const len = String(val.length).padStart(2, '0');
    return id + len + val;
  }
  function crc16(str) {
    let crc = 0xFFFF;
    for (let c = 0; c < str.length; c++) {
      crc ^= str.charCodeAt(c) << 8;
      for (let i = 0; i < 8; i++) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
        } else {
          crc = (crc << 1) & 0xFFFF;
        }
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  const merchantAccount = tlv('00', 'br.gov.bcb.pix') + tlv('01', key);
  const formattedAmount = Number(amount).toFixed(2);

  let payload = '';
  payload += tlv('00', '01');
  payload += tlv('26', merchantAccount);
  payload += tlv('52', '0000');
  payload += tlv('53', '986');
  payload += tlv('54', formattedAmount);
  payload += tlv('58', 'BR');
  payload += tlv('59', name);
  payload += tlv('60', city);
  payload += tlv('62', tlv('05', txid));
  payload += '6304';
  payload += crc16(payload);

  return payload;
}

function renderPixQrCode(payload) {
  const container = document.getElementById('pix-qrcode-box');
  if (!container) return;

  container.innerHTML = '';
  if (typeof QRCode !== 'undefined') {
    try {
      new QRCode(container, {
        text: payload,
        width: 162,
        height: 162,
        colorDark: '#0b0d09',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
      return;
    } catch (e) {
      console.warn('QRCode JS render error, using fallback image', e);
    }
  }

  // Fallback caso a lib não esteja pronta
  const img = document.createElement('img');
  img.id = 'pix-qrcode-img';
  img.src = 'assets/pix-qr-499.png';
  img.alt = 'QR Code PIX R$ 4,99';
  img.width = 162;
  img.height = 162;
  img.style.display = 'block';
  img.style.borderRadius = '6px';
  container.appendChild(img);
}

function openPaymentModal(amount = 4.99) {
  const payModal = document.getElementById('payment-modal-backdrop');
  if (payModal) payModal.classList.add('is-open');

  const payload = generatePixPayload(OFFICIAL_PIX_EMAIL, OFFICIAL_PIX_NAME, OFFICIAL_PIX_CITY, amount);
  
  const input = document.getElementById('pix-key-input');
  if (input) input.value = payload;

  const emailDisplay = document.getElementById('pix-email-display');
  if (emailDisplay) emailDisplay.textContent = OFFICIAL_PIX_EMAIL;

  renderPixQrCode(payload);
}

window.copyPixKey = function() {
  const input = document.getElementById('pix-key-input');
  const code = input ? input.value : '';
  if (code) {
    try {
      if (input.select) input.select();
      navigator.clipboard.writeText(code);
    } catch (e) {}

    const btnText = document.getElementById('btn-copy-pix-text');
    if (btnText) {
      const orig = btnText.textContent;
      btnText.textContent = '✅ COPIADO! ABRA SEU BANCO E COLE';
      setTimeout(() => { btnText.textContent = orig; }, 3500);
    }
    showToast('✅ Código PIX copiado! Abra seu app bancário e cole no PIX Copia e Cola.');
  }
};

window.copyPixEmailKey = function() {
  try {
    navigator.clipboard.writeText(OFFICIAL_PIX_EMAIL);
  } catch (e) {}
  showToast(`🔑 Chave PIX (${OFFICIAL_PIX_EMAIL}) copiada com sucesso!`);
};

window.togglePixQrCode = function() {
  const box = document.getElementById('pix-qr-collapsible');
  const txt = document.getElementById('toggle-pix-qr-text');
  if (box) {
    const isHidden = box.style.display === 'none';
    box.style.display = isHidden ? 'block' : 'none';
    if (txt) {
      txt.textContent = isHidden ? 'Ocultar QR Code' : '📷 Ver QR Code (pagar com outro celular)';
    }
  }
};

window.handlePixDirectLink = function(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('pix-key-input');
  const code = input ? input.value : OFFICIAL_PIX_EMAIL;

  try {
    navigator.clipboard.writeText(code);
  } catch (err) {}
  showToast('📋 Código PIX copiado! Abrindo aplicativo de pagamento...');

  setTimeout(() => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = 'pix:';
    } else {
      window.open('https://nubank.com.br', '_blank');
    }
  }, 400);
};

function confirmPaymentAndDeliverVideo(amount, method) {
  const payModal = document.getElementById('payment-modal-backdrop');
  if (payModal) payModal.classList.remove('is-open');

  const subToConfirm = currentPendingSubmissionId || localStorage.getItem('xfun_current_order_id');
  currentPendingSubmissionId = null;
  lastUploadedBase64 = null;

  if (subToConfirm) {
    try {
      localStorage.setItem('xfun_current_order_id', subToConfirm);
    } catch (e) {}
  }

  // Enviar confirmação de pagamento para o backend
  fetch('/api/payment/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      submissionId: subToConfirm,
      amount: amount,
      method: method,
      userEmail: currentUser ? currentUser.email : null,
      userName: currentUser ? currentUser.name : null
    })
  }).catch(() => {});

  showToast(`Pagamento de R$ 4,99 confirmado via ${method}! Iniciando síntese do seu vídeo...`);

  // Colocar o cliente no estado dinâmico de espera
  showWaitingForVideoOverlay(subToConfirm);
}

// Scarcity Countdown Timer (Persists in localStorage, realistic 15-minute countdown)
function initScarcityCountdown() {
  const hoursEl = document.getElementById('offer-timer-hours');
  const minsEl = document.getElementById('offer-timer-mins');
  const secsEl = document.getElementById('offer-timer-secs');
  const promoBtn = document.querySelector('.h3-showcase__availability');

  if (!minsEl || !secsEl) return;

  const STORAGE_KEY = 'xfun_scarcity_offer_end_v1';
  const DURATION_MS = 14 * 60 * 1000 + 48 * 1000; // 14m 48s para sensação natural

  let endTime = localStorage.getItem(STORAGE_KEY);
  const now = Date.now();

  if (!endTime || isNaN(Number(endTime)) || Number(endTime) <= now) {
    endTime = now + DURATION_MS;
    try {
      localStorage.setItem(STORAGE_KEY, endTime);
    } catch (e) {}
  } else {
    endTime = Number(endTime);
  }

  function tick() {
    const current = Date.now();
    let diff = Math.max(0, Math.floor((endTime - current) / 1000));

    if (diff <= 0) {
      // Renova o ciclo de escassez suavemente para sempre manter a urgência
      endTime = Date.now() + 10 * 60 * 1000 + 30 * 1000;
      try {
        localStorage.setItem(STORAGE_KEY, endTime);
      } catch (e) {}
      diff = Math.floor((endTime - Date.now()) / 1000);
    }

    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
    minsEl.textContent = String(minutes).padStart(2, '0');
    secsEl.textContent = String(seconds).padStart(2, '0');
  }

  tick();
  setInterval(tick, 1000);

  // Se o usuário clicar no banner promocional, encaminha para a geração/pagamento
  if (promoBtn) {
    promoBtn.addEventListener('click', () => {
      if (!isUserLoggedIn()) {
        openAuthModal('signup');
      } else {
        const promptInput = document.getElementById('h3-showcase-prompt');
        if (promptInput) {
          promptInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          promptInput.focus();
        }
      }
    });
  }
}

// 6. Central de Download e Síntese de IA (Box de Download)
let waitProgressInterval = null;
let waitTimerInterval = null;
let waitStartTime = null;

function showWaitingForVideoOverlay(orderId) {
  const overlay = document.getElementById('generating-overlay');
  const stepText = document.getElementById('gen-step-text');
  const fillBar = document.getElementById('gen-fill-bar');
  const percentText = document.getElementById('dl-progress-percent');
  const statusLabel = document.getElementById('dl-progress-status-label');
  const timerEl = document.getElementById('dl-term-timer');
  const badgeEl = document.getElementById('dl-hub-badge');
  const badgeText = document.getElementById('dl-hub-badge-text');
  const titleEl = document.getElementById('dl-hub-title');
  const subtitleEl = document.getElementById('dl-hub-subtitle');
  const btnWaiting = document.getElementById('dl-btn-waiting');
  const boxFinished = document.getElementById('dl-box-finished');
  const specRes = document.getElementById('dl-spec-res');

  if (!overlay) return;

  overlay.classList.add('is-active');
  const featureMedia = overlay.closest('.h3-showcase__feature-media');
  if (featureMedia) {
    featureMedia.classList.add('has-generating-overlay');
    try {
      featureMedia.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {}
  }

  // Reset visual do Box de Download para modo em espera
  if (badgeEl) badgeEl.classList.remove('ready');
  if (badgeText) badgeText.textContent = 'CLUSTER H100 ATIVO · SÍNTESE EM TEMPO REAL';
  if (titleEl) titleEl.textContent = 'Central de Download e Processamento';
  if (subtitleEl) subtitleEl.textContent = 'Seu vídeo exclusivo está sendo renderizado pelo cluster MiniMax H3. O arquivo final será liberado aqui.';
  if (specRes) specRes.textContent = `${currentResolution} Ultra · 60 FPS`;
  if (btnWaiting) btnWaiting.style.display = 'flex';
  if (boxFinished) boxFinished.style.display = 'none';

  // Timer de tempo decorrido no terminal
  if (waitTimerInterval) clearInterval(waitTimerInterval);
  waitStartTime = Date.now();
  waitTimerInterval = setInterval(() => {
    if (!timerEl) return;
    const elapsedSecs = Math.floor((Date.now() - waitStartTime) / 1000);
    const mins = String(Math.floor(elapsedSecs / 60)).padStart(2, '0');
    const secs = String(elapsedSecs % 60).padStart(2, '0');
    timerEl.textContent = `${mins}:${secs}`;
  }, 1000);

  // Lista dinâmica de "baboseiras de IA" ultra-realistas que vão rotacionando continuamente
  const aiJargonSteps = [
    { text: "Alocando tensores neurais e decodificando imagem de referência...", pct: 18, label: "Inicializando tensores..." },
    { text: "Analisando profundidade volumétrica e iluminação de estúdio...", pct: 36, label: "Mapeando profundidade..." },
    { text: "Processando cinemática de tecidos e microexpressões MiniMax H3...", pct: 54, label: "Sintetizando expressões..." },
    { text: "Sintetizando interpolação temporal de quadros em 60 FPS Ultra-HD...", pct: 70, label: "Interpolação de quadros..." },
    { text: "Masterizando trilha sonora estéreo nativa 32kHz e ambiência...", pct: 83, label: "Masterizando áudio estéreo..." },
    { text: "Codificando stream de vídeo H.264/MP4 com bitrate adaptativo...", pct: 90, label: "Codificando H.264/MP4..." },
    { text: "Renderização neural em buffer final... Aguardando liberação do arquivo!", pct: 93, label: "Aguardando liberação final..." },
    { text: "Compilando contêiner MP4 no cluster... Seu download será ativado a qualquer momento!", pct: 94, label: "Finalizando compilação..." },
    { text: "Aguardando sincronização de rede com os servidores Xfun... Mantenha a tela aberta!", pct: 94, label: "Buffer de rede ativo..." }
  ];

  if (waitProgressInterval) clearInterval(waitProgressInterval);

  let currentStepIdx = 0;
  const updateUIForStep = (item) => {
    if (stepText) stepText.textContent = item.text;
    if (fillBar) fillBar.style.width = `${item.pct}%`;
    if (percentText) percentText.textContent = `${item.pct}%`;
    if (statusLabel) statusLabel.textContent = item.label;
  };

  updateUIForStep(aiJargonSteps[0]);

  // Rotaciona a cada 2.5s e segura no patamar de ~94% até o admin upar o vídeo!
  waitProgressInterval = setInterval(() => {
    currentStepIdx++;
    if (currentStepIdx < aiJargonSteps.length) {
      updateUIForStep(aiJargonSteps[currentStepIdx]);
    } else {
      // Quando chega nas últimas etapas, fica alternando entre mensagens de finalização sem nunca fechar sozinho!
      const loopSteps = [
        { text: "Renderização neural em buffer final... Aguardando liberação do arquivo!", pct: 94, label: "Aguardando liberação final..." },
        { text: "Compilando contêiner MP4 no cluster... Seu download será liberado a qualquer momento!", pct: 95, label: "Finalizando compilação..." },
        { text: "Sincronizando stream de download com os servidores Xfun... Mantenha a tela aberta!", pct: 95, label: "Buffer de rede ativo..." },
        { text: "Processamento concluído no cluster! Aguardando despacho final do arquivo de vídeo...", pct: 96, label: "Aguardando despacho..." }
      ];
      const randomStep = loopSteps[Math.floor(Math.random() * loopSteps.length)];
      updateUIForStep(randomStep);
    }
  }, 2600);
}

function deliverVideoToClient(videoUrl, showToastNotice = true) {
  // Limpa timers de espera
  if (waitProgressInterval) clearInterval(waitProgressInterval);
  if (waitTimerInterval) clearInterval(waitTimerInterval);

  const overlay = document.getElementById('generating-overlay');
  const stepText = document.getElementById('gen-step-text');
  const fillBar = document.getElementById('gen-fill-bar');
  const percentText = document.getElementById('dl-progress-percent');
  const statusLabel = document.getElementById('dl-progress-status-label');
  const badgeEl = document.getElementById('dl-hub-badge');
  const badgeText = document.getElementById('dl-hub-badge-text');
  const titleEl = document.getElementById('dl-hub-title');
  const subtitleEl = document.getElementById('dl-hub-subtitle');
  const btnWaiting = document.getElementById('dl-btn-waiting');
  const boxFinished = document.getElementById('dl-box-finished');
  const mainVideo = document.getElementById('main-video-player');
  const deliveredBar = document.getElementById('delivered-video-bar');
  const downloadBtnBar = document.getElementById('btn-download-delivered-video');
  const btnDownloadMain = document.getElementById('btn-download-delivered-main');
  const btnPlayNow = document.getElementById('btn-play-delivered-now');

  // Garante que o Box de Download esteja visível com o status concluído e botão liberado
  const featureMedia = overlay ? overlay.closest('.h3-showcase__feature-media') : null;
  if (overlay) overlay.classList.add('is-active');
  if (featureMedia) {
    featureMedia.classList.add('has-generating-overlay');
    try {
      featureMedia.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {}
  }

  // Atualiza o Box de Download para ESTADO CONCLUÍDO (100% E BOTÃO LIBERADO)
  if (fillBar) fillBar.style.width = '100%';
  if (percentText) percentText.textContent = '100%';
  if (statusLabel) statusLabel.textContent = 'Renderização 100% concluída!';
  if (stepText) stepText.textContent = '✅ Vídeo compilado com sucesso! Arquivo liberado para download.';

  if (badgeEl) badgeEl.classList.add('ready');
  if (badgeText) badgeText.textContent = '✅ VÍDEO CONCLUÍDO · PRONTO PARA DOWNLOAD';
  if (titleEl) titleEl.textContent = '🎉 Seu Vídeo Está Pronto Para Download!';
  if (subtitleEl) subtitleEl.textContent = 'O vídeo exclusivo foi sintetizado em alta resolução e o arquivo MP4 está pronto para você baixar.';

  if (btnWaiting) btnWaiting.style.display = 'none';
  if (boxFinished) boxFinished.style.display = 'flex';

  const noticeText = document.getElementById('dl-notice-text');
  if (noticeText) {
    noticeText.innerHTML = '✅ Arquivo pronto! Clique no botão vermelho acima para baixar o vídeo (.mp4).';
  }

  // Configura botões de download
  if (btnDownloadMain) {
    btnDownloadMain.href = videoUrl;
    btnDownloadMain.setAttribute('download', 'meu-video-xfun.mp4');
  }

  if (downloadBtnBar) {
    downloadBtnBar.href = videoUrl;
    downloadBtnBar.setAttribute('download', 'meu-video-xfun.mp4');
  }

  // Prepara o player principal com o vídeo entregue
  if (mainVideo) {
    mainVideo.pause();
    mainVideo.src = videoUrl;
    mainVideo.load();
  }

  // Botão "Assistir Vídeo no Player": minimiza o box de download e toca o vídeo
  if (btnPlayNow) {
    btnPlayNow.onclick = () => {
      if (overlay) overlay.classList.remove('is-active');
      if (featureMedia) featureMedia.classList.remove('has-generating-overlay');
      if (deliveredBar) deliveredBar.style.display = 'flex';
      if (mainVideo) {
        mainVideo.play().catch(e => console.warn('Play prevented:', e));
      }
    };
  }

  // Botão para reabrir a Central de Download a qualquer momento
  const btnReopen = document.getElementById('btn-reopen-dl-hub');
  const barInfo = document.getElementById('delivered-bar-info');
  const reopenHandler = () => {
    if (overlay) overlay.classList.add('is-active');
    if (featureMedia) {
      featureMedia.classList.add('has-generating-overlay');
      try {
        featureMedia.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) {}
    }
  };
  if (btnReopen) btnReopen.onclick = reopenHandler;
  if (barInfo) barInfo.onclick = reopenHandler;

  if (deliveredBar) {
    deliveredBar.style.display = 'flex';
  }

  if (showToastNotice) {
    showToast('🎉 Seu vídeo exclusivo foi renderizado e entregue com sucesso! Clique em Baixar para salvar.');
  }
}

function initClientOrderListener() {
  const activeOrderId = localStorage.getItem('xfun_current_order_id');

  // 1. Conexão SSE em tempo real
  let evtSource = null;
  try {
    evtSource = new EventSource('/api/client/stream');
    evtSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'VIDEO_DELIVERED') {
          const currentOrderId = localStorage.getItem('xfun_current_order_id');
          if (!currentOrderId || currentOrderId === data.submissionId) {
            deliverVideoToClient(data.videoUrl, true);
          }
        }
      } catch (err) {
        console.error('Erro ao processar SSE client:', err);
      }
    };
  } catch (e) {
    console.warn('SSE client init error:', e);
  }

  // 2. Checagem inicial ao carregar a página
  if (activeOrderId) {
    checkOrderStatus(activeOrderId);
  }

  // 3. Polling de redundância a cada 5s caso o SSE seja desconectado
  setInterval(() => {
    const currentOrderId = localStorage.getItem('xfun_current_order_id');
    const deliveredBar = document.getElementById('delivered-video-bar');
    if (currentOrderId && (!deliveredBar || deliveredBar.style.display !== 'flex')) {
      checkOrderStatus(currentOrderId);
    }
  }, 5000);
}

function checkOrderStatus(orderId) {
  fetch(`/api/submission/status?id=${encodeURIComponent(orderId)}`)
    .then(res => res.json())
    .then(order => {
      if (!order || !order.success) return;
      if (order.deliveredVideoUrl) {
        deliverVideoToClient(order.deliveredVideoUrl, false);
      } else if (order.status === 'PAGO') {
        const overlay = document.getElementById('generating-overlay');
        const deliveredBar = document.getElementById('delivered-video-bar');
        if (overlay && !overlay.classList.contains('is-active') && (!deliveredBar || deliveredBar.style.display !== 'flex')) {
          showWaitingForVideoOverlay(orderId);
        }
      }
    })
    .catch(() => {});
}

// 7. Modals: Clean Login & Signup (NO GOOGLE)
function initModals() {
  const loginBtns = document.querySelectorAll('.h3-showcase__login:not(#btn-logout)');
  const signupBtns = document.querySelectorAll('.h3-showcase__signup');
  const logoutBtn = document.getElementById('btn-logout');

  const authModalBackdrop = document.getElementById('auth-modal-backdrop');
  const authClose = document.getElementById('auth-modal-close');
  const tabSignup = document.getElementById('tab-signup');
  const tabLogin = document.getElementById('tab-login');
  const signupForm = document.getElementById('signup-form');
  const loginForm = document.getElementById('login-form');

  // Tabs switching
  if (tabSignup && tabLogin) {
    tabSignup.addEventListener('click', () => {
      tabSignup.style.background = '#ff1e42';
      tabSignup.style.color = '#ffffff';
      tabSignup.style.fontWeight = '750';
      tabLogin.style.background = 'transparent';
      tabLogin.style.color = '#a2ad96';
      tabLogin.style.fontWeight = '600';
      signupForm.style.display = 'block';
      loginForm.style.display = 'none';
    });

    tabLogin.addEventListener('click', () => {
      tabLogin.style.background = '#ff1e42';
      tabLogin.style.color = '#ffffff';
      tabLogin.style.fontWeight = '750';
      tabSignup.style.background = 'transparent';
      tabSignup.style.color = '#a2ad96';
      tabSignup.style.fontWeight = '600';
      loginForm.style.display = 'block';
      signupForm.style.display = 'none';
    });
  }

  // Open Login
  loginBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      openAuthModal('login');
    });
  });

  // Open Signup
  signupBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      openAuthModal('signup');
    });
  });

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      setCurrentUser(null);
      showToast('Você saiu da sua conta.');
    });
  }

  // Close Auth Modal
  if (authClose) {
    authClose.addEventListener('click', () => {
      authModalBackdrop.classList.remove('is-open');
    });
  }

  authModalBackdrop.addEventListener('click', (e) => {
    if (e.target === authModalBackdrop) {
      authModalBackdrop.classList.remove('is-open');
    }
  });

  // SUBMIT CADASTRO
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const whatsappInput = document.getElementById('reg-whatsapp');
      const whatsapp = whatsappInput ? whatsappInput.value.trim() : '';
      const password = document.getElementById('reg-password').value;
      const errorDiv = document.getElementById('signup-error-msg');

      errorDiv.style.display = 'none';

      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, whatsapp, password })
      })
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        if (status === 200 && data.success) {
          setCurrentUser(data.user);
          authModalBackdrop.classList.remove('is-open');
          showToast(`🎉 Cadastro realizado com sucesso! Bem-vindo, ${data.user.name}!`);
          // Flui direto para o checkout PIX sem atrito
          handleGenerateClick();
        } else {
          errorDiv.textContent = data.error || 'Erro ao realizar cadastro.';
          errorDiv.style.display = 'block';
        }
      })
      .catch(() => {
        errorDiv.textContent = 'Erro de conexão com o servidor.';
        errorDiv.style.display = 'block';
      });
    });
  }

  // SUBMIT LOGIN
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const errorDiv = document.getElementById('login-error-msg');

      errorDiv.style.display = 'none';

      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      .then(res => res.json().then(data => ({ status: res.status, data })))
      .then(({ status, data }) => {
        if (status === 200 && data.success) {
          setCurrentUser(data.user);
          authModalBackdrop.classList.remove('is-open');
          showToast(`Bem-vindo de volta, ${data.user.name}!`);
          // Flui direto para o checkout PIX sem atrito
          handleGenerateClick();
        } else {
          errorDiv.textContent = data.error || 'E-mail ou senha incorretos.';
          errorDiv.style.display = 'block';
        }
      })
      .catch(() => {
        errorDiv.textContent = 'Erro ao conectar com o servidor.';
        errorDiv.style.display = 'block';
      });
    });
  }
}

function openAuthModal(tab = 'signup', message = '') {
  const authModalBackdrop = document.getElementById('auth-modal-backdrop');
  const tabSignup = document.getElementById('tab-signup');
  const tabLogin = document.getElementById('tab-login');
  const signupForm = document.getElementById('signup-form');
  const loginForm = document.getElementById('login-form');

  if (message) showToast(message);

  if (tab === 'login') {
    tabLogin.click();
  } else {
    tabSignup.click();
  }

  authModalBackdrop.classList.add('is-open');
}

// 10. Envio para Admin via API
function sendSubmissionToAdmin(payload, callback) {
  fetch('/api/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(res => res.json().then(data => ({ status: res.status, data })))
  .then(({ status, data }) => {
    if (status === 200 && data.success) {
      console.log('Enviado para a Área Admin com sucesso:', data);
      if (callback && data.submissionId) callback(data.submissionId);
    } else if (data && data.error) {
      console.warn('Erro retornado pelo backend:', data.error);
      showToast('⚠️ ' + data.error);
    }
  })
  .catch(err => {
    console.error('Falha ao enviar para o Admin:', err);
  });
}
window.sendSubmissionToBackend = sendSubmissionToAdmin;

// Toast Helper
function showToast(msg) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'custom-toast';
  toast.innerHTML = `
    <span class="custom-toast-icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="m9 12 2 2 4-4"></path>
      </svg>
    </span>
    <span>${escapeHTML(msg)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// 12. Mobile-First UX: Floating Bottom Sticky CTA
function initMobileStickyBar() {
  const stickyBar = document.getElementById('mobile-sticky-bar');
  const btn = document.getElementById('btn-mobile-sticky-action');
  const promptArea = document.getElementById('h3-showcase-prompt');

  if (btn && promptArea) {
    btn.addEventListener('click', () => {
      promptArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => promptArea.focus(), 400);
    });
  }

  // Hide sticky bar when user is looking directly at prompt studio
  if (stickyBar && promptArea && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          stickyBar.classList.add('is-hidden');
        } else {
          stickyBar.classList.remove('is-hidden');
        }
      });
    }, { threshold: 0.15 });

    observer.observe(promptArea);
  }
}

// 14. Mobile-First UX: Social Proof Toast Notifications
function initSocialProof() {
  const toast = document.getElementById('social-proof-toast');
  const textEl = document.getElementById('social-proof-text');
  const subEl = document.getElementById('social-proof-sub');
  if (!toast || !textEl || !subEl) return;

  const proofs = [
    { name: 'Lucas M.', action: 'gerou um vídeo cinematográfico', time: 'há 2 min' },
    { name: 'Matheus S.', action: 'acabou de pagar via PIX', time: 'há 1 min' },
    { name: 'Felipe A.', action: 'criou um vídeo ultra realista', time: 'há 4 min' },
    { name: 'Bruno K.', action: 'baixou vídeo em 768P', time: 'há 3 min' },
    { name: 'Gabriel T.', action: 'pagamento PIX R$ 4,99 confirmado', time: 'há 5 min' },
    { name: 'Rodrigo V.', action: 'gerou vídeo com MiniMax H3', time: 'há 2 min' },
    { name: 'Rafael D.', action: 'fez download do vídeo em MP4', time: 'há 6 min' },
    { name: 'Gustavo N.', action: 'pagamento PIX aprovado', time: 'há 3 min' },
    { name: 'Leonardo F.', action: 'criou cena em 1080P Ultra', time: 'há 7 min' },
    { name: 'Thiago B.', action: 'acabou de gerar novo vídeo', time: 'há 2 min' }
  ];

  let currentIdx = 0;
  function triggerProof() {
    const item = proofs[currentIdx % proofs.length];
    currentIdx++;
    textEl.innerHTML = `<b>${item.name}</b> ${item.action}`;
    subEl.textContent = `${item.time} · Pagamento PIX aprovado`;
    toast.classList.remove('is-hidden');

    setTimeout(() => {
      toast.classList.add('is-hidden');
    }, 4500);
  }

  setTimeout(() => {
    triggerProof();
    setInterval(triggerProof, 35000);
  }, 5000);
}

// 15. Auto-mask for WhatsApp input
function initPhoneMask() {
  const phoneInput = document.getElementById('reg-whatsapp');
  if (!phoneInput) return;
  phoneInput.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 6) {
      e.target.value = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
    } else if (v.length > 2) {
      e.target.value = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    } else if (v.length > 0) {
      e.target.value = `(${v}`;
    }
  });
}

