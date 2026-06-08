// ===== AUTH.JS — Firebase Real Auth =====
import { auth, db, googleProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, doc, setDoc, getDoc, serverTimestamp } from './firebase-config.js';

const REFERRAL_CODE = '1907528945216839105';

// ===== LOGIN =====
async function doLogin() {
  const user = document.getElementById('username').value.trim();
  const pass = document.getElementById('password').value.trim();
  const refCode = document.getElementById('refCode')?.value.trim();

  if (!user || !pass) { showToast('Please enter username and password', 'error'); return; }
  if (!refCode) { showToast('Referral code is required', 'error'); return; }
  if (refCode !== REFERRAL_CODE) { showToast('Invalid referral code!', 'error'); return; }

  showToast('Connecting to server...', 'info');
  const email = user.includes('@') ? user : user + '@zigovip.com';

  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const stay = document.getElementById('stayLogged')?.checked;
    const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};
    const displayName = userData.username || cred.user.displayName || user;

    if (stay) {
      localStorage.setItem('zigo_user', displayName);
      localStorage.setItem('zigo_uid', cred.user.uid);
      localStorage.setItem('zigo_logged', '1');
    } else {
      sessionStorage.setItem('zigo_user', displayName);
      sessionStorage.setItem('zigo_uid', cred.user.uid);
      sessionStorage.setItem('zigo_logged', '1');
    }

    showToast('Welcome ' + displayName + '!', 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
  } catch (err) {
    let msg = 'Login failed';
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') msg = 'Username or password incorrect';
    else if (err.code === 'auth/wrong-password') msg = 'Wrong password';
    else if (err.code === 'auth/too-many-requests') msg = 'Too many attempts, try later';
    showToast(msg, 'error');
  }
}

// ===== REGISTER =====
async function doRegister() {
  const username = document.getElementById('reg-user')?.value.trim();
  const email = document.getElementById('reg-email')?.value.trim();
  const pass = document.getElementById('reg-pass')?.value.trim();
  const refCode = document.getElementById('reg-ref')?.value.trim();

  if (!username || !email || !pass) { showToast('Please fill all fields', 'error'); return; }
  if (!refCode) { showToast('Referral code is required', 'error'); return; }
  if (refCode !== REFERRAL_CODE) { showToast('Invalid referral code!', 'error'); return; }

  showToast('Creating account...', 'info');

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await setDoc(doc(db, 'users', cred.user.uid), {
      username,
      email,
      role: 'user',
      balance: 0,
      createdAt: serverTimestamp(),
      expiresAt: new Date('2099-01-12T03:17:04'),
    });

    localStorage.setItem('zigo_user', username);
    localStorage.setItem('zigo_uid', cred.user.uid);
    localStorage.setItem('zigo_logged', '1');

    showToast('Account created! Welcome ' + username, 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
  } catch (err) {
    let msg = 'Registration failed';
    if (err.code === 'auth/email-already-in-use') msg = 'Email already registered';
    else if (err.code === 'auth/weak-password') msg = 'Password too weak (min 6 chars)';
    else if (err.code === 'auth/invalid-email') msg = 'Invalid email address';
    showToast(msg, 'error');
  }
}

// ===== GOOGLE LOGIN/REGISTER =====
async function handleGoogleSignIn() {
  // تحقق من رمز الإحالة
  const refCode = (document.getElementById('refCode') || document.getElementById('reg-ref'))?.value.trim();
  if (!refCode) { showToast('Enter referral code first', 'error'); return; }
  if (refCode !== REFERRAL_CODE) { showToast('Invalid referral code!', 'error'); return; }

  try {
    showToast('Opening Google...', 'info');
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        username: user.displayName || 'User',
        email: user.email,
        role: 'user',
        balance: 0,
        createdAt: serverTimestamp(),
        expiresAt: new Date('2099-01-12T03:17:04'),
      });
    }

    localStorage.setItem('zigo_user', user.displayName || 'User');
    localStorage.setItem('zigo_uid', user.uid);
    localStorage.setItem('zigo_logged', '1');

    showToast('Welcome ' + user.displayName + '!', 'success');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
  } catch (err) {
    showToast('Google sign-in failed: ' + err.message, 'error');
  }
}

// ===== LOGOUT =====
async function logout() {
  await signOut(auth);
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = 'index.html';
}

// ===== TOAST =====
function showToast(msg, type = 'info') {
  let t = document.getElementById('akro-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'akro-toast';
    t.style.cssText = `position:fixed;bottom:70px;left:50%;transform:translateX(-50%);padding:12px 24px;border-radius:10px;font-family:'Rajdhani',sans-serif;font-weight:700;font-size:1rem;z-index:9999;transition:opacity .3s;pointer-events:none;white-space:nowrap;`;
    document.body.appendChild(t);
  }
  const colors = { info: '#00aacc', success: '#00cc66', error: '#cc2244' };
  t.style.background = colors[type] || colors.info;
  t.style.color = '#fff';
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.style.opacity = '0', 2500);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('username')) doLogin();
  if (e.key === 'Enter' && document.getElementById('reg-user')) doRegister();
});

onAuthStateChanged(auth, (user) => {
  const onLoginPage = window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/');
  const onRegPage = window.location.pathname.includes('register.html');
  if (user && (onLoginPage || onRegPage)) {
    window.location.href = 'dashboard.html';
  }
});

window.doLogin = doLogin;
window.doRegister = doRegister;
window.handleGoogleSignIn = handleGoogleSignIn;
window.logout = logout;
window.showToast = showToast;
