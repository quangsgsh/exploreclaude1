const CATEGORIES = [
  { id: 'all', label: 'Tất cả', match: null },
  {
    id: 'football',
    label: 'Bóng đá',
    match: /bóng đá|man utd|real madrid|barca|liverpool|arsenal|chelsea|mu |psg|c1|champions league|ngoại hạng|v-league|v.league|vleague|premier league|euro|world cup|la liga|bundesliga|serie a/i,
  },
  { id: 'tennis', label: 'Tennis', match: /tennis|quần vợt|atp|wta|grand slam|wimbledon|djokovic|nadal|alcaraz|sinner/i },
  { id: 'racing', label: 'Đua xe', match: /f1|formula|đua xe|motogp|verstappen|hamilton/i },
  { id: 'golf', label: 'Golf', match: /golf|pga|lpga|tiger woods|scottie/i },
  { id: 'mma', label: 'MMA/Boxing', match: /boxing|mma|ufc|quyền anh|võ sĩ/i },
  { id: 'other', label: 'Khác', match: null, isOther: true },
];

const tabsEl = document.getElementById('tabs');
const heroEl = document.getElementById('hero');
const gridEl = document.getElementById('grid');
const countEl = document.getElementById('count');
const statusEl = document.getElementById('status');
const refreshBtn = document.getElementById('refresh');
const clockEl = document.getElementById('clock');

let currentCategory = 'all';
let allItems = [];

function renderTabs() {
  tabsEl.innerHTML = CATEGORIES.map(
    (c) =>
      `<button class="tab" role="tab" data-id="${c.id}" aria-selected="${c.id === currentCategory}">${c.label}</button>`,
  ).join('');

  tabsEl.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentCategory = btn.dataset.id;
      tabsEl.querySelectorAll('.tab').forEach((b) =>
        b.setAttribute('aria-selected', b.dataset.id === currentCategory),
      );
      renderFiltered();
    });
  });
}

function filterItems() {
  const cat = CATEGORIES.find((c) => c.id === currentCategory);
  if (!cat || cat.id === 'all') return allItems;
  if (cat.isOther) {
    const matchers = CATEGORIES.filter((c) => c.match).map((c) => c.match);
    return allItems.filter((it) => {
      const text = `${it.title} ${it.description}`;
      return !matchers.some((rx) => rx.test(text));
    });
  }
  return allItems.filter((it) => cat.match.test(`${it.title} ${it.description}`));
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)} giờ trước`;
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function placeholderImg() {
  return "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 10'%3E%3Crect fill='%23eee' width='16' height='10'/%3E%3C/svg%3E";
}

function renderHero(items) {
  if (items.length === 0) {
    heroEl.innerHTML = '';
    return;
  }
  const lead = items[0];
  const sides = items.slice(1, 3);

  const sideHtml = sides
    .map(
      (it) => `
      <a class="hero-item hero-item--side" href="${escapeHtml(it.link)}" target="_blank" rel="noopener">
        <img class="hero-img" src="${escapeHtml(it.image || placeholderImg())}" alt="" loading="lazy" onerror="this.src='${placeholderImg()}'" />
        <div class="hero-caption">
          <span class="hero-kicker">Nổi bật</span>
          <h3 class="hero-title">${escapeHtml(it.title)}</h3>
          <span class="hero-time">${escapeHtml(formatTime(it.pubDate))}</span>
        </div>
      </a>`,
    )
    .join('');

  heroEl.innerHTML = `
    <a class="hero-item hero-item--lead" href="${escapeHtml(lead.link)}" target="_blank" rel="noopener">
      <img class="hero-img" src="${escapeHtml(lead.image || placeholderImg())}" alt="" loading="eager" fetchpriority="high" onerror="this.src='${placeholderImg()}'" />
      <div class="hero-caption">
        <span class="hero-kicker">Tin chính</span>
        <h2 class="hero-title">${escapeHtml(lead.title)}</h2>
        <span class="hero-time">${escapeHtml(formatTime(lead.pubDate))}</span>
      </div>
    </a>
    ${sideHtml}
  `;
}

function renderGrid(items) {
  if (items.length === 0) {
    gridEl.innerHTML = '<p class="status">Không có tin phù hợp trong thể loại này.</p>';
    return;
  }
  gridEl.innerHTML = items
    .map(
      (it, idx) => `
      <a class="card" href="${escapeHtml(it.link)}" target="_blank" rel="noopener">
        <div class="card-image-wrap">
          <img class="card-img" src="${escapeHtml(it.image || placeholderImg())}" alt="" loading="lazy" onerror="this.src='${placeholderImg()}'" />
          <span class="card-num">№ ${String(idx + 4).padStart(2, '0')}</span>
        </div>
        <h3 class="card-title">${escapeHtml(it.title)}</h3>
        <p class="card-desc">${escapeHtml(it.description || '')}</p>
        <span class="card-time">${escapeHtml(formatTime(it.pubDate))}</span>
      </a>`,
    )
    .join('');
}

function renderSkeletons() {
  heroEl.innerHTML = `
    <div class="hero-item hero-item--lead skeleton" style="min-height: 520px"></div>
    <div class="hero-item hero-item--side">
      <div class="skeleton skeleton-img"></div>
    </div>
    <div class="hero-item hero-item--side">
      <div class="skeleton skeleton-img"></div>
    </div>`;
  gridEl.innerHTML = Array.from({ length: 8 })
    .map(
      () => `
      <div class="skeleton-card">
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line short"></div>
      </div>`,
    )
    .join('');
}

function renderFiltered() {
  const items = filterItems();
  countEl.textContent = `${items.length} bài`;
  renderHero(items.slice(0, 3));
  renderGrid(items.slice(3));
}

async function loadNews() {
  refreshBtn.classList.add('loading');
  statusEl.textContent = '';
  statusEl.classList.remove('error');
  renderSkeletons();
  countEl.textContent = '—';

  try {
    const res = await fetch('/api/news');
    const body = await res.json();
    if (!body.success) throw new Error(body.error || 'Lỗi không xác định');

    allItems = body.data.items || [];
    renderFiltered();
  } catch (err) {
    heroEl.innerHTML = '';
    gridEl.innerHTML = '';
    statusEl.textContent = `Không tải được: ${err.message}`;
    statusEl.classList.add('error');
  } finally {
    refreshBtn.classList.remove('loading');
  }
}

function tickClock() {
  const now = new Date();
  clockEl.textContent = now.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'long',
  });
}

refreshBtn.addEventListener('click', loadNews);

renderTabs();
tickClock();
setInterval(tickClock, 30000);
loadNews();
