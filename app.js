(() => {
  const COLORS = ["#7c3aed", "#ff4fa3", "#22a7f0", "#ff8a3d", "#2ed573", "#f5b700"];
  const LEVELS = [
    [0, "Beginner"], [3, "Explorer"], [8, "Word Wizard"], [15, "Super Speaker"], [25, "English Champion"],
  ];
  const $ = (id) => document.getElementById(id);
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  let videos = [];
  let seen = new Set(store.get("seen"));
  let favs = new Set(store.get("favs"));
  let onlyFavs = false;
  let query = "";
  let currentId = null;

  // ---------- floating emojis ----------
  const floaties = document.querySelector(".floaties");
  const icons = ["⭐", "🎈", "🌈", "📚", "🔤", "🎵", "🦄", "🍎", "✏️", "🎉"];
  for (let i = 0; i < 16; i++) {
    const s = document.createElement("span");
    s.textContent = icons[i % icons.length];
    s.style.left = Math.random() * 100 + "%";
    s.style.fontSize = 22 + Math.random() * 30 + "px";
    s.style.animationDuration = 14 + Math.random() * 18 + "s";
    s.style.animationDelay = -Math.random() * 30 + "s";
    floaties.appendChild(s);
  }

  // ---------- helpers ----------
  const isNew = (v) => Date.now() - new Date(v.published).getTime() < 7 * 864e5;
  const thumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  function renderStats() {
    const n = seen.size;
    let lvl = 0;
    LEVELS.forEach(([min], i) => { if (n >= min) lvl = i; });
    $("levelPill").textContent = `⭐ Level ${lvl + 1} · ${LEVELS[lvl][1]}`;
    $("starPill").textContent = `🌟 ${n} star${n === 1 ? "" : "s"}`;
  }

  function card(v, i) {
    const el = document.createElement("div");
    el.className = "card";
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", `Play ${v.title}`);
    el.style.setProperty("--c", COLORS[i % COLORS.length]);
    el.style.animationDelay = Math.min(i * 40, 600) + "ms";
    el.innerHTML = `
      <div class="thumb"><img loading="lazy" alt=""><div class="play">▶</div>
        ${isNew(v) ? '<span class="badge">NEW! ✨</span>' : ""}
        ${seen.has(v.id) ? '<span class="seen">✔ Seen</span>' : ""}
      </div>
      <div class="info"><h3></h3></div>
      <button class="heart" aria-label="Favorite">${favs.has(v.id) ? "💖" : "🤍"}</button>`;
    el.querySelector("img").src = thumb(v.id);
    el.querySelector("h3").textContent = v.title;
    el.querySelector(".heart").addEventListener("click", (e) => { e.stopPropagation(); toggleFav(v.id); });
    el.addEventListener("click", () => openVideo(v.id));
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openVideo(v.id); } });
    return el;
  }

  function visible() {
    const q = query.trim().toLowerCase();
    return videos.filter((v) => (!onlyFavs || favs.has(v.id)) && (!q || v.title.toLowerCase().includes(q)));
  }

  function render() {
    const list = visible();
    const showFeatured = !onlyFavs && !query && list.length > 0;
    const feat = $("featured");
    feat.hidden = !showFeatured;
    feat.innerHTML = "";
    let rest = list;
    if (showFeatured) {
      feat.innerHTML = '<h2 class="section-title">🔥 Newest video</h2>';
      const c = card(list[0], 0);
      c.classList.add("big");
      feat.appendChild(c);
      rest = list.slice(1);
    }
    $("gridTitle").textContent = onlyFavs ? "💖 My favorites" : query ? "🔍 Found for you" : "🎬 More videos";
    $("gridTitle").hidden = rest.length === 0;
    const grid = $("grid");
    grid.innerHTML = "";
    rest.forEach((v, i) => grid.appendChild(card(v, i + 1)));
    $("empty").hidden = list.length > 0;
    renderStats();
  }

  function toggleFav(id) {
    favs.has(id) ? favs.delete(id) : favs.add(id);
    store.set("favs", [...favs]);
    if (favs.has(id)) burst(innerWidth / 2, innerHeight / 3, 30, ["💖", "💗", "✨"]);
    render();
    syncModal();
  }

  // ---------- video popup ----------
  function openVideo(id) {
    const v = videos.find((x) => x.id === id);
    if (!v) return;
    currentId = id;
    $("modalTitle").textContent = v.title;
    $("player").innerHTML = "";
    const f = document.createElement("iframe");
    f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
    f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    f.allowFullscreen = true;
    f.title = v.title;
    $("player").appendChild(f);
    $("modal").hidden = false;
    document.body.style.overflow = "hidden";
    syncModal();
    if (!seen.has(id)) {
      const before = seen.size;
      seen.add(id);
      store.set("seen", [...seen]);
      burst(innerWidth / 2, innerHeight / 2, 70);
      renderStats();
      if (LEVELS.some(([m]) => m === seen.size && m > 0)) {
        setTimeout(() => burst(innerWidth / 2, innerHeight / 3, 140, ["🏆", "⭐", "🎉", "🌟"]), 400);
      }
      void before;
    }
  }
  function closeVideo() {
    $("modal").hidden = true;
    $("player").innerHTML = "";
    document.body.style.overflow = "";
    currentId = null;
    render();
  }
  function syncModal() { $("modalFav").textContent = favs.has(currentId) ? "💖 Loved!" : "🤍 Love it!"; }
  function next() {
    const list = visible();
    if (!list.length) return;
    const i = list.findIndex((v) => v.id === currentId);
    openVideo(list[(i + 1) % list.length].id);
  }
  $("close").onclick = closeVideo;
  $("modal").addEventListener("click", (e) => { if (e.target === $("modal")) closeVideo(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("modal").hidden) closeVideo(); });
  $("modalFav").onclick = () => currentId && toggleFav(currentId);
  $("modalNext").onclick = next;

  // ---------- controls ----------
  $("search").addEventListener("input", (e) => { query = e.target.value; render(); });
  $("favToggle").onclick = (e) => {
    onlyFavs = !onlyFavs;
    e.currentTarget.setAttribute("aria-pressed", onlyFavs);
    render();
  };
  $("surprise").onclick = () => {
    if (!videos.length) return;
    // prefer videos not watched yet
    const pool = videos.filter((v) => !seen.has(v.id));
    const from = pool.length ? pool : videos;
    openVideo(from[Math.floor(Math.random() * from.length)].id);
  };

  // ---------- confetti ----------
  const cv = $("confetti");
  const ctx = cv.getContext("2d");
  let parts = [];
  let raf = 0;
  function fit() { cv.width = innerWidth; cv.height = innerHeight; }
  addEventListener("resize", fit); fit();
  function burst(x, y, n, emojis) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 9;
      parts.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 6, r: Math.random() * 6.28, vr: Math.random() * .4 - .2,
        life: 90 + Math.random() * 40, size: 8 + Math.random() * 10,
        color: COLORS[i % COLORS.length], e: emojis ? emojis[i % emojis.length] : null,
      });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function tick() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter((p) => p.life-- > 0);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy += .35; p.vx *= .99; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.globalAlpha = Math.min(1, p.life / 30);
      if (p.e) { ctx.font = p.size * 2 + "px serif"; ctx.fillText(p.e, 0, 0); }
      else { ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); }
      ctx.restore();
    }
    raf = parts.length ? requestAnimationFrame(tick) : 0;
    if (!raf) ctx.clearRect(0, 0, cv.width, cv.height);
  }

  // ---------- load data ----------
  fetch("data/videos.json", { cache: "no-cache" })
    .then((r) => r.json())
    .then((d) => {
      videos = d.videos || [];
      if (d.channel && d.channel.url) $("channelLink").href = d.channel.url;
      if (videos[0]) $("updated").textContent = "latest: " + new Date(videos[0].published).toLocaleDateString();
      render();
    })
    .catch(() => { $("empty").hidden = false; });
})();
