// ===== DASHBOARD.JS — Firebase Real =====
import { auth, db, signOut, onAuthStateChanged, doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, serverTimestamp } from './firebase-config.js';

// ===== AUTH GUARD =====
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // لو مش مسجل دخول، ارجعه للوجن
    window.location.href = 'index.html';
    return;
  }

  // جيب بيانات المستخدم من Firestore
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data();
    const displayName = data.username || user.displayName || 'User';

    document.getElementById('dashUser') && (document.getElementById('dashUser').textContent = displayName);
    document.getElementById('menuUsername') && (document.getElementById('menuUsername').textContent = displayName);

    // سالدو
    const balance = data.balance || 0;
    document.getElementById('saldoAmt') && (document.getElementById('saldoAmt').textContent = '$' + balance.toFixed(2));

    // تاريخ الانتهاء
    if (data.expiresAt) {
      const expDate = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
      document.querySelector('.expiry-banner') && (document.querySelector('.expiry-banner').innerHTML = `<i class="fas fa-check-circle"></i> Account Expires on: ${expDate.toLocaleString()}`);
      startCountdown(expDate);
    }
  } else {
    // لو مفيش داتا في Firestore، استخدم localStorage
    const storedName = localStorage.getItem('akro_user') || 'User';
    document.getElementById('dashUser') && (document.getElementById('dashUser').textContent = storedName);
    document.getElementById('menuUsername') && (document.getElementById('menuUsername').textContent = storedName);
    startCountdown(new Date('2099-01-12T03:17:04'));
  }

  // جيب المفاتيح المولودة
  await loadKeys(user.uid);
  calcEstimation();
  renderActivity([]);
});

// ===== COUNTDOWN =====
function startCountdown(targetDate) {
  setInterval(() => {
    const now = new Date();
    const diff = targetDate - now;
    if (diff <= 0) return;
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    document.getElementById('cd-days') && (document.getElementById('cd-days').textContent = String(days).padStart(5, '0'));
    document.getElementById('cd-hours') && (document.getElementById('cd-hours').textContent = String(hours).padStart(2, '0'));
    document.getElementById('cd-min') && (document.getElementById('cd-min').textContent = String(mins).padStart(2, '0'));
    document.getElementById('cd-sec') && (document.getElementById('cd-sec').textContent = String(secs).padStart(2, '0'));
    document.getElementById('timeText') && (document.getElementById('timeText').textContent = `${days} days ${hours} hours`);
  }, 1000);
}

// ===== LOAD KEYS FROM FIRESTORE =====
async function loadKeys(uid) {
  const keysRef = collection(db, 'keys');
  const q = query(keysRef, where('ownerUid', '==', uid));
  const snap = await getDocs(q);

  const keys = [];
  let active = 0, expired = 0;

  snap.forEach(d => {
    const k = d.data();
    keys.push({ id: d.id, ...k });
    const exp = k.expiresAt ? (k.expiresAt.toDate ? k.expiresAt.toDate() : new Date(k.expiresAt)) : null;
    if (exp && exp > new Date()) active++;
    else if (exp) expired++;
  });

  document.getElementById('totalKeys') && (document.getElementById('totalKeys').textContent = keys.length);
  document.querySelectorAll('.stat-num')[1] && (document.querySelectorAll('.stat-num')[1].textContent = active);
  document.querySelectorAll('.stat-num')[2] && (document.querySelectorAll('.stat-num')[2].textContent = expired);

  renderActivity(keys.slice(0, 10));
  return keys;
}

// ===== MENU & SECTIONS =====
function toggleMenu() {
  document.getElementById('slideMenu').classList.toggle('open');
}

function showSection(sec) {
  document.getElementById('slideMenu').classList.remove('open');
  const el = document.getElementById('section-' + sec);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function toggleCustomKey() {
  const on = document.getElementById('customKeyToggle').checked;
  document.getElementById('customKeyGroup').style.display = on ? 'block' : 'none';
  const bulkEl = document.getElementById('gen-bulk');
  if (bulkEl) bulkEl.parentElement.style.display = on ? 'none' : 'block';
}

function calcEstimation() {
  const durEl = document.getElementById('gen-duration');
  const bulkEl = document.getElementById('gen-bulk');
  const devEl = document.getElementById('gen-devices');
  const estEl = document.getElementById('gen-estimation');
  if (!durEl || !estEl) return;

  const price = parseFloat(durEl.value);
  const bulk = parseInt(bulkEl?.value || 1);
  const devices = parseInt(devEl?.value || 1);
  const total = (price / 100 * devices * bulk).toFixed(2);
  estEl.value = '$' + total;
}

// ===== GENERATE KEY — FIRESTORE =====
async function generateKey() {
  const user = auth.currentUser;
  if (!user) { showToast('Not logged in!', 'error'); return; }

  const game = document.getElementById('gen-game').value;
  const devices = parseInt(document.getElementById('gen-devices').value) || 1;
  const durValue = document.getElementById('gen-duration').value;
  const isCustom = document.getElementById('customKeyToggle').checked;
  const bulk = isCustom ? 1 : parseInt(document.getElementById('gen-bulk').value) || 1;
  const maxUsers = parseInt(document.getElementById('gen-maxusers').value) || 1;

  // احسب تاريخ الانتهاء
  const durationMap = {
    '10': 2 * 60 * 60 * 1000,
    '20': 5 * 60 * 60 * 1000,
    '50': 12 * 60 * 60 * 1000,
    '80': 24 * 60 * 60 * 1000,
    '150': 3 * 24 * 60 * 60 * 1000,
    '250': 7 * 24 * 60 * 60 * 1000,
    '350': 14 * 24 * 60 * 60 * 1000,
    '500': 30 * 24 * 60 * 60 * 1000,
    '1000': 60 * 24 * 60 * 60 * 1000,
    '2000': 100 * 24 * 60 * 60 * 1000,
  };

  showLoader(async () => {
    const keys = [];
    const now = new Date();
    const expDate = new Date(now.getTime() + (durationMap[durValue] || 86400000));

    for (let i = 0; i < bulk; i++) {
      let keyVal;
      if (isCustom && document.getElementById('customKeyVal').value) {
        keyVal = document.getElementById('customKeyVal').value;
      } else {
        keyVal = generateRandomKey();
      }

      // احفظ في Firestore
      const keyData = {
        key: keyVal,
        game,
        maxDevices: devices,
        maxUsers,
        ownerUid: user.uid,
        createdAt: serverTimestamp(),
        expiresAt: expDate,
        active: true,
        usedCount: 0,
      };

      const docRef = await addDoc(collection(db, 'keys'), keyData);
      keys.push({ id: docRef.id, ...keyData });
    }

    // أظهر المفاتيح
    const out = document.getElementById('generatedOutput');
    const list = document.getElementById('keysList');
    out.style.display = 'block';
    list.innerHTML = keys.map(k => `
      <div class="key-item">
        <span>${k.key}</span>
        <button class="copy-btn" onclick="copyKey('${k.key}')">Copy</button>
      </div>
    `).join('');
    out.scrollIntoView({ behavior: 'smooth' });

    // تحديث الإحصائيات
    await loadKeys(user.uid);
    showToast('Key(s) generated!', 'success');
  });
}

function generateRandomKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let k = '';
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) k += chars[Math.floor(Math.random() * chars.length)];
    if (i < 3) k += '-';
  }
  return k;
}

function copyKey(key) {
  navigator.clipboard.writeText(key).then(() => showToast('Key copied!', 'success'));
}

function renderActivity(keys) {
  const rows = document.getElementById('activityRows');
  if (!rows) return;
  if (!keys.length) {
    rows.innerHTML = '<div style="text-align:center;padding:20px;color:#666;font-family:\'Rajdhani\',sans-serif">No activity yet</div>';
    return;
  }
  rows.innerHTML = keys.map((k, i) => `
    <div class="activity-row">
      <span class="row-id">#${i + 1}</span>
      <span>${k.game || 'N/A'}</span>
      <span class="row-key">${(k.key || '').slice(0, 6)}**</span>
    </div>
  `).join('');
}

function showLoader(cb) {
  const ol = document.getElementById('loaderOverlay');
  ol.classList.add('active');
  setTimeout(async () => {
    ol.classList.remove('active');
    cb && await cb();
  }, 1800);
}

async function logout() {
  await signOut(auth);
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = 'index.html';
}

function showToast(msg, type = 'info') {
  let t = document.getElementById('akro-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'akro-toast';
    t.style.cssText = 'position:fixed;bottom:70px;left:50%;transform:translateX(-50%);padding:12px 24px;border-radius:10px;font-family:Rajdhani,sans-serif;font-weight:700;font-size:1rem;z-index:9999;transition:opacity .3s;pointer-events:none;';
    document.body.appendChild(t);
  }
  const colors = { info: '#00aacc', success: '#00cc66', error: '#cc2244' };
  t.style.background = colors[type];
  t.style.color = '#fff';
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.style.opacity = '0', 2500);
}

// Export للـ HTML
window.toggleMenu = toggleMenu;
window.showSection = showSection;
window.toggleCustomKey = toggleCustomKey;
window.calcEstimation = calcEstimation;
window.generateKey = generateKey;
window.copyKey = copyKey;
window.logout = logout;
window.showToast = showToast;
