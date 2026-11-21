(() => {
  const COLORS = ["#8b5cf6", "#ff4fa3", "#22c1f0", "#ff8a3d", "#35e08a", "#f5b700"];
  const LEVELS = [[0, "Beginner"], [3, "Explorer"], [8, "Word Wizard"], [15, "Super Speaker"], [25, "English Champion"]];
  // The stars of the channel. `face` is a video whose thumbnail shows them clearly.
  const FRIENDS = [
    { key: "alfie", name: "Alfie", emoji: "🐶", color: "#ff8a3d", face: "XXanXtQTw98", origin: "50% 40%", re: /alfie/i },
    { key: "fox", name: "Fox", emoji: "🦊", color: "#22c1f0", face: "0XfKeO0Ci-4", origin: "50% 38%", re: /fox/i },
    { key: "cat", name: "Cat", emoji: "🐱", color: "#ff4fa3", face: "7lc2Is4hVSY", origin: "50% 40%", re: /\bcat\b/i },
  ];
  const TOPICS = [
    { key: "songs", label: "🎵 Songs", re: /sing|song/i },
    { key: "letters", label: "🔤 Letters", re: /letter|alphabet/i },
    { key: "weather", label: "🌧️ Weather", re: /rain|snow|cloud|sun|wind|storm/i },
    { key: "hello", label: "👋 Greetings", re: /good morning|how are you|hello|please come/i },
    { key: "numbers", label: "🔢 Numbers", re: /count|number|\b\d+\b/i },
    { key: "days", label: "📅 Days", re: /days of the week|sunday|monday/i },
  ];

  const $ = (id) => document.getElementById(id);
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };

  let videos = [];
  const seen = new Set(store.get("seen"));
  const favs = new Set(store.get("favs"));
  let onlyFavs = false, query = "", friend = "", topic = "", currentId = null;

  // ---------- images (high-res first, safe fallbacks) ----------
  const imgUrls = (id, hero) => (hero
    ? [`maxresdefault`, `sddefault`, `hqdefault`] : [`sddefault`, `hqdefault`]).map((n) => `https://i.ytimg.com/vi/${id}/${n}.jpg`);
  function img(id, hero) {
    const el = document.createElement("img");
    const urls = imgUrls(id, hero);
    let i = 0;
    el.alt = "";
    el.decoding = "async";
    el.onerror = () => { if (++i < urls.length) el.src = urls[i]; };
    el.src = urls[0];
    return el;
  }

  // ---------- helpers ----------
  const who = (v) => (FRIENDS.find((f) => f.re.test(v.title)) || FRIENDS[0]).key; // default: Alfie
  const isNew = (v) => Date.now() - new Date(v.published).getTime() < 7 * 864e5;

  function renderStats() {
    const n = seen.size;
    let lvl = 0;
    LEVELS.forEach(([min], i) => { if (n >= min) lvl = i; });
    const [lo] = LEVELS[lvl], hi = LEVELS[lvl + 1];
    $("levelPill").textContent = `⭐ Level ${lvl + 1} · ${LEVELS[lvl][1]}`;
    $("starPill").textContent = `🌟 ${n}`;
    $("levelBar").style.width = (hi ? ((n - lo) / (hi[0] - lo)) * 100 : 100) + "%";
  }

  // ---------- hero slideshow ----------
  let slideIdx = 0, slideTimer = 0, heroVideos = [];
  function buildHero() {
    heroVideos = videos.slice(0, 5);
    const slides = $("slides"), dots = $("dots");
    slides.innerHTML = ""; dots.innerHTML = "";
    heroVideos.forEach((v, i) => {
      const s = document.createElement("div");
      s.className = "slide";
      s.appendChild(img(v.id, true));
      slides.appendChild(s);
      const d = document.createElement("button");
      d.setAttribute("aria-label", `Show video ${i + 1}`);
      d.onclick = () => { showSlide(i); restartTimer(); };
      dots.appendChild(d);
    });
    showSlide(0);
    restartTimer();
  }
  function showSlide(i) {
    slideIdx = i;
    [...$("slides").children].forEach((s, k) => s.classList.toggle("on", k === i));
    [...$("dots").children].forEach((d, k) => d.classList.toggle("on", k === i));
    if (heroVideos[i]) $("nowTitle").textContent = heroVideos[i].title;
  }
  function restartTimer() {
    clearInterval(slideTimer);
    if (heroVideos.length > 1) slideTimer = setInterval(() => showSlide((slideIdx + 1) % heroVideos.length), 6500);
  }

  // ---------- friends + topics ----------
  function renderFriends() {
    const row = $("friends");
    row.innerHTML = "";
    const all = [{ key: "", name: "Everyone", emoji: "⭐", color: "#8b5cf6", count: videos.length }]
      .concat(FRIENDS.map((f) => ({ ...f, count: videos.filter((v) => who(v) === f.key).length })));
    all.forEach((f) => {
      if (f.key && !f.count) return;
      const b = document.createElement("button");
      b.className = "friend" + (friend === f.key ? " on" : "");
      b.style.setProperty("--c", f.color);
      b.innerHTML = `<div class="avatar"></div><b>${f.name}</b><small>${f.count} video${f.count === 1 ? "" : "s"}</small>`;
      const av = b.querySelector(".avatar");
      if (f.face) {
        const im = img(f.face);
        av.style.setProperty("--o", f.origin);
        av.appendChild(im);
        im.onerror = () => { av.textContent = f.emoji; };
      } else av.textContent = f.emoji;
      b.onclick = () => { friend = friend === f.key ? "" : f.key; render(); };
      row.appendChild(b);
    });
  }
  function renderChips() {
    const box = $("chips");
    box.innerHTML = "";
    TOPICS.filter((t) => videos.some((v) => t.re.test(v.title))).forEach((t) => {
      const c = document.createElement("button");
      c.className = "chip" + (topic === t.key ? " on" : "");
      c.textContent = t.label;
      c.onclick = () => { topic = topic === t.key ? "" : t.key; render(); };
      box.appendChild(c);
    });
  }

  // ---------- cards ----------
  function card(v, i, wide) {
    const el = document.createElement("div");
    el.className = "card" + (wide ? " wide" : "");
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", `Play ${v.title}`);
    el.style.setProperty("--c", COLORS[i % COLORS.length]);
    el.style.animationDelay = Math.min(i * 40, 500) + "ms";
    el.appendChild(img(v.id, wide));
    el.insertAdjacentHTML("beforeend", `
      <div class="play">▶</div>
      ${isNew(v) ? '<span class="badge">NEW! ✨</span>' : ""}
      ${seen.has(v.id) ? '<span class="seen">✔ Seen</span>' : ""}
      <div class="title"></div>
      <button class="heart" aria-label="Favorite">${favs.has(v.id) ? "💖" : "🤍"}</button>`);
    el.querySelector(".title").textContent = v.title;
    el.querySelector(".heart").onclick = (e) => { e.stopPropagation(); toggleFav(v.id); };
    el.onclick = () => openVideo(v.id);
    el.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openVideo(v.id); } };
    return el;
  }

  function visible() {
    const q = query.trim().toLowerCase();
    const t = TOPICS.find((x) => x.key === topic);
    return videos.filter((v) =>
      (!onlyFavs || favs.has(v.id)) && (!friend || who(v) === friend) && (!t || t.re.test(v.title)) &&
      (!q || v.title.toLowerCase().includes(q)));
  }

  function render() {
    const list = visible();
    const grid = $("grid");
    grid.innerHTML = "";
    list.forEach((v, i) => grid.appendChild(card(v, i, i % 7 === 0 && list.length > 3)));
    const f = FRIENDS.find((x) => x.key === friend);
    $("gridTitle").textContent = onlyFavs ? "💖 My favorites" : f ? `${f.emoji} ${f.name}'s videos` : "🎬 All videos";
    $("empty").hidden = list.length > 0;
    renderFriends(); renderChips(); renderStats();
  }

  function toggleFav(id) {
    favs.has(id) ? favs.delete(id) : favs.add(id);
    store.set("favs", [...favs]);
    if (favs.has(id)) burst(innerWidth / 2, innerHeight / 3, 30, ["💖", "💗", "✨"]);
    render(); syncModal();
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
      seen.add(id);
      store.set("seen", [...seen]);
      burst(innerWidth / 2, innerHeight / 2, 70);
      renderStats();
      if (LEVELS.some(([m]) => m > 0 && m === seen.size)) {
        setTimeout(() => burst(innerWidth / 2, innerHeight / 3, 140, ["🏆", "⭐", "🎉", "🌟"]), 400);
      }
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
    const pool = videos.filter((v) => !seen.has(v.id));
    const from = pool.length ? pool : videos;
    openVideo(from[Math.floor(Math.random() * from.length)].id);
  };
  $("watchNow").onclick = () => heroVideos[slideIdx] && openVideo(heroVideos[slideIdx].id);

  // ---------- confetti ----------
  const cv = $("confetti"), ctx = cv.getContext("2d");
  let parts = [], raf = 0;
  const fit = () => { cv.width = innerWidth; cv.height = innerHeight; };
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
      buildHero();
      render();
    })
    .catch(() => { $("empty").hidden = false; });
})();
