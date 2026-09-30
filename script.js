const HER_NAME = "Tejashri";
const MY_NAME = "Your Name";
const MY_WHATSAPP_NUMBER = "919922288760";
const INVITE_TEXT = "Hi, I opened your surprise! I picked";
const YES_RESPONSE_TEXT = "Hi Chetan, yes 😊 Let’s meet sometime. A coffee or a quick meet sounds good to me.";
const NO_RESPONSE_TEXT = "Hi Chetan, sorry, not possible for me right now. I really appreciate the gesture, and I hope you understand. Thank you for being respectful about it.";
const MAX_DODGES = 3;

const screenMap = {
  intro: document.getElementById("intro-screen"),
  scratch: document.getElementById("scratch-screen"),
  reveal: document.getElementById("reveal-screen"),
  yes: document.getElementById("yes-screen"),
  no: document.getElementById("no-screen"),
};

const floatingHearts = document.getElementById("floatingHearts");
const typingText = document.getElementById("typingText");
const openGiftBtn = document.getElementById("openGiftBtn");
const yesBtn = document.getElementById("yesBtn");
const noBtn = document.getElementById("noBtn");
const revealActions = document.getElementById("revealActions");
const replayBtn = document.getElementById("replayBtn");
const muteToggle = document.getElementById("muteToggle");
const planPicker = document.getElementById("planPicker");
const planResult = document.getElementById("planResult");
const whatsappBtn = document.getElementById("whatsappBtn");
const celebrationTitle = document.getElementById("celebrationTitle");

const scratchCard = document.getElementById("scratchCard");
const scratchCanvas = document.getElementById("scratchCanvas");
const scratchCtx = scratchCanvas.getContext("2d", { willReadFrequently: true });
const fireworksCanvas = document.getElementById("fireworksCanvas");
const fireworksCtx = fireworksCanvas.getContext("2d");

let soundEnabled = true;
let audioContext = null;
let noDodgeCount = 0;
let isScratchRevealed = false;
let isScratching = false;
let fireworksLoop = null;
let selectedPlan = "";
let scratchDistance = 0;
let lastScratchPoint = null;

const noMessages = [
  "Are you sure? 🥺",
  "Think again 😄",
  "Last chance 🙈",
];

function resizeFireworksCanvas() {
  const ratio = window.devicePixelRatio || 1;
  fireworksCanvas.width = window.innerWidth * ratio;
  fireworksCanvas.height = window.innerHeight * ratio;
  fireworksCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function showScreen(screenName) {
  Object.entries(screenMap).forEach(([name, element]) => {
    element.classList.toggle("active", name === screenName);
  });

  if (screenName === "scratch") {
    resizeScratchCard();
  }

  if (screenName === "yes") {
    resizeFireworksCanvas();
    startFireworksLoop();
  } else {
    stopFireworksLoop();
  }
}

function setupFloatingHearts() {
  const hearts = ["❤", "♥", "♡", "❤"];

  for (let i = 0; i < 18; i += 1) {
    const heart = document.createElement("span");
    heart.className = "float-heart";
    heart.textContent = hearts[i % hearts.length];
    heart.style.left = `${Math.random() * 100}%`;
    heart.style.top = `${Math.random() * 100}%`;
    heart.style.fontSize = `${Math.random() * 1.2 + 0.9}rem`;
    heart.style.setProperty("--drift", `${(Math.random() - 0.5) * 120}px`);
    heart.style.animationDuration = `${Math.random() * 10 + 12}s`;
    heart.style.animationDelay = `${Math.random() * 5}s`;
    floatingHearts.appendChild(heart);
  }
}

function typeLine(text, callback) {
  typingText.textContent = "";
  let index = 0;

  const tick = () => {
    if (index < text.length) {
      typingText.textContent += text[index];
      index += 1;
      setTimeout(tick, 70);
      return;
    }

    if (callback) {
      setTimeout(callback, 500);
    }
  };

  tick();
}

function setupTypewriter() {
  const lines = [
    `Hey ${HER_NAME} 👋`,
    "I made a tiny plan for Pune 😄",
  ];

  typeLine(lines[0], () => typeLine(lines[1]));
}

function ensureAudioContext() {
  if (!soundEnabled) return null;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function playTone(frequency, duration = 0.12, type = "sine", volume = 0.035) {
  if (!soundEnabled) return;

  const ctx = ensureAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + duration);
}

function playSuccessChime() {
  playTone(440, 0.12, "triangle", 0.04);
  setTimeout(() => playTone(660, 0.18, "triangle", 0.04), 100);
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  muteToggle.textContent = soundEnabled ? "🔊" : "🔇";

  if (soundEnabled) {
    ensureAudioContext();
  }
}

function resizeScratchCard() {
  const rect = scratchCard.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;

  scratchCanvas.width = Math.round(rect.width * ratio);
  scratchCanvas.height = Math.round(rect.height * ratio);
  scratchCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
  scratchCtx.lineCap = "round";
  scratchCtx.lineJoin = "round";
  scratchCtx.fillStyle = "rgba(255,255,255,0.82)";
  scratchCtx.fillRect(0, 0, rect.width, rect.height);
  scratchCtx.fillStyle = "rgba(105, 90, 136, 0.8)";
  scratchCtx.textAlign = "center";
  scratchCtx.textBaseline = "middle";
  scratchCtx.font = "600 16px system-ui";
  scratchCtx.fillText("Scratch here ✨", rect.width / 2, rect.height / 2);
}

function getScratchPoint(event) {
  const rect = scratchCanvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function eraseAtPoint(x, y, radius = 24) {
  scratchCtx.globalCompositeOperation = "destination-out";
  scratchCtx.beginPath();
  scratchCtx.arc(x, y, radius, 0, Math.PI * 2);
  scratchCtx.fill();
  scratchCtx.globalCompositeOperation = "source-over";
}

function revealScratchCard() {
  if (isScratchRevealed) return;

  isScratchRevealed = true;
  scratchCtx.clearRect(0, 0, scratchCard.clientWidth, scratchCard.clientHeight);
  scratchCard.classList.add("revealed");

  const burst = document.createElement("div");
  burst.className = "sparkle-burst";
  burst.style.position = "absolute";
  burst.style.inset = "0";
  burst.style.pointerEvents = "none";
  burst.style.background = "radial-gradient(circle, rgba(255,255,255,0.3), transparent 60%)";
  burst.style.animation = "pulse 0.6s ease-out";
  scratchCard.appendChild(burst);

  setTimeout(() => burst.remove(), 500);
  navigator.vibrate?.([40, 30, 60]);

  setTimeout(() => {
    showScreen("reveal");
  }, 350);
}

function checkScratchProgress() {
  if (isScratchRevealed) return;

  const imageData = scratchCtx.getImageData(0, 0, scratchCanvas.width, scratchCanvas.height).data;
  let transparentPixels = 0;

  for (let i = 3; i < imageData.length; i += 4) {
    if (imageData[i] < 10) {
      transparentPixels += 1;
    }
  }

  const scratchedPercent = (transparentPixels / (scratchCanvas.width * scratchCanvas.height)) * 100;

  if (scratchedPercent > 45 || scratchDistance > 600) {
    revealScratchCard();
  }
}

function setupScratchCard() {
  resizeScratchCard();

  scratchCanvas.addEventListener("pointerdown", (event) => {
    isScratching = true;
    const point = getScratchPoint(event);
    lastScratchPoint = point;
    scratchDistance = 0;
    eraseAtPoint(point.x, point.y, 26);
    navigator.vibrate?.(8);
    checkScratchProgress();
  });

  scratchCanvas.addEventListener("pointermove", (event) => {
    if (!isScratching) return;

    const point = getScratchPoint(event);
    const dx = point.x - (lastScratchPoint?.x ?? point.x);
    const dy = point.y - (lastScratchPoint?.y ?? point.y);
    scratchDistance += Math.hypot(dx, dy);
    lastScratchPoint = point;

    eraseAtPoint(point.x, point.y, 24);
    navigator.vibrate?.(8);
    checkScratchProgress();
  });

  scratchCanvas.addEventListener("pointerup", () => {
    isScratching = false;
  });

  scratchCanvas.addEventListener("pointerleave", () => {
    isScratching = false;
  });

  window.addEventListener("resize", () => {
    if (screenMap.scratch.classList.contains("active")) {
      resizeScratchCard();
    }
  });
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function moveNoButton() {
  const width = noBtn.offsetWidth || 116;
  const height = noBtn.offsetHeight || 44;
  const bounds = revealActions.getBoundingClientRect();
  const yesWidth = yesBtn.offsetWidth || 220;
  const yesHeight = yesBtn.offsetHeight || 56;

  const yesBox = {
    left: bounds.width / 2 - yesWidth / 2 - 24,
    right: bounds.width / 2 + yesWidth / 2 + 24,
    top: bounds.height - yesHeight - 30,
    bottom: bounds.height - 4,
  };

  let left = 0;
  let top = 0;
  let attempts = 0;

  do {
    left = randomBetween(8, Math.max(10, bounds.width - width - 12));
    top = randomBetween(8, Math.max(10, bounds.height - height - 12));
    attempts += 1;
  } while (
    attempts < 30 &&
    !(left + width < yesBox.left || left > yesBox.right || top + height < yesBox.top || top > yesBox.bottom)
  );

  noBtn.style.position = "absolute";
  noBtn.style.left = `${left}px`;
  noBtn.style.top = `${top}px`;
  noBtn.style.right = "auto";
  noBtn.style.transform = `scale(${Math.max(0.8, 1 - noDodgeCount * 0.06)})`;
}

function handleNoTap(event) {
  event.preventDefault();

  if (noDodgeCount >= MAX_DODGES) {
    showScreen("no");
    return;
  }

  noDodgeCount += 1;
  noBtn.textContent = noMessages[Math.min(noDodgeCount - 1, noMessages.length - 1)];
  moveNoButton();
  playSuccessChime();
  navigator.vibrate?.(25);

  if (noDodgeCount >= MAX_DODGES) {
    setTimeout(() => {
      showScreen("no");
    }, 180);
  }
}

function setupNoButton() {
  noBtn.addEventListener("pointerenter", handleNoTap);
  noBtn.addEventListener("click", handleNoTap);
}

function setupMainActions() {
  openGiftBtn.addEventListener("click", () => {
    playSuccessChime();
    showScreen("scratch");
  });

  yesBtn.addEventListener("click", () => {
    playSuccessChime();
    showScreen("yes");
  });

  const yesFlowBtn = document.getElementById("yesFlowBtn");
  if (yesFlowBtn) {
    yesFlowBtn.addEventListener("click", () => {
      openWhatsAppChat(YES_RESPONSE_TEXT);
    });
  }

  replayBtn.addEventListener("click", () => {
    playSuccessChime();
    noDodgeCount = 0;
    isScratchRevealed = false;
    noBtn.textContent = "No 🙈";
    noBtn.style.position = "absolute";
    noBtn.style.left = "auto";
    noBtn.style.top = "8px";
    noBtn.style.right = "12px";
    noBtn.style.transform = "scale(1)";
    showScreen("intro");
    setupTypewriter();
    resizeScratchCard();
  });

  const noChatBtn = document.getElementById("noChatBtn");
  if (noChatBtn) {
    noChatBtn.addEventListener("click", () => {
      openWhatsAppChat(NO_RESPONSE_TEXT);
    });
  }

  muteToggle.addEventListener("click", toggleSound);
}

function setupPlanPicker() {
  document.querySelectorAll(".plan-option").forEach((button) => {
    button.addEventListener("click", () => {
      selectedPlan = button.dataset.option;
      planPicker.classList.add("hidden");
      planResult.classList.remove("hidden");
      playSuccessChime();
    });
  });

  whatsappBtn.addEventListener("click", () => {
    const cleanNumber = MY_WHATSAPP_NUMBER.replace(/\D/g, "");
    const message = `${INVITE_TEXT} ${selectedPlan} 😊 I was thinking a casual first meet in Pune would be a good one.`;
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  });
}

function openWhatsAppChat(message) {
  const cleanNumber = MY_WHATSAPP_NUMBER.replace(/\D/g, "");
  const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function launchFireworkBurst(x, y, color) {
  const particles = [];
  const burstCount = 24;

  for (let i = 0; i < burstCount; i += 1) {
    const angle = (Math.PI * 2 * i) / burstCount;
    const speed = randomBetween(1.8, 4.8);

    particles.push({
      x,
      y,
      radius: randomBetween(2, 4),
      color,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      gravity: 0.08,
    });
  }

  return particles;
}

function startFireworksLoop() {
  stopFireworksLoop();

  const particles = [];
  const confetti = [];
  const palette = ["#ff7ec6", "#ffd166", "#7ee7d5", "#a78bfa", "#ffb38a", "#fef08a"];

  const animate = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    fireworksCtx.clearRect(0, 0, width, height);

    if (Math.random() < 0.06) {
      const rocketX = randomBetween(width * 0.1, width * 0.9);
      const rocketY = height;
      const targetY = randomBetween(height * 0.15, height * 0.55);
      const color = palette[Math.floor(Math.random() * palette.length)];

      particles.push({
        x: rocketX,
        y: rocketY,
        targetY,
        color,
        vx: 0,
        vy: 0,
        isRocket: true,
      });
    }

    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const particle = particles[i];

      if (particle.isRocket) {
        particle.y += (particle.targetY - particle.y) * 0.12;
        particle.x += (randomBetween(-1.6, 1.6));

        fireworksCtx.fillStyle = particle.color;
        fireworksCtx.fillRect(particle.x, particle.y, 4, 10);

        if (Math.abs(particle.targetY - particle.y) < 8) {
          const burst = launchFireworkBurst(particle.x, particle.y, particle.color);
          particles.splice(i, 1, ...burst);
        }
        continue;
      }

      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += particle.gravity;
      particle.life -= 0.014;

      fireworksCtx.fillStyle = particle.color;
      fireworksCtx.globalAlpha = Math.max(0, particle.life);
      fireworksCtx.fillRect(particle.x, particle.y, particle.radius, particle.radius * 1.7);
      fireworksCtx.globalAlpha = 1;

      if (particle.life <= 0) {
        particles.splice(i, 1);
      }
    }

    if (confetti.length < 70) {
      confetti.push({
        x: randomBetween(0, width),
        y: randomBetween(-30, 10),
        size: randomBetween(3, 8),
        speed: randomBetween(1.5, 3.3),
        drift: randomBetween(-1.3, 1.3),
        color: palette[Math.floor(Math.random() * palette.length)],
      });
    }

    for (let i = confetti.length - 1; i >= 0; i -= 1) {
      const piece = confetti[i];
      piece.y += piece.speed;
      piece.x += piece.drift;

      if (piece.y > height) {
        confetti.splice(i, 1);
        continue;
      }

      fireworksCtx.fillStyle = piece.color;
      fireworksCtx.fillRect(piece.x, piece.y, piece.size, piece.size * 1.4);
    }

    fireworksLoop = requestAnimationFrame(animate);
  };

  fireworksLoop = requestAnimationFrame(animate);
}

function stopFireworksLoop() {
  if (fireworksLoop) {
    cancelAnimationFrame(fireworksLoop);
    fireworksLoop = null;
  }

  fireworksCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
}

function prepareForFirstView() {
  showScreen("intro");
  setupTypewriter();
  setupMainActions();
  setupScratchCard();
  setupNoButton();
  setupPlanPicker();
  muteToggle.textContent = soundEnabled ? "🔊" : "🔇";
}

window.addEventListener("resize", () => {
  if (screenMap.scratch.classList.contains("active")) {
    resizeScratchCard();
  }

  if (screenMap.yes.classList.contains("active")) {
    resizeFireworksCanvas();
  }
});

prepareForFirstView();
