// ===== NAV COUNTDOWN =====
(function () {
  // Target: 48 hours from first load (persisted in sessionStorage)
  const KEY = "sg_countdown_end";
  let endTime = parseInt(sessionStorage.getItem(KEY));
  if (!endTime || endTime < Date.now()) {
    endTime = Date.now() + 48 * 60 * 60 * 1000;
    sessionStorage.setItem(KEY, endTime);
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function tick() {
    const diff = endTime - Date.now();
    const formatted =
      diff <= 0
        ? "00:00:00"
        : (() => {
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            return `${pad(h)}:${pad(m)}:${pad(s)}`;
          })();
    [
      "hero-countdown-timer",
      "select-countdown-timer",
      "peek-countdown-timer",
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = formatted;
    });
  }

  tick();
  setInterval(tick, 1000);
})();

// ===== STATE =====
let currentGame = null;
let currentMode = null;
let finalScore = 0;
let gameLoop = null;
let gameActive = false;
let captureStage = "result"; // result | form | success
let leaderboardFilter = "all";
let starRating = 0;

// ===== PLAYER PROFILE (localStorage) =====
const PROFILE_KEY = "hyper_player_profile";

function getProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) || null;
  } catch {
    return null;
  }
}

function saveProfile(data) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
}

// Returns the player's existing entry for a given game, or null
function getExistingEntry(game) {
  const profile = getProfile();
  if (!profile) return null;
  return (
    leaderboard.find(
      (e) => e.isUser && e.game === game && e._profileId === profile.id,
    ) || null
  );
}

const GAMES = {
  sugarrush: {
    title: "SUGAR RUSH",
    desc: "Swap candies, trigger cascades, and rack up a higher score before time runs out.",
    tag: "Strategy · Speed",
    art: "⚡",
    image: "./assets/Sugar rush.jpg",
    video: "./assets/Railway Run.mp4",
    artBg: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
    instructions: "CLICK the targets as fast as you can!",
    maxScore: 2000,
  },
  soloshooter: {
    title: "SOLO SHOOTER",
    desc: "Kill as many enemies as you can before time runs out.",
    tag: "Shooter · Endurance",
    art: "🧠",
    image: "./assets/Solo shooter.jpg",
    video: "./assets/Solo Shooter.mp4",
    artBg: "linear-gradient(135deg, #1a0533, #3c1a5e, #6d28d9)",
    instructions: "CLICK cards to flip them — match all pairs!",
    maxScore: 5000,
  },
  railwayrun: {
    title: "RAILWAY RUN",
    desc: "Dodge obstacles and outpace your rivals for the top spot on the leaderboard.",
    tag: "Runner · Skill",
    art: "🐍",
    image: "./assets/Railway Run.jpg",
    video: "./assets/Railway Run.mp4",
    artBg: "linear-gradient(135deg, #1a0a00, #7c2d12, #dc2626)",
    instructions: "Arrow keys / WASD to move the snake",
    maxScore: 1500,
  },
};

// Fake leaderboard seed data
const seedData = [
  { name: "AdekunleG", game: "sugarrush", score: 1840, avatar: "Avatar 1.png" },
  {
    name: "PraiseOlu",
    game: "railwayrun",
    score: 1320,
    avatar: "Avatar 2.png",
  },
  {
    name: "TobiWale",
    game: "soloshooter",
    score: 4600,
    avatar: "Avatar 3.png",
  },
  { name: "ChiDiva", game: "sugarrush", score: 1720, avatar: "Avatar 4.png" },
  { name: "SuleGee", game: "railwayrun", score: 1190, avatar: "Avatar 5.png" },
  { name: "BusayoX", game: "soloshooter", score: 4320, avatar: "Avatar 6.png" },
  { name: "EmmaDelta", game: "sugarrush", score: 1650, avatar: "Avatar 7.png" },
  {
    name: "ZainabPro",
    game: "soloshooter",
    score: 3980,
    avatar: "Avatar 8.png",
  },
];

const LB_KEY = "hyper_leaderboard";

const GAME_ID_MIGRATION = {
  reflex: "sugarrush",
  memory: "soloshooter",
  snake: "railwayrun",
};

function loadLeaderboard() {
  try {
    const saved = JSON.parse(localStorage.getItem(LB_KEY));
    if (Array.isArray(saved) && saved.length) {
      // Migrate any legacy game IDs
      return saved.map((e) => ({
        ...e,
        game: GAME_ID_MIGRATION[e.game] || e.game,
      }));
    }
  } catch {}
  return [...seedData];
}

function persistLeaderboard() {
  localStorage.setItem(LB_KEY, JSON.stringify(leaderboard));
}

let leaderboard = loadLeaderboard();

// ===== NAVIGATION =====
function showScreen(id) {
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.remove("active"));
  const screen = document.getElementById(id);
  screen.classList.add("active");
  screen.scrollTop = 0;
  window.scrollTo(0, 0);
}

function goHome() {
  stopGame();
  showScreen("home");
}

function selectGame(gameId) {
  currentGame = gameId;
  const g = GAMES[gameId];

  // Hero video / image
  const art = document.getElementById("select-art");
  if (g.video) {
    art.innerHTML = `<video src="${g.video}" autoplay loop muted playsinline poster="${g.image}" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:inherit;"></video>`;
  } else {
    art.innerHTML = `<img src="${g.image}" alt="${g.title}" />`;
  }

  // Title, tag, desc
  document.getElementById("select-title").textContent = g.title;
  document.getElementById("select-tag").textContent = g.tag;
  document.getElementById("select-desc").textContent = g.desc;

  renderLBPeek(gameId);
  showScreen("game-select");
}

function renderLBPeek(gameId) {
  const rows = leaderboard
    .filter((e) => e.game === gameId)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const cont = document.getElementById("lb-peek-rows");
  const rankIcons = [
    '<img src="./assets/1st.svg" class="peek-rank-svg" alt="1st">',
    '<img src="./assets/2nd.svg" class="peek-rank-svg" alt="2nd">',
    '<img src="./assets/3rd.svg" class="peek-rank-svg" alt="3rd">',
  ];
  const rankClasses = ["gold", "silver", "bronze"];
  cont.innerHTML = rows.length
    ? rows
        .map(
          (r, i) => `
    <div class="lb-row peek-row">
      <span class="lb-rank ${rankClasses[i]}">${rankIcons[i]}</span>
      <span class="peek-avatar">${getAvatar(r)}</span>
      <span class="lb-name">${r.name}${r.isUser ? ' <span class="lb-you-tag">YOU</span>' : ""}</span>
      <span class="lb-score">${r.score.toLocaleString()}</span>
    </div>
  `,
        )
        .join("")
    : '<div style="color:var(--muted);font-size:13px;text-align:center;padding:12px">Be the first to score!</div>';
}

function startGame(mode) {
  currentMode = mode;
  const g = GAMES[currentGame];
  document.getElementById("game-name-label").textContent = g.title;
  const badge = document.getElementById("mode-badge");
  badge.textContent = mode === "tournament" ? "🏆 TOURNAMENT" : "🎮 PRACTICE";
  badge.className = "mode-badge " + mode;
  document.getElementById("game-instructions").textContent = g.instructions;
  showScreen("game-screen");
  initGame(currentGame);
}

function exitGame() {
  stopGame();
  selectGame(currentGame);
}

// ===== GAME ENGINE =====
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function initGame(gameId) {
  stopGame();
  finalScore = 0;
  document.getElementById("live-score").textContent = "0";
  gameActive = true;

  if (gameId === "sugarrush") initReflex();
  else if (gameId === "soloshooter") initMemory();
  else if (gameId === "railwayrun") initSnake();
}

function stopGame() {
  gameActive = false;
  if (gameLoop) {
    clearInterval(gameLoop);
    clearTimeout(gameLoop);
    gameLoop = null;
  }
  canvas.onclick = null;
  canvas.onmousemove = null;
  document.onkeydown = null;
}

function updateScore(s) {
  finalScore = s;
  document.getElementById("live-score").textContent = s.toLocaleString();
}

function endGame() {
  stopGame();
  setTimeout(() => showResult(), 400);
}

// --- REFLEX RUSH ---
function initReflex() {
  let score = 0,
    timeLeft = 30,
    targets = [];
  const COLORS = ["#f5a623", "#7c3aed", "#22c55e", "#3b82f6"];
  document.getElementById("live-time").textContent = "30";

  function spawnTarget() {
    const margin = 40;
    const r = 28 + Math.random() * 20;
    targets.push({
      x: margin + Math.random() * (canvas.width - margin * 2),
      y: margin + Math.random() * (canvas.height - margin * 2),
      r,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      born: Date.now(),
      life: 1200 + Math.random() * 800,
      hit: false,
      scale: 0,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const now = Date.now();
    targets = targets.filter((t) => {
      const age = now - t.born;
      if (age > t.life && !t.hit) return false;
      t.scale = t.hit
        ? Math.max(0, t.scale - 0.15)
        : Math.min(1, t.scale + 0.1);
      const fade = t.hit ? t.scale : Math.max(0, 1 - (age / t.life) * 0.6);

      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);

      // glow
      const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, t.r * 2);
      grd.addColorStop(0, t.color + "60");
      grd.addColorStop(1, "transparent");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(0, 0, t.r * 2, 0, Math.PI * 2);
      ctx.fill();

      // circle
      ctx.fillStyle = t.hit ? "#ffffff" : t.color;
      ctx.beginPath();
      ctx.arc(0, 0, t.r, 0, Math.PI * 2);
      ctx.fill();

      // inner ring
      ctx.strokeStyle = "#ffffff40";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, t.r * 0.6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
      return t.hit ? t.scale > 0 : true;
    });
  }

  canvas.onclick = (e) => {
    if (!gameActive) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    let hit = false;
    targets.forEach((t) => {
      if (!t.hit && Math.hypot(mx - t.x, my - t.y) < t.r) {
        t.hit = true;
        hit = true;
        const timeBonus = Math.round((1 - (Date.now() - t.born) / t.life) * 30);
        score += 50 + timeBonus;
        updateScore(score);
      }
    });
  };

  spawnTarget();
  spawnTarget();
  const spawnInt = setInterval(() => {
    if (!gameActive) {
      clearInterval(spawnInt);
      return;
    }
    if (targets.filter((t) => !t.hit).length < 5) spawnTarget();
  }, 600);

  const drawInt = setInterval(() => {
    if (gameActive) draw();
    else clearInterval(drawInt);
  }, 16);

  const timer = setInterval(() => {
    if (!gameActive) {
      clearInterval(timer);
      return;
    }
    timeLeft--;
    document.getElementById("live-time").textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timer);
      clearInterval(spawnInt);
      clearInterval(drawInt);
      endGame();
    }
  }, 1000);
}

// --- MIND MATCH ---
function initMemory() {
  const emojis = ["🔥", "⚡", "💎", "🎯", "🚀", "👑", "🎮", "💫"];
  let cards = [],
    flipped = [],
    matched = [],
    moves = 0,
    startTime = Date.now();
  const COLS = 4,
    ROWS = 4,
    CW = canvas.width / COLS,
    CH = canvas.height / ROWS;

  document.getElementById("live-time").textContent = "—";
  const shuffled = [...emojis, ...emojis].sort(() => Math.random() - 0.5);
  cards = shuffled.map((e, i) => ({
    emoji: e,
    row: Math.floor(i / COLS),
    col: i % COLS,
    flipped: false,
    matched: false,
    flip: 0,
  }));

  function getScore() {
    const secs = (Date.now() - startTime) / 1000;
    return Math.max(500, Math.round(5000 - secs * 30 - moves * 20));
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    cards.forEach((c) => {
      const x = c.col * CW,
        y = c.row * CH;
      const pad = 8;
      const target = c.flipped || c.matched ? 1 : 0;
      c.flip += (target - c.flip) * 0.15;

      const w = CW - pad * 2,
        h = CH - pad * 2;
      const cx = x + pad + w / 2,
        cy = y + pad + h / 2;
      const scaleX = Math.abs(c.flip * 2 - 1);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scaleX, 1);

      const roundRect = (x, y, w, h, r) => {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, r);
      };

      if (c.flip < 0.5) {
        // back
        ctx.fillStyle = c.matched ? "#1a1a28" : "#1e1e30";
        roundRect(-w / 2, -h / 2, w, h, 10);
        ctx.fill();
        if (!c.matched) {
          ctx.strokeStyle = "#ffffff15";
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = "#ffffff20";
          ctx.font = "20px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("?", 0, 0);
        }
      } else {
        // front
        ctx.fillStyle = c.matched ? "#0d2d1a" : "#1a1630";
        roundRect(-w / 2, -h / 2, w, h, 10);
        ctx.fill();
        ctx.strokeStyle = c.matched ? "#22c55e60" : "#7c3aed60";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.font = `${Math.min(w, h) * 0.45}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(c.emoji, 0, 0);
      }
      ctx.restore();
    });
  }

  canvas.onclick = (e) => {
    if (!gameActive || flipped.length >= 2) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    const col = Math.floor(mx / CW),
      row = Math.floor(my / CH);
    const card = cards.find(
      (c) => c.col === col && c.row === row && !c.flipped && !c.matched,
    );
    if (!card) return;
    card.flipped = true;
    flipped.push(card);
    moves++;

    if (flipped.length === 2) {
      if (flipped[0].emoji === flipped[1].emoji) {
        flipped.forEach((c) => (c.matched = true));
        matched.push(...flipped);
        flipped = [];
        const sc = getScore();
        updateScore(sc);
        if (matched.length === cards.length) {
          setTimeout(() => endGame(), 500);
        }
      } else {
        setTimeout(() => {
          flipped.forEach((c) => (c.flipped = false));
          flipped = [];
        }, 900);
      }
    }
  };

  const drawInt = setInterval(() => {
    if (gameActive) draw();
    else clearInterval(drawInt);
  }, 16);
}

// --- SIGMA SNAKE ---
function initSnake() {
  const CELL = 20,
    COLS = canvas.width / CELL,
    ROWS = canvas.height / CELL;
  let snake = [{ x: 10, y: 10 }],
    dir = { x: 1, y: 0 },
    nextDir = { x: 1, y: 0 };
  let food = placeFood(),
    score = 0,
    timeLeft = 60;
  document.getElementById("live-time").textContent = "60";

  function placeFood() {
    let f;
    do {
      f = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
      };
    } while (snake.some((s) => s.x === f.x && s.y === f.y));
    return f;
  }

  document.onkeydown = (e) => {
    const keys = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      w: { x: 0, y: -1 },
      s: { x: 0, y: 1 },
      a: { x: -1, y: 0 },
      d: { x: 1, y: 0 },
    };
    const k = keys[e.key];
    if (k && !(k.x === -dir.x && k.y === -dir.y)) {
      nextDir = k;
      e.preventDefault();
    }
  };

  function step() {
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (
      head.x < 0 ||
      head.x >= COLS ||
      head.y < 0 ||
      head.y >= ROWS ||
      snake.some((s) => s.x === head.x && s.y === head.y)
    ) {
      endGame();
      return;
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 50;
      updateScore(score);
      food = placeFood();
    } else {
      snake.pop();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // grid
    ctx.strokeStyle = "#ffffff06";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(canvas.width, y * CELL);
      ctx.stroke();
    }

    // food glow
    const grd = ctx.createRadialGradient(
      food.x * CELL + CELL / 2,
      food.y * CELL + CELL / 2,
      0,
      food.x * CELL + CELL / 2,
      food.y * CELL + CELL / 2,
      CELL * 1.5,
    );
    grd.addColorStop(0, "#f5a62380");
    grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(
      food.x * CELL + CELL / 2,
      food.y * CELL + CELL / 2,
      CELL * 1.5,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.fillStyle = "#f5a623";
    ctx.beginPath();
    ctx.roundRect(food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4, 4);
    ctx.fill();

    // snake
    snake.forEach((s, i) => {
      const t = 1 - i / snake.length;
      ctx.fillStyle =
        i === 0 ? "#22c55e" : `hsl(${140 - i * 3}, 80%, ${40 + t * 20}%)`;
      ctx.beginPath();
      ctx.roundRect(
        s.x * CELL + 1,
        s.y * CELL + 1,
        CELL - 2,
        CELL - 2,
        i === 0 ? 6 : 3,
      );
      ctx.fill();
    });
  }

  const stepInt = setInterval(() => {
    if (!gameActive) {
      clearInterval(stepInt);
      return;
    }
    step();
    draw();
  }, 120);
  const timer = setInterval(() => {
    if (!gameActive) {
      clearInterval(timer);
      return;
    }
    timeLeft--;
    document.getElementById("live-time").textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timer);
      clearInterval(stepInt);
      endGame();
    }
  }, 1000);
}

// ===== RESULT OVERLAY =====
function showResult() {
  captureStage = "result";
  renderResultCard();
  document.getElementById("result-overlay").classList.add("show");
}

function renderResultCard() {
  const g = GAMES[currentGame];
  const isTop30 = leaderboard.filter((e) => e.score > finalScore).length < 30;
  const rank = leaderboard.filter((e) => e.score > finalScore).length + 1;

  if (captureStage === "result") {
    const prizeHtml =
      currentMode === "tournament"
        ? `
      <div class="prize-potential">
        ${
          isTop30
            ? `🏆 You're currently ranked <strong>#${rank}</strong>, that's in the <strong style="color:var(--amber)">prize zone!</strong><br><small style="color:var(--muted)">Save your score to lock in your spot.</small>`
            : `📈 You're ranked <strong>#${rank}</strong> right now. Play again to climb higher!`
        }
      </div>`
        : "";

    const ctaHtml =
      currentMode === "tournament"
        ? `
      <button class="btn-primary" onclick="captureStage='form';renderResultCard()">
        Save Score
      </button>
      <button class="btn-secondary" onclick="restartGame()">Play Again</button>
    `
        : `
      <button class="btn-primary" onclick="captureStage='form';renderResultCard()">
        Share Your Feedback
      </button>
      <button class="btn-secondary" onclick="closeOverlay()">Play Again</button>
    `;

    document.getElementById("result-card").innerHTML = `
      <span class="result-emoji">${currentMode === "tournament" ? "🏆" : "🎮"}</span>
      <div class="result-label">${currentMode === "tournament" ? "Your Score" : "Practice Complete"}</div>
      <div class="result-score">${finalScore.toLocaleString()}</div>
      <p class="result-subtitle">${g.title}</p>
      ${prizeHtml}
      ${ctaHtml}
    `;
  } else if (captureStage === "form") {
    if (currentMode === "tournament") renderTournamentForm();
    else renderFeedbackForm();
  } else if (captureStage === "success") {
    renderSuccessCard();
  }
}

function renderTournamentForm() {
  const profile = getProfile();
  const existing = profile ? getExistingEntry(currentGame) : null;
  const higherExists = existing && existing.score >= finalScore;

  // If we already know the player and their current score is not better, show a message
  if (higherExists) {
    document.getElementById("result-card").innerHTML = `
      <span class="result-emoji">📊</span>
      <div class="capture-title">BEAT YOUR BEST SCORE</div>
      <p class="result-subtitle" style="margin-bottom:24px">
        Your best score for this game is <strong style="color:var(--amber)">${existing.score.toLocaleString()}</strong>. Keep playing to beat it!<br>
    
      </p>
      <button class="btn-primary" onclick="restartGame()">Play Again</button>
      <button class="btn-secondary" onclick="viewLeaderboard()">View Leaderboard</button>
    `;
    return;
  }

  document.getElementById("result-card").innerHTML = `
    <span class="result-emoji">🏆</span>
    <div class="capture-title">${existing ? "NEW BEST SCORE!" : "SAVE YOUR SCORE"}</div>
    ${
      existing
        ? `
      <div class="new-best-display">
        <div class="new-best-label">YOUR NEW BEST</div>
        <div class="new-best-score">${finalScore.toLocaleString()}</div>
        <div class="new-best-prev">Previous best: <span>${existing.score.toLocaleString()}</span></div>
      </div>
    `
        : `<p class="capture-sub">Enter your details to claim your spot on the leaderboard and be eligible to win.</p>`
    }
    ${
      !existing
        ? `
    <div class="form-field">
      <label>Display Name</label>
      <input type="text" id="f-name" placeholder="How you'll appear on the board" maxlength="20" value="${profile?.name || ""}">
    </div>
    <div class="form-field">
      <label>Phone Number</label>
      <input type="tel" id="f-phone" placeholder="+234 000 000 0000" value="${profile?.phone || ""}">
    </div>
    <div class="form-field">
      <label>Email Address</label>
      <input type="email" id="f-email" placeholder="winner@email.com" value="${profile?.email || ""}">
    </div>
    `
        : ""
    }
    <button class="btn-primary" onclick="submitScore()">Save My Score</button>
    <button class="btn-secondary" onclick="captureStage='result';renderResultCard()">Back</button>
  `;
}

function renderFeedbackForm() {
  document.getElementById("result-card").innerHTML = `
    <span class="result-emoji">💬</span>
    <div class="capture-title">QUICK FEEDBACK</div>
    <p class="capture-sub">What do you think about skill gaming? Your opinion helps us build something great.</p>
    <div class="form-field">
      <label>How fun was that?</label>
      <div class="star-rating" id="stars">
        ${[1, 2, 3, 4, 5].map((n) => `<span class="star" onclick="setStar(${n})">★</span>`).join("")}
      </div>
    </div>
    <div class="form-field">
      <label>Would you play for real prizes?</label>
      <select id="f-intent">
        <option value="">Select an option...</option>
        <option>Definitely, I'm ready!</option>
        <option>Yes, if the stakes are right</option>
        <option>Maybe, need to think about it</option>
        <option>Not really interested</option>
      </select>
    </div>
    <div class="form-field">
      <label>Your thoughts (optional)</label>
      <textarea id="f-thoughts" placeholder="What did you enjoy? What could be better?"></textarea>
    </div>
    <div class="form-field">
      <label>Name</label>
      <input type="text" id="f-name" placeholder="How should we call you?">
    </div>
    <div class="form-field">
      <label>Phone / Email</label>
      <input type="text" id="f-contact" placeholder="Stay in the loop.">
    </div>
    <button class="btn-primary" onclick="submitFeedback()">Submit Feedback</button>
    <button class="btn-secondary" onclick="captureStage='result';renderResultCard()">Back</button>
  `;
}

function setStar(n) {
  starRating = n;
  document
    .querySelectorAll(".star")
    .forEach((s, i) => s.classList.toggle("active", i < n));
}

function renderSuccessCard() {
  const isLeaderboard = currentMode === "tournament";
  document.getElementById("result-card").innerHTML = `
    <div class="success-icon">${isLeaderboard ? "🎉" : "🙏"}</div>
    <div class="capture-title">${isLeaderboard ? "YOU'RE ON THE BOARD!" : "THANKS!"}</div>
    <p class="result-subtitle" style="margin-bottom:24px">
      ${
        isLeaderboard
          ? "Your score is live. Keep playing to climb higher! Prizes go to the top 30."
          : "Your feedback means a lot. Stay tuned for our full launch!"
      }
    </p>
    ${isLeaderboard ? '<button class="btn-primary" onclick="viewLeaderboard()">View Leaderboard</button>' : ""}
    <button class="btn-${isLeaderboard ? "secondary" : "primary"}" onclick="restartGame()">Play Again</button>
    ${isLeaderboard ? "" : '<button class="btn-secondary" onclick="closeOverlay();goHome()">Back to Games</button>'}
  `;
}

function setFieldError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle("input-error", !!msg);
  let err = el.parentElement.querySelector(".field-error");
  if (msg) {
    if (!err) {
      err = document.createElement("div");
      err.className = "field-error";
      el.parentElement.appendChild(err);
    }
    err.textContent = msg;
  } else if (err) {
    err.remove();
  }
}

function clearFieldErrors() {
  document.querySelectorAll(".field-error").forEach((e) => e.remove());
  document
    .querySelectorAll(".input-error")
    .forEach((e) => e.classList.remove("input-error"));
}

function submitScore() {
  clearFieldErrors();

  // If returning player, form fields won't exist — pull from saved profile
  let profile = getProfile();
  const isReturning = !!profile && !!getExistingEntry(currentGame);

  const name = isReturning
    ? profile.name
    : document.getElementById("f-name")?.value?.trim();
  const phone = isReturning
    ? profile.phone
    : document.getElementById("f-phone")?.value?.trim();
  const email = isReturning
    ? profile.email
    : document.getElementById("f-email")?.value?.trim();

  if (!isReturning) {
    let valid = true;
    if (!name) {
      setFieldError("f-name", "Display name is required");
      valid = false;
    }
    if (!phone) {
      setFieldError("f-phone", "Phone number is required");
      valid = false;
    }
    if (!valid) return;
  }

  // Save / update profile
  if (!profile) {
    profile = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    };
  }
  profile.name = name;
  profile.phone = phone;
  if (email) profile.email = email;
  saveProfile(profile);

  const avatarNums = [
    9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27,
    28, 29, 30,
  ];
  const userAvatar =
    profile.avatar ||
    `Avatar ${avatarNums[Math.floor(Math.random() * avatarNums.length)]}.png`;
  profile.avatar = userAvatar;
  saveProfile(profile);

  // Remove any existing entry for this player + game, then add the new (better) one
  const idx = leaderboard.findIndex(
    (e) => e.isUser && e.game === currentGame && e._profileId === profile.id,
  );
  if (idx !== -1) leaderboard.splice(idx, 1);

  leaderboard.push({
    name,
    game: currentGame,
    score: finalScore,
    avatar: userAvatar,
    isUser: true,
    _profileId: profile.id,
  });
  leaderboard.sort((a, b) => b.score - a.score);
  persistLeaderboard();

  captureStage = "success";
  renderResultCard();
}

function submitFeedback() {
  clearFieldErrors();
  const intent = document.getElementById("f-intent")?.value?.trim();
  const name = document.getElementById("f-name")?.value?.trim();
  const contact = document.getElementById("f-contact")?.value?.trim();

  let valid = true;
  if (!starRating) {
    const starsEl = document.getElementById("stars");
    if (starsEl) {
      let err = starsEl.parentElement.querySelector(".field-error");
      if (!err) {
        err = document.createElement("div");
        err.className = "field-error";
        starsEl.parentElement.appendChild(err);
      }
      err.textContent = "Please rate how fun the game was";
    }
    valid = false;
  }
  if (!intent) {
    setFieldError("f-intent", "Please select an option");
    valid = false;
  }
  if (!name) {
    setFieldError("f-name", "Name is required");
    valid = false;
  }
  if (!contact) {
    setFieldError("f-contact", "Phone or email is required");
    valid = false;
  }
  if (!valid) return;

  captureStage = "success";
  renderResultCard();
}

function closeOverlay() {
  document.getElementById("result-overlay").classList.remove("show");
  restartGame();
}

function restartGame() {
  document.getElementById("result-overlay").classList.remove("show");
  startGame(currentMode);
}

function viewLeaderboard() {
  document.getElementById("result-overlay").classList.remove("show");
  leaderboardFilter = "all";
  renderLeaderboard();
  showScreen("leaderboard-screen");
}

// ===== LEADERBOARD =====
const LB_PRIZES = [
  "$150",
  "$100",
  "$75",
  "$60",
  "$50",
  "$40",
  "$30",
  "$25",
  "$20",
  "$15",
];
const LB_RANK_ICONS = [
  '<img src="./assets/1st.svg" class="lb-rank-svg" alt="1st">',
  '<img src="./assets/2nd.svg" class="lb-rank-svg" alt="2nd">',
  '<img src="./assets/3rd.svg" class="lb-rank-svg" alt="3rd">',
];
const AVATAR_COUNT = 30;
function getAvatar(entry) {
  if (entry.avatar)
    return `<img src="./assets/avatars/${entry.avatar}" class="lb-avatar-img" alt="${entry.name}">`;
  // deterministic fallback for user entries
  const nums = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    22, 23, 24, 25, 26, 27, 28, 29, 30,
  ];
  const idx = entry.name.charCodeAt(0) % nums.length;
  return `<img src="./assets/avatars/Avatar ${nums[idx]}.png" class="lb-avatar-img" alt="${entry.name}">`;
}

function buildLBRows(filtered, gameNameMap) {
  const rankClass = ["r1", "r2", "r3"];
  return filtered
    .map(
      (e, i) => `
    <div class="lb-entry ${i < 3 ? "top3" : ""} ${e.isUser ? "user-entry" : ""}">
      <div class="lb-rank-big ${rankClass[i] || ""}">${i < 3 ? LB_RANK_ICONS[i] : `#${i + 1}`}</div>
      <div class="lb-player">
        <div class="lb-avatar-wrap">${getAvatar(e)}</div>
        <div class="lb-player-name">${e.name}${e.isUser ? ' <span class="lb-you-tag">YOU</span>' : ""}</div>
      </div>
      <div class="lb-score-big">${e.score.toLocaleString()}</div>
      <div class="lb-game-tag">${gameNameMap[e.game] || e.game}</div>
      <div class="lb-prize-col">${i < LB_PRIZES.length ? `<span class="lb-prize">${LB_PRIZES[i]}</span>` : ""}</div>
    </div>`,
    )
    .join("");
}

function filterLB(game) {
  leaderboardFilter = game;
  document
    .querySelectorAll(".lb-tab")
    .forEach((t) => t.classList.remove("active"));
  event.target.classList.add("active");
  renderLeaderboard();
}

function renderLeaderboard() {
  const filtered = leaderboard
    .filter((e) => leaderboardFilter === "all" || e.game === leaderboardFilter)
    .sort((a, b) => b.score - a.score);
  const cont = document.getElementById("lb-entries");
  if (!cont) return;
  const gameName = {
    sugarrush: "Sugar Rush",
    soloshooter: "Solo Shooter",
    railwayrun: "Railway Run",
  };
  cont.innerHTML = buildLBRows(filtered, gameName);
}

// ===== TOAST =====
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

// Init
let homeLBFilter = "all";
renderLeaderboard();
renderHomeLeaderboard();

function filterHomeLB(game, btn) {
  homeLBFilter = game;
  document
    .querySelectorAll("#home-lb-tabs .lb-tab")
    .forEach((t) => t.classList.remove("active"));
  btn.classList.add("active");
  renderHomeLeaderboard();
}

function renderHomeLeaderboard() {
  const filtered = leaderboard
    .filter((e) => homeLBFilter === "all" || e.game === homeLBFilter)
    .sort((a, b) => b.score - a.score);
  const cont = document.getElementById("home-lb-entries");
  if (!cont) return;
  const gameName = {
    sugarrush: "Sugar Rush",
    soloshooter: "Solo Shooter",
    railwayrun: "Railway Run",
  };
  cont.innerHTML = buildLBRows(filtered, gameName);
}
