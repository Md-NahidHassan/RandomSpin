// --- Live 3D Starfield Background ---
function initGalaxy() {
  const canvas = document.getElementById('galaxy-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width, height;
  let stars = [];

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }
  window.addEventListener('resize', resize);
  resize();

  for(let i=0; i<400; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      z: Math.random() * width,
      radius: Math.random() * 1.5
    });
  }

  function animateStars() {
    ctx.clearRect(0, 0, width, height);

    for (let star of stars) {
      star.z -= 0.5;
      if (star.z <= 0) {
        star.z = width;
        star.x = Math.random() * width;
        star.y = Math.random() * height;
      }
      
      const k = 128.0 / star.z;
      const px = (star.x - width / 2) * k + width / 2;
      const py = (star.y - height / 2) * k + height / 2;
      
      if (px >= 0 && px <= width && py >= 0 && py <= height) {
        let size = (1 - star.z / width) * 2;
        let shade = parseInt((1 - star.z / width) * 255);
        ctx.beginPath();
        ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 4;
        ctx.shadowColor = `rgba(255,255,255,${(1 - star.z / width)})`;
      }
    }
    requestAnimationFrame(animateStars);
  }
  animateStars();
}

const STATE_KEY = 'luckyDrawState_vanilla';

// Default State
let state = {
  participants: [],
  winners: []
};

// Colors for wheel
const sliceColors = ["#ec4899", "#06b6d4", "#8b5cf6", "#f43f5e", "#3b82f6", "#14b8a6", "#ef4444", "#f59e0b"];

// Audio Context (Optional implementation for tick/win sounds)
const tickAudio = new Audio('data:audio/wav;base64,UklGRqYAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YYIAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA...'); // Minimal dummy blob or replace with real URL. We will use simple oscillator beep for tick.

const playTick = () => {
  try {
    const actx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, actx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start();
    osc.stop(actx.currentTime + 0.05);
  } catch(e) {}
};

const playWin = () => {
  try {
    const actx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, actx.currentTime);
    osc.frequency.setValueAtTime(600, actx.currentTime + 0.1);
    osc.frequency.setValueAtTime(800, actx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.2, actx.currentTime);
    gain.gain.linearRampToValueAtTime(0, actx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(actx.destination);
    osc.start();
    osc.stop(actx.currentTime + 0.6);
  } catch(e) {}
};

// DOM Elements
const els = {
  input: document.getElementById('participant-input'),
  addBtn: document.getElementById('add-btn'),
  partList: document.getElementById('participant-list'),
  winList: document.getElementById('winner-list'),
  clearPartBtn: document.getElementById('clear-participants-btn'),
  clearWinBtn: document.getElementById('clear-winners-btn'),
  partCount: document.getElementById('participant-count'),
  winCount: document.getElementById('winner-count'),
  badgePartCount: document.getElementById('participant-count-badge'),
  badgeWinCount: document.getElementById('winner-count-badge'),
  canvas: document.getElementById('wheel-canvas'),
  spinBtn: document.getElementById('spin-btn'),
  
  // Modals
  winnerModal: document.getElementById('winner-modal'),
  winnerName: document.getElementById('winner-name'),
  continueBtn: document.getElementById('continue-btn'),
  
  finishModal: document.getElementById('finish-modal'),
  finalTotalParts: document.getElementById('final-total-participants'),
  finalTotalWins: document.getElementById('final-total-winners'),
  finalWinnersList: document.getElementById('final-winners-list'),
  resetEverythingBtn: document.getElementById('reset-everything-btn'),
  newGameBtn: document.getElementById('new-game-btn')
};

const ctx = els.canvas.getContext('2d');
let currentRotation = 0;
let isSpinning = false;
let animationFrameId = null;

// Initialization
function init() {
  initGalaxy();
  loadState();
  bindEvents();
  renderAll();
  
  // High DPI Canvas Scaling
  const dpr = window.devicePixelRatio || 1;
  const rect = els.canvas.getBoundingClientRect();
  els.canvas.width = rect.width * dpr;
  els.canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  
  drawWheel();
}

function loadState() {
  const saved = localStorage.getItem(STATE_KEY);
  if (saved) {
    try {
      state = JSON.parse(saved);
      if(!state.participants) state.participants = [];
      if(!state.winners) state.winners = [];
    } catch (e) {
      console.error(e);
    }
  }
}

function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

// Rendering UI
function renderAll() {
  renderParticipants();
  renderWinners();
  updateCounters();
  drawWheel();
}

function updateCounters() {
  els.partCount.textContent = state.participants.length;
  els.badgePartCount.textContent = state.participants.length;
  els.winCount.textContent = state.winners.length;
  els.badgeWinCount.textContent = state.winners.length;
  
  els.spinBtn.disabled = state.participants.length < 2 || isSpinning;
}

function renderParticipants() {
  els.partList.innerHTML = '';
  state.participants.forEach((p, idx) => {
    const li = document.createElement('li');
    li.className = 'list-item';
    li.innerHTML = `
      <span class="participant-name">${idx + 1}. ${p}</span>
      <button class="remove-btn" data-name="${p}" title="Remove">×</button>
    `;
    els.partList.appendChild(li);
  });
}

function renderWinners() {
  els.winList.innerHTML = '';
  state.winners.forEach((w, idx) => {
    const li = document.createElement('li');
    li.className = 'list-item winner-item';
    
    let rankHtml = `#${idx + 1}`;
    if (idx === 0) rankHtml = '🥇';
    else if (idx === 1) rankHtml = '🥈';
    else if (idx === 2) rankHtml = '🥉';

    li.innerHTML = `
      <div>
        <span class="position">${rankHtml}</span>
        <span class="participant-name text-gradient">${w}</span>
      </div>
      <span class="time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
    `;
    els.winList.appendChild(li);
  });
}

// Events
function bindEvents() {
  els.addBtn.addEventListener('click', addParticipant);
  els.input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addParticipant();
  });

  els.partList.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-btn')) {
      const name = e.target.getAttribute('data-name');
      removeParticipant(name);
    }
  });

  els.clearPartBtn.addEventListener('click', () => {
    if(confirm('Are you sure you want to clear all participants?')) {
      state.participants = [];
      saveState();
      renderAll();
    }
  });

  els.clearWinBtn.addEventListener('click', () => {
    if(confirm('Are you sure you want to clear the winners history?')) {
      state.winners = [];
      saveState();
      renderAll();
    }
  });

  els.spinBtn.addEventListener('click', startSpin);

  els.continueBtn.addEventListener('click', () => {
    els.winnerModal.classList.add('hidden');
    checkFinishState();
  });

  els.resetEverythingBtn.addEventListener('click', () => {
    state.participants = [];
    state.winners = [];
    saveState();
    els.finishModal.classList.add('hidden');
    renderAll();
  });

  els.newGameBtn.addEventListener('click', () => {
    els.finishModal.classList.add('hidden');
  });

  // Handle resize for canvas
  window.addEventListener('resize', () => {
    if(isSpinning) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = els.canvas.getBoundingClientRect();
    els.canvas.width = rect.width * dpr;
    els.canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    drawWheel();
  });
}

function addParticipant() {
  const val = els.input.value.trim();
  if (!val) return;
  if (state.participants.includes(val)) {
    alert("Participant already exists!");
    return;
  }
  state.participants.push(val);
  els.input.value = '';
  saveState();
  renderAll();
}

function removeParticipant(name) {
  state.participants = state.participants.filter(p => p !== name);
  saveState();
  renderAll();
}

// --- Canvas Drawing Logic ---
function drawWheel(rotationObj = { angle: currentRotation }) {
  const numSlices = state.participants.length;
  const cw = els.canvas.clientWidth;
  const ch = els.canvas.clientHeight;
  const centerX = cw / 2;
  const centerY = ch / 2;
  const radius = Math.min(cw, ch) / 2 - 10;

  ctx.clearRect(0, 0, cw, ch);

  if (numSlices === 0) {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD PARTICIPANTS', centerX, centerY - 60);
    return;
  }

  const arc = (2 * Math.PI) / numSlices;

  for (let i = 0; i < numSlices; i++) {
    const angle = rotationObj.angle + i * arc;
    const color = sliceColors[i % sliceColors.length];
    
    // Draw slice
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, angle, angle + arc);
    ctx.lineTo(centerX, centerY);
    ctx.fill();

    // Draw text
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle + arc / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold ' + Math.max(12, Math.min(20, 150/numSlices)) + 'px Inter, sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    
    // Max width of text is radius - 60 (to leave room for center button space and edge)
    const text = state.participants[i];
    ctx.fillText(text, radius - 20, 0, radius - 80);
    
    ctx.restore();
    
    // Draw separator line
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, angle, angle);
    ctx.stroke();
  }
}

// --- Spin Logic ---
function startSpin() {
  if (state.participants.length < 2 || isSpinning) return;
  isSpinning = true;
  updateCounters();
  
  els.spinBtn.textContent = 'SPINNING...';
  
  const N = state.participants.length;
  const winIdx = Math.floor(Math.random() * N);
  
  // Angle per slice
  const arc = (2 * Math.PI) / N;
  
  // We want the WINNER slice (winIdx) to have its center at the TOP (-PI/2 or 270 deg)
  // Initially, slice `i` starts at `i * arc`. 
  // Center of slice `winIdx` is: `winIdx * arc + arc/2`.
  // To reach top (-PI/2), wheel must rotate by: `targetRot`
  // `targetRot + winIdx * arc + arc/2 = -PI/2`
  // `targetRot = -PI/2 - (winIdx * arc + arc/2)`
  
  const targetAngle = -Math.PI/2 - (winIdx * arc + arc / 2);
  
  // Normalize current rotation
  const currRot = currentRotation % (2 * Math.PI);
  
  // Calculate relative rotation needed to hit target 
  // We want it to spin forward, so delta must be positive.
  let delta = targetAngle - currRot;
  while(delta < 0) delta += 2 * Math.PI;
  
  // Add base rotations (e.g., 5 full spins = 10 * PI)
  const fullRotations = 10 * Math.PI;
  const totalRotationInRad = currRot + fullRotations + delta;
  
  const duration = 5000;
  const startTime = performance.now();
  
  let lastTickAngle = currRot;

  function animate(time) {
    const elapsed = time - startTime;
    let progress = elapsed / duration;
    
    if (progress >= 1) progress = 1;
    
    // EaseOut Quart
    const ease = 1 - Math.pow(1 - progress, 4);
    
    const newRot = currRot + (totalRotationInRad - currRot) * ease;
    currentRotation = newRot;
    
    // Tick sound roughly once per slice
    if(Math.abs(newRot - lastTickAngle) >= arc) {
      playTick();
      lastTickAngle = newRot;
    }
    
    drawWheel({ angle: currentRotation });
    
    if (progress < 1) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      isSpinning = false;
      finishSpin(winIdx);
    }
  }
  
  animationFrameId = requestAnimationFrame(animate);
}

function finishSpin(winIdx) {
  const winnerMatch = state.participants[winIdx];
  
  els.spinBtn.textContent = 'SPIN';
  els.winnerName.textContent = winnerMatch;
  els.winnerModal.classList.remove('hidden');
  
  playWin();
  confetti({
    particleCount: 150,
    spread: 100,
    origin: { y: 0.6 },
    colors: ['#06b6d4', '#f472b6', '#ffffff']
  });

  // State Updates - Auto Remove & Move to Winners
  state.winners.unshift(winnerMatch); // add to top of winners list
  state.participants = state.participants.filter((p, i) => i !== winIdx);
  saveState();
  renderAll(); // redraws the wheel with one less slice instantly underneath!
}

function checkFinishState() {
  if (state.participants.length === 0 || state.participants.length === 1) {
    if(state.winners.length > 0) {
      setTimeout(() => {
        els.finalTotalParts.textContent = state.winners.length + state.participants.length;
        els.finalTotalWins.textContent = state.winners.length;
        
        els.finalWinnersList.innerHTML = '';
        [...state.winners].reverse().forEach((w, i) => {
           els.finalWinnersList.innerHTML += `<li style="padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.1)"><b>#${i+1}</b> ${w}</li>`;
        });

        els.finishModal.classList.remove('hidden');
        confetti({ particleCount: 300, spread: 200, origin: {y:0.3} });
      }, 500); // slight delay after closing winner modal
    }
  }
}

// Initialize on DOM Load
document.addEventListener('DOMContentLoaded', init);
