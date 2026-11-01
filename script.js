/* ============================================================
   script.js — TestCase Forge
   All application logic: generation, CRUD, filtering,
   export, clipboard, history (localStorage),
   i18n (EN/ID), dark mode, status column, drag-to-reorder.
   ============================================================ */

'use strict';

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────

/** @type {TestCase[]} Active test cases currently displayed */
let testCases = [];

/** @type {string} Active filter tab value */
let activeFilter = 'All';

/** @type {number|null} ID of the test case being edited (null = new) */
let editingId = null;

/** @type {number} Counter for the next test case ID suffix */
let tcCounter = 1;

/** @type {{ id: string, label: string, cases: TestCase[] }[]} */
let history = JSON.parse(localStorage.getItem('tcf_history') || '[]');

/** @type {'en'|'id'} Active UI language */
let currentLang = localStorage.getItem('tcf_lang') || 'en';

/** @type {boolean} Whether dark mode is active */
let darkMode = localStorage.getItem('tcf_dark') === 'true';

// ─────────────────────────────────────────────
//  TYPES (JSDoc for clarity)
// ─────────────────────────────────────────────

/**
 * @typedef {Object} TestCase
 * @property {string} id            - e.g. "TC-001"
 * @property {string} title
 * @property {string} preconditions
 * @property {string} steps
 * @property {string} expectedResult
 * @property {'Positive'|'Negative'|'Edge Case'} type
 * @property {'High'|'Medium'|'Low'} priority
 * @property {'Pending'|'Pass'|'Fail'} status
 */

// ─────────────────────────────────────────────
//  I18N — Translation dictionary
// ─────────────────────────────────────────────

/** @type {Record<string, Record<string, string>>} */
const TRANSLATIONS = {
  en: {
    // Nav
    'nav.history': 'History',
    // Form
    'form.heading': 'Generate Test Cases',
    'form.featureName': 'Feature Name',
    'form.featureNamePlaceholder': 'e.g. User Login, File Upload, Payment Checkout',
    'form.featureNameError': 'Feature name is required.',
    'form.featureDesc': 'Feature Description / User Story',
    'form.featureDescPlaceholder': 'e.g. As a user, I want to log in with my email and password so that I can access my account.',
    'form.featureDescError': 'Feature description is required.',
    'form.testTypes': 'Test Types',
    'form.testTypeError': 'Select at least one test type.',
    'form.btnGenerate': 'Generate Test Cases',
    'form.btnAddManual': 'Add Manually',
    // Results
    'results.heading': 'Results',
    'results.btnCopy': 'Copy',
    'results.btnExport': 'Export CSV',
    'results.empty': 'No test cases match this filter.',
    // Filter
    'filter.all': 'All',
    // Types
    'type.positive': 'Positive',
    'type.negative': 'Negative',
    'type.edgeCase': 'Edge Case',
    // Priority
    'priority.high': 'High',
    'priority.medium': 'Medium',
    'priority.low': 'Low',
    // Status
    'status.pending': 'Pending',
    'status.pass': 'Pass',
    'status.fail': 'Fail',
    'status.label': 'Status',
    // Card
    'card.preconditions': 'Preconditions',
    'card.steps': 'Steps',
    'card.expected': 'Expected Result',
    'card.edit': 'Edit',
    'card.delete': 'Delete',
    'card.dragHint': 'Drag to reorder',
    // Modal
    'modal.addTitle': 'Add Test Case',
    'modal.editTitle': 'Edit Test Case',
    'modal.labelTitle': 'Title',
    'modal.titleError': 'Title is required.',
    'modal.labelPreconditions': 'Preconditions',
    'modal.labelSteps': 'Steps',
    'modal.stepsError': 'Steps are required.',
    'modal.labelExpected': 'Expected Result',
    'modal.expectedError': 'Expected result is required.',
    'modal.labelType': 'Type',
    'modal.labelPriority': 'Priority',
    'modal.btnSave': 'Save',
    'modal.btnCancel': 'Cancel',
    // History
    'history.heading': 'Generation History',
    'history.empty': 'No history yet.',
    'history.testCase': 'test case',
    'history.testCases': 'test cases',
    // Toast
    'toast.generated': (n) => `${n} test case${n !== 1 ? 's' : ''} generated!`,
    'toast.added': 'Test case added.',
    'toast.updated': 'Test case updated.',
    'toast.deleted': 'Test case deleted.',
    'toast.copied': 'Copied to clipboard!',
    'toast.copyFail': 'Copy failed — please try manually.',
    'toast.exported': 'CSV exported successfully.',
    'toast.noExport': 'No test cases to export.',
    'toast.noCopy': 'No test cases to copy.',
    'toast.noMatch': 'No templates matched — try different keywords.',
    'toast.historyDeleted': 'History entry deleted.',
    'toast.loaded': (label) => `Loaded: ${label}`,
    // Total count
    'totalCount': (n) => `${n} total`,
  },
  id: {
    // Nav
    'nav.history': 'Riwayat',
    // Form
    'form.heading': 'Buat Test Case',
    'form.featureName': 'Nama Fitur',
    'form.featureNamePlaceholder': 'mis. Login Pengguna, Unggah File, Pembayaran',
    'form.featureNameError': 'Nama fitur wajib diisi.',
    'form.featureDesc': 'Deskripsi Fitur / User Story',
    'form.featureDescPlaceholder': 'mis. Sebagai pengguna, saya ingin masuk dengan email dan kata sandi untuk mengakses akun saya.',
    'form.featureDescError': 'Deskripsi fitur wajib diisi.',
    'form.testTypes': 'Tipe Pengujian',
    'form.testTypeError': 'Pilih minimal satu tipe pengujian.',
    'form.btnGenerate': 'Buat Test Case',
    'form.btnAddManual': 'Tambah Manual',
    // Results
    'results.heading': 'Hasil',
    'results.btnCopy': 'Salin',
    'results.btnExport': 'Ekspor CSV',
    'results.empty': 'Tidak ada test case yang cocok dengan filter ini.',
    // Filter
    'filter.all': 'Semua',
    // Types
    'type.positive': 'Positif',
    'type.negative': 'Negatif',
    'type.edgeCase': 'Kasus Batas',
    // Priority
    'priority.high': 'Tinggi',
    'priority.medium': 'Sedang',
    'priority.low': 'Rendah',
    // Status
    'status.pending': 'Menunggu',
    'status.pass': 'Lulus',
    'status.fail': 'Gagal',
    'status.label': 'Status',
    // Card
    'card.preconditions': 'Prasyarat',
    'card.steps': 'Langkah-langkah',
    'card.expected': 'Hasil yang Diharapkan',
    'card.edit': 'Ubah',
    'card.delete': 'Hapus',
    'card.dragHint': 'Seret untuk mengurutkan',
    // Modal
    'modal.addTitle': 'Tambah Test Case',
    'modal.editTitle': 'Ubah Test Case',
    'modal.labelTitle': 'Judul',
    'modal.titleError': 'Judul wajib diisi.',
    'modal.labelPreconditions': 'Prasyarat',
    'modal.labelSteps': 'Langkah-langkah',
    'modal.stepsError': 'Langkah-langkah wajib diisi.',
    'modal.labelExpected': 'Hasil yang Diharapkan',
    'modal.expectedError': 'Hasil yang diharapkan wajib diisi.',
    'modal.labelType': 'Tipe',
    'modal.labelPriority': 'Prioritas',
    'modal.btnSave': 'Simpan',
    'modal.btnCancel': 'Batal',
    // History
    'history.heading': 'Riwayat Pembuatan',
    'history.empty': 'Belum ada riwayat.',
    'history.testCase': 'test case',
    'history.testCases': 'test case',
    // Toast
    'toast.generated': (n) => `${n} test case berhasil dibuat!`,
    'toast.added': 'Test case ditambahkan.',
    'toast.updated': 'Test case diperbarui.',
    'toast.deleted': 'Test case dihapus.',
    'toast.copied': 'Disalin ke clipboard!',
    'toast.copyFail': 'Salin gagal — coba secara manual.',
    'toast.exported': 'CSV berhasil diekspor.',
    'toast.noExport': 'Tidak ada test case untuk diekspor.',
    'toast.noCopy': 'Tidak ada test case untuk disalin.',
    'toast.noMatch': 'Tidak ada template yang cocok — coba kata kunci lain.',
    'toast.historyDeleted': 'Entri riwayat dihapus.',
    'toast.loaded': (label) => `Dimuat: ${label}`,
    // Total count
    'totalCount': (n) => `${n} total`,
  },
};

/**
 * Gets a translation string for the current language.
 * Supports function values for dynamic strings.
 * @param {string} key
 * @param {*} [arg]
 * @returns {string}
 */
function t(key, arg) {
  const val = TRANSLATIONS[currentLang]?.[key] ?? TRANSLATIONS['en']?.[key] ?? key;
  return typeof val === 'function' ? val(arg) : val;
}

/**
 * Applies translations to all [data-i18n] elements in the document,
 * and updates [data-i18n-placeholder] attributes.
 */
function applyTranslations() {
  // Text content
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = t(key);
    if (el.tagName === 'OPTION') {
      el.textContent = translation;
    } else {
      el.textContent = translation;
    }
  });
  // Placeholder attributes
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
  // Update document language
  document.documentElement.lang = currentLang;
}

// ─────────────────────────────────────────────
//  DARK MODE
// ─────────────────────────────────────────────

/** Applies or removes dark mode on <html> and updates button icons. */
function applyDarkMode() {
  if (darkMode) {
    document.documentElement.classList.add('dark');
    document.getElementById('iconSun').classList.remove('hidden');
    document.getElementById('iconMoon').classList.add('hidden');
  } else {
    document.documentElement.classList.remove('dark');
    document.getElementById('iconSun').classList.add('hidden');
    document.getElementById('iconMoon').classList.remove('hidden');
  }
  localStorage.setItem('tcf_dark', String(darkMode));
}

// ─────────────────────────────────────────────
//  UTILITY — XSS-safe escape
// ─────────────────────────────────────────────

/**
 * Escapes a string for safe insertion into HTML.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str).replace(/[&<>"']/g, ch => map[ch]);
}

// ─────────────────────────────────────────────
//  UTILITY — Toast notification
// ─────────────────────────────────────────────

let toastTimeout = null;

/**
 * Shows a brief toast message at the bottom-right.
 * @param {string} message
 */
function showToast(message) {
  const toast = document.getElementById('toast');
  document.getElementById('toastMessage').textContent = message;
  toast.classList.remove('hidden');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add('hidden'), 2500);
}

// ─────────────────────────────────────────────
//  UTILITY — ID generator
// ─────────────────────────────────────────────

/**
 * Generates the next sequential TC ID string.
 * @returns {string}
 */
function nextTcId() {
  const id = `TC-${String(tcCounter).padStart(3, '0')}`;
  tcCounter++;
  return id;
}

/**
 * Re-synchronises tcCounter to be 1 higher than the max numeric suffix
 * present in testCases (prevents ID collisions after loads from history).
 */
function syncTcCounter() {
  if (testCases.length === 0) { tcCounter = 1; return; }
  const max = testCases.reduce((acc, tc) => {
    const num = parseInt(tc.id.replace('TC-', ''), 10);
    return isNaN(num) ? acc : Math.max(acc, num);
  }, 0);
  tcCounter = max + 1;
}

// ─────────────────────────────────────────────
//  KEYWORD DETECTION — maps keywords to feature domains
// ─────────────────────────────────────────────

/** @type {{ keywords: string[], domain: string }[]} */
const DOMAIN_MAP = [
  { keywords: ['login', 'log in', 'sign in', 'signin', 'authenticate', 'authentication', 'credential', 'masuk', 'autentikasi'], domain: 'login' },
  { keywords: ['register', 'signup', 'sign up', 'create account', 'registration', 'daftar', 'registrasi', 'buat akun'],            domain: 'registration' },
  { keywords: ['upload', 'file upload', 'attach', 'attachment', 'import file', 'unggah', 'lampiran'],                               domain: 'upload' },
  { keywords: ['payment', 'pay', 'checkout', 'billing', 'credit card', 'transaction', 'purchase', 'bayar', 'pembayaran', 'tagihan'], domain: 'payment' },
  { keywords: ['search', 'filter', 'find', 'query', 'lookup', 'cari', 'pencarian', 'filter'],                                        domain: 'search' },
  { keywords: ['form', 'submit', 'input', 'field', 'validation', 'validate', 'formulir', 'validasi'],                                domain: 'form' },
  { keywords: ['profile', 'account settings', 'user settings', 'edit profile', 'update profile', 'profil', 'pengaturan akun'],        domain: 'profile' },
  { keywords: ['password', 'reset password', 'forgot password', 'change password', 'kata sandi', 'lupa kata sandi'],                  domain: 'password' },
  { keywords: ['delete', 'remove', 'trash', 'cancel', 'hapus', 'batalkan'],                                                           domain: 'delete' },
  { keywords: ['dashboard', 'home', 'landing', 'overview', 'beranda', 'ringkasan'],                                                   domain: 'dashboard' },
];

/**
 * Detects the best-matching domain from a combined text string.
 * Falls back to 'generic'.
 * @param {string} text
 * @returns {string}
 */
function detectDomain(text) {
  const lower = text.toLowerCase();
  for (const { keywords, domain } of DOMAIN_MAP) {
    if (keywords.some(kw => lower.includes(kw))) return domain;
  }
  return 'generic';
}

// ─────────────────────────────────────────────
//  TEMPLATE LIBRARY — test case blueprints per domain & type
// ─────────────────────────────────────────────

/**
 * Returns an array of test case template objects for the given domain and type.
 * Each template is a partial TestCase (no id assigned yet).
 *
 * @param {string} domain
 * @param {'Positive'|'Negative'|'Edge Case'} type
 * @param {string} featureName
 * @returns {Omit<TestCase,'id'>[]}
 */
function getTemplates(domain, type, featureName) {
  const f = escapeHtml(featureName);

  const TEMPLATES = {
    // ── LOGIN ──────────────────────────────────────────
    login: {
      Positive: [
        {
          title: `${f} — Successful login with valid credentials`,
          preconditions: 'User account exists and is active.',
          steps: '1. Navigate to the login page.\n2. Enter a valid registered email address.\n3. Enter the correct password.\n4. Click "Login".',
          expectedResult: 'User is authenticated and redirected to the dashboard.',
          type: 'Positive', priority: 'High',
        },
        {
          title: `${f} — Login persists across page refresh`,
          preconditions: 'User is successfully logged in.',
          steps: '1. Log in with valid credentials.\n2. Refresh the browser page.',
          expectedResult: 'User session is maintained; user remains logged in.',
          type: 'Positive', priority: 'Medium',
        },
      ],
      Negative: [
        {
          title: `${f} — Login fails with incorrect password`,
          preconditions: 'User account exists.',
          steps: '1. Navigate to the login page.\n2. Enter a valid email.\n3. Enter an incorrect password.\n4. Click "Login".',
          expectedResult: 'An error message is displayed; user is not authenticated.',
          type: 'Negative', priority: 'High',
        },
        {
          title: `${f} — Login fails with unregistered email`,
          preconditions: 'None.',
          steps: '1. Navigate to the login page.\n2. Enter an email not registered in the system.\n3. Enter any password.\n4. Click "Login".',
          expectedResult: 'An appropriate error message is shown; access is denied.',
          type: 'Negative', priority: 'High',
        },
        {
          title: `${f} — Login blocked after multiple failed attempts`,
          preconditions: 'User account exists.',
          steps: '1. Enter incorrect password 5 consecutive times.\n2. Attempt to log in again.',
          expectedResult: 'Account is temporarily locked; lock-out message is displayed.',
          type: 'Negative', priority: 'High',
        },
      ],
      'Edge Case': [
        {
          title: `${f} — Login with email containing leading/trailing spaces`,
          preconditions: 'User account exists.',
          steps: '1. Enter valid email surrounded by spaces (e.g. " user@example.com ").\n2. Enter correct password.\n3. Click "Login".',
          expectedResult: 'System trims whitespace and logs user in successfully.',
          type: 'Edge Case', priority: 'Medium',
        },
        {
          title: `${f} — Login with password at maximum character limit`,
          preconditions: 'Account exists with a 128-character password.',
          steps: '1. Enter email.\n2. Enter 128-character password.\n3. Click "Login".',
          expectedResult: 'User is authenticated without truncation errors.',
          type: 'Edge Case', priority: 'Low',
        },
      ],
    },

    // ── REGISTRATION ───────────────────────────────────
    registration: {
      Positive: [
        {
          title: `${f} — Successful registration with all required fields`,
          preconditions: 'Email address has not been registered before.',
          steps: '1. Navigate to the registration page.\n2. Fill in all required fields with valid data.\n3. Click "Register".',
          expectedResult: 'Account is created; confirmation email is sent; user is redirected.',
          type: 'Positive', priority: 'High',
        },
      ],
      Negative: [
        {
          title: `${f} — Registration fails with duplicate email`,
          preconditions: 'Email is already registered in the system.',
          steps: '1. Navigate to the registration page.\n2. Enter an already-registered email.\n3. Complete other fields.\n4. Click "Register".',
          expectedResult: '"Email already in use" error is displayed.',
          type: 'Negative', priority: 'High',
        },
        {
          title: `${f} — Registration fails with invalid email format`,
          preconditions: 'None.',
          steps: '1. Enter a malformed email (e.g. "user@").\n2. Complete remaining fields.\n3. Click "Register".',
          expectedResult: 'Inline validation error is shown for the email field.',
          type: 'Negative', priority: 'Medium',
        },
      ],
      'Edge Case': [
        {
          title: `${f} — Registration with minimum-length password`,
          preconditions: 'None.',
          steps: '1. Enter a password of exactly the minimum required length.\n2. Fill remaining fields.\n3. Submit.',
          expectedResult: 'Registration succeeds with no password-strength errors.',
          type: 'Edge Case', priority: 'Low',
        },
      ],
    },

    // ── UPLOAD ─────────────────────────────────────────
    upload: {
      Positive: [
        {
          title: `${f} — Successful upload of an accepted file type`,
          preconditions: 'User is logged in; file size is within allowed limits.',
          steps: '1. Navigate to the upload section.\n2. Click "Choose File".\n3. Select a supported file format.\n4. Click "Upload".',
          expectedResult: 'File is uploaded; success confirmation message appears.',
          type: 'Positive', priority: 'High',
        },
      ],
      Negative: [
        {
          title: `${f} — Upload rejected for unsupported file type`,
          preconditions: 'User is on the upload page.',
          steps: '1. Attempt to upload a file with a prohibited extension (e.g. .exe).\n2. Click "Upload".',
          expectedResult: 'Upload is blocked; error message specifies allowed file types.',
          type: 'Negative', priority: 'High',
        },
        {
          title: `${f} — Upload fails when file exceeds size limit`,
          preconditions: 'File exceeds the maximum allowed size.',
          steps: '1. Select a file larger than the size limit.\n2. Click "Upload".',
          expectedResult: 'Error message indicating the file size limit is displayed.',
          type: 'Negative', priority: 'Medium',
        },
      ],
      'Edge Case': [
        {
          title: `${f} — Upload a file with an extremely long filename`,
          preconditions: 'User is on the upload page.',
          steps: '1. Attempt to upload a file whose name is 255 characters long.',
          expectedResult: 'File is either accepted (with name handling) or a clear error is shown.',
          type: 'Edge Case', priority: 'Low',
        },
        {
          title: `${f} — Upload a zero-byte (empty) file`,
          preconditions: 'User is on the upload page.',
          steps: '1. Select an empty file (0 bytes).\n2. Click "Upload".',
          expectedResult: 'System rejects the upload with a descriptive error.',
          type: 'Edge Case', priority: 'Medium',
        },
      ],
    },

    // ── PAYMENT ────────────────────────────────────────
    payment: {
      Positive: [
        {
          title: `${f} — Successful payment with valid card details`,
          preconditions: 'User has items in cart; payment gateway is accessible.',
          steps: '1. Proceed to checkout.\n2. Enter valid card number, expiry, and CVV.\n3. Click "Pay Now".',
          expectedResult: 'Payment is processed; order confirmation is displayed and emailed.',
          type: 'Positive', priority: 'High',
        },
      ],
      Negative: [
        {
          title: `${f} — Payment declined with invalid card number`,
          preconditions: 'User is on the checkout page.',
          steps: '1. Enter an invalid card number.\n2. Complete other fields.\n3. Click "Pay Now".',
          expectedResult: '"Payment declined" error is shown; no charge is made.',
          type: 'Negative', priority: 'High',
        },
        {
          title: `${f} — Payment rejected with expired card`,
          preconditions: 'User is on the checkout page.',
          steps: '1. Enter a card with an expiry date in the past.\n2. Click "Pay Now".',
          expectedResult: 'Error message stating the card has expired is displayed.',
          type: 'Negative', priority: 'High',
        },
      ],
      'Edge Case': [
        {
          title: `${f} — Payment attempt with network timeout`,
          preconditions: 'User is on the checkout page; network is unstable.',
          steps: '1. Enter valid card details.\n2. Click "Pay Now".\n3. Simulate a network timeout.',
          expectedResult: 'System shows a timeout error; no duplicate charge is made.',
          type: 'Edge Case', priority: 'High',
        },
        {
          title: `${f} — Payment with zero-value order`,
          preconditions: 'Cart total is $0.00 (e.g. fully covered by coupon).',
          steps: '1. Apply coupon reducing total to $0.\n2. Proceed to checkout.\n3. Confirm order.',
          expectedResult: 'Order is placed without payment processing; confirmation is shown.',
          type: 'Edge Case', priority: 'Medium',
        },
      ],
    },

    // ── SEARCH ─────────────────────────────────────────
    search: {
      Positive: [
        {
          title: `${f} — Search returns relevant results for valid keyword`,
          preconditions: 'At least one matching record exists in the system.',
          steps: '1. Navigate to the search bar.\n2. Type a valid keyword.\n3. Press Enter or click Search.',
          expectedResult: 'Results matching the keyword are displayed in a list.',
          type: 'Positive', priority: 'High',
        },
        {
          title: `${f} — Search is case-insensitive`,
          preconditions: 'Matching records exist.',
          steps: '1. Search for "EXAMPLE".\n2. Search for "example".\n3. Compare results.',
          expectedResult: 'Both searches return identical results.',
          type: 'Positive', priority: 'Medium',
        },
      ],
      Negative: [
        {
          title: `${f} — Search with non-existent keyword shows empty state`,
          preconditions: 'No records match the query.',
          steps: '1. Enter a keyword with no matching records.\n2. Submit the search.',
          expectedResult: '"No results found" message is displayed.',
          type: 'Negative', priority: 'Medium',
        },
      ],
      'Edge Case': [
        {
          title: `${f} — Search with special characters does not cause errors`,
          preconditions: 'None.',
          steps: '1. Enter special characters (e.g. <, >, &, ") in the search bar.\n2. Submit.',
          expectedResult: 'Input is sanitized; no errors or injections occur.',
          type: 'Edge Case', priority: 'High',
        },
        {
          title: `${f} — Search with whitespace-only input`,
          preconditions: 'None.',
          steps: '1. Enter only spaces in the search field.\n2. Submit the search.',
          expectedResult: 'System ignores blank input or shows a validation message.',
          type: 'Edge Case', priority: 'Low',
        },
      ],
    },

    // ── FORM ───────────────────────────────────────────
    form: {
      Positive: [
        {
          title: `${f} — Form submits successfully with all required fields`,
          preconditions: 'User is on the form page.',
          steps: '1. Fill in all required fields with valid data.\n2. Click "Submit".',
          expectedResult: 'Form is submitted; success message or redirect occurs.',
          type: 'Positive', priority: 'High',
        },
      ],
      Negative: [
        {
          title: `${f} — Form submission blocked when required field is empty`,
          preconditions: 'User is on the form page.',
          steps: '1. Leave at least one required field empty.\n2. Click "Submit".',
          expectedResult: 'Validation error highlights the missing field; form is not submitted.',
          type: 'Negative', priority: 'High',
        },
        {
          title: `${f} — Form rejected with invalid data format`,
          preconditions: 'User is on the form page.',
          steps: '1. Enter data in an incorrect format (e.g. text in a numeric field).\n2. Click "Submit".',
          expectedResult: 'Inline validation error is displayed for the affected field.',
          type: 'Negative', priority: 'Medium',
        },
      ],
      'Edge Case': [
        {
          title: `${f} — Form field accepts maximum character limit`,
          preconditions: 'None.',
          steps: '1. Enter text equal to the maximum allowed character count in a field.\n2. Submit.',
          expectedResult: 'Form accepts the input and submits successfully.',
          type: 'Edge Case', priority: 'Low',
        },
        {
          title: `${f} — Form submitted with HTML/script in text field`,
          preconditions: 'None.',
          steps: '1. Enter "<script>alert(1)</script>" in a text field.\n2. Submit.',
          expectedResult: 'Input is sanitized; no script executes; data is stored as plain text.',
          type: 'Edge Case', priority: 'High',
        },
      ],
    },

    // ── PROFILE ────────────────────────────────────────
    profile: {
      Positive: [
        {
          title: `${f} — User can update profile information successfully`,
          preconditions: 'User is logged in and on the profile settings page.',
          steps: '1. Edit one or more profile fields with valid data.\n2. Click "Save Changes".',
          expectedResult: 'Changes are persisted; success notification is shown.',
          type: 'Positive', priority: 'Medium',
        },
      ],
      Negative: [
        {
          title: `${f} — Profile update fails with invalid phone number`,
          preconditions: 'User is on the profile settings page.',
          steps: '1. Enter letters in the phone number field.\n2. Click "Save".',
          expectedResult: 'Validation error is shown; profile is not updated.',
          type: 'Negative', priority: 'Medium',
        },
      ],
      'Edge Case': [
        {
          title: `${f} — Profile display name with Unicode characters`,
          preconditions: 'User is on the profile page.',
          steps: '1. Enter a display name using Unicode (e.g. Chinese or Arabic characters).\n2. Save.',
          expectedResult: 'Name is stored and rendered correctly across the application.',
          type: 'Edge Case', priority: 'Low',
        },
      ],
    },

    // ── PASSWORD ───────────────────────────────────────
    password: {
      Positive: [
        {
          title: `${f} — Password reset email sent for registered account`,
          preconditions: 'User has a registered and verified email.',
          steps: '1. Click "Forgot Password".\n2. Enter the registered email.\n3. Click "Send Reset Link".',
          expectedResult: 'Password reset email is sent; success message is displayed.',
          type: 'Positive', priority: 'High',
        },
      ],
      Negative: [
        {
          title: `${f} — Password reset fails for unregistered email`,
          preconditions: 'None.',
          steps: '1. Enter an email not registered in the system.\n2. Click "Send Reset Link".',
          expectedResult: 'Error or neutral message shown (no information leakage).',
          type: 'Negative', priority: 'High',
        },
        {
          title: `${f} — New password rejected if too short`,
          preconditions: 'User clicked a valid reset link.',
          steps: '1. Enter a new password shorter than the minimum requirement.\n2. Submit.',
          expectedResult: 'Validation error specifying the minimum length is displayed.',
          type: 'Negative', priority: 'Medium',
        },
      ],
      'Edge Case': [
        {
          title: `${f} — Password reset link expires after time limit`,
          preconditions: 'Reset link was generated more than 1 hour ago.',
          steps: '1. Click the expired reset link.',
          expectedResult: '"Link expired" message is shown; user is prompted to request a new one.',
          type: 'Edge Case', priority: 'Medium',
        },
      ],
    },

    // ── DELETE ─────────────────────────────────────────
    delete: {
      Positive: [
        {
          title: `${f} — Item deleted successfully after confirmation`,
          preconditions: 'The item to be deleted exists and user has permission.',
          steps: '1. Click the "Delete" button on the target item.\n2. Confirm deletion in the dialog.',
          expectedResult: 'Item is removed from the list; success notification appears.',
          type: 'Positive', priority: 'High',
        },
      ],
      Negative: [
        {
          title: `${f} — Deletion cancelled when user dismisses confirmation`,
          preconditions: 'The item exists.',
          steps: '1. Click "Delete".\n2. Click "Cancel" in the confirmation dialog.',
          expectedResult: 'Item remains unchanged; no deletion occurs.',
          type: 'Negative', priority: 'Medium',
        },
      ],
      'Edge Case': [
        {
          title: `${f} — Attempt to delete an already-deleted item`,
          preconditions: 'Item has already been deleted (stale UI).',
          steps: '1. Try to delete an item that no longer exists in the system.',
          expectedResult: 'System shows a "not found" or graceful error message.',
          type: 'Edge Case', priority: 'Low',
        },
      ],
    },

    // ── DASHBOARD ──────────────────────────────────────
    dashboard: {
      Positive: [
        {
          title: `${f} — Dashboard loads correctly for an authenticated user`,
          preconditions: 'User is logged in.',
          steps: '1. Navigate to the dashboard URL.',
          expectedResult: 'Dashboard displays all expected widgets and data correctly.',
          type: 'Positive', priority: 'High',
        },
      ],
      Negative: [
        {
          title: `${f} — Unauthenticated access to dashboard is redirected`,
          preconditions: 'User is not logged in.',
          steps: '1. Attempt to navigate directly to the dashboard URL.',
          expectedResult: 'User is redirected to the login page.',
          type: 'Negative', priority: 'High',
        },
      ],
      'Edge Case': [
        {
          title: `${f} — Dashboard renders correctly with no data`,
          preconditions: 'User account has no records or activity yet.',
          steps: '1. Log in with a brand-new account.\n2. Navigate to the dashboard.',
          expectedResult: 'Empty state is shown with helpful onboarding guidance.',
          type: 'Edge Case', priority: 'Low',
        },
      ],
    },

    // ── GENERIC (fallback) ─────────────────────────────
    generic: {
      Positive: [
        {
          title: `${f} — Feature works correctly with valid input`,
          preconditions: 'System is operational and user has required permissions.',
          steps: '1. Navigate to the feature.\n2. Provide valid input.\n3. Trigger the action.',
          expectedResult: 'Feature performs as intended; correct output or state change occurs.',
          type: 'Positive', priority: 'High',
        },
        {
          title: `${f} — Feature responds correctly under normal conditions`,
          preconditions: 'System is in a healthy state.',
          steps: '1. Access the feature.\n2. Perform standard workflow steps.',
          expectedResult: 'All actions complete successfully with expected results.',
          type: 'Positive', priority: 'Medium',
        },
      ],
      Negative: [
        {
          title: `${f} — Feature handles invalid input gracefully`,
          preconditions: 'None.',
          steps: '1. Navigate to the feature.\n2. Provide invalid or missing input.\n3. Submit.',
          expectedResult: 'Appropriate error message is displayed; no crash or data loss.',
          type: 'Negative', priority: 'High',
        },
        {
          title: `${f} — Feature denies access to unauthorized users`,
          preconditions: 'User does not have the required permissions.',
          steps: '1. Attempt to access the restricted feature.',
          expectedResult: 'Access is denied; error or redirect is shown.',
          type: 'Negative', priority: 'High',
        },
      ],
      'Edge Case': [
        {
          title: `${f} — Feature behaves correctly at data boundary values`,
          preconditions: 'None.',
          steps: '1. Test with minimum allowed value.\n2. Test with maximum allowed value.',
          expectedResult: 'Both boundary values are handled correctly without errors.',
          type: 'Edge Case', priority: 'Medium',
        },
        {
          title: `${f} — Feature handles concurrent operations`,
          preconditions: 'System supports concurrent access.',
          steps: '1. Trigger the same feature action simultaneously from two different sessions.',
          expectedResult: 'Both operations complete correctly; no race condition or data corruption.',
          type: 'Edge Case', priority: 'Medium',
        },
      ],
    },
  };

  return (TEMPLATES[domain]?.[type]) ?? [];
}

// ─────────────────────────────────────────────
//  TEST CASE GENERATION
// ─────────────────────────────────────────────

/**
 * Generates test cases from the form inputs.
 * New test cases default to status 'Pending'.
 * @param {string} featureName
 * @param {string} featureDesc
 * @param {string[]} selectedTypes
 * @returns {TestCase[]}
 */
function generateTestCases(featureName, featureDesc, selectedTypes) {
  const combined = `${featureName} ${featureDesc}`;
  const domain = detectDomain(combined);
  const generated = [];

  for (const type of selectedTypes) {
    const templates = getTemplates(domain, type, featureName);
    for (const tpl of templates) {
      generated.push({ id: nextTcId(), status: 'Pending', ...tpl });
    }
  }

  return generated;
}

// ─────────────────────────────────────────────
//  RENDER — Single Test Case Card
// ─────────────────────────────────────────────

/** Priority badge CSS class map */
const PRIORITY_BADGE = { High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };

/** Type badge CSS class map */
const TYPE_BADGE = { Positive: 'badge-green', Negative: 'badge-red', 'Edge Case': 'badge-orange' };

/** Status badge CSS class map */
const STATUS_BADGE = { Pending: 'badge-pending', Pass: 'badge-pass', Fail: 'badge-fail' };

/**
 * Builds and returns a DOM element for a single test case card.
 * Includes drag handle, type/priority/status badges, and CRUD actions.
 * @param {TestCase} tc
 * @returns {HTMLElement}
 */
function buildTestCaseCard(tc) {
  const article = document.createElement('article');
  article.className = 'tc-card';
  article.dataset.id = tc.id;
  article.dataset.type = tc.type;
  article.draggable = true;

  // Localised labels
  const labelPreconditions = t('card.preconditions');
  const labelSteps         = t('card.steps');
  const labelExpected      = t('card.expected');
  const labelEdit          = t('card.edit');
  const labelDelete        = t('card.delete');
  const labelDrag          = t('card.dragHint');
  const labelStatus        = t('status.label');
  const statusOptions = [
    { val: 'Pending', label: t('status.pending') },
    { val: 'Pass',    label: t('status.pass') },
    { val: 'Fail',    label: t('status.fail') },
  ];

  const statusOpts = statusOptions.map(o =>
    `<option value="${o.val}" ${tc.status === o.val ? 'selected' : ''}>${escapeHtml(o.label)}</option>`
  ).join('');

  article.innerHTML = `
    <div class="flex items-start gap-3 mb-3 flex-wrap">
      <!-- Drag handle -->
      <div class="drag-handle pt-0.5" aria-label="${escapeHtml(labelDrag)}" title="${escapeHtml(labelDrag)}">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 8h16M4 16h16"/>
        </svg>
      </div>
      <!-- Badges row -->
      <div class="flex items-center gap-2 flex-wrap flex-1">
        <span class="font-mono text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-slate-700 px-2 py-0.5 rounded">${escapeHtml(tc.id)}</span>
        <span class="badge ${TYPE_BADGE[tc.type] || 'badge-blue'}">${escapeHtml(tc.type)}</span>
        <span class="badge ${PRIORITY_BADGE[tc.priority] || 'badge-medium'}">${escapeHtml(tc.priority)}</span>
        <span class="badge ${STATUS_BADGE[tc.status] || 'badge-pending'} hidden" id="statusBadge-${escapeHtml(tc.id)}">${escapeHtml(tc.status)}</span>
        <!-- Status select (inline pill) -->
        <label class="sr-only" for="statusSel-${escapeHtml(tc.id)}">${escapeHtml(labelStatus)}</label>
        <select
          id="statusSel-${escapeHtml(tc.id)}"
          class="status-select status-${escapeHtml(tc.status)}"
          data-action="statusChange"
          data-id="${escapeHtml(tc.id)}"
          aria-label="${escapeHtml(labelStatus)}: ${escapeHtml(tc.id)}">
          ${statusOpts}
        </select>
      </div>
      <!-- Action buttons -->
      <div class="flex gap-2 flex-shrink-0">
        <button class="btn-icon text-xs" data-action="edit" data-id="${escapeHtml(tc.id)}" aria-label="${escapeHtml(labelEdit)} ${escapeHtml(tc.id)}">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          ${escapeHtml(labelEdit)}
        </button>
        <button class="btn-icon text-xs text-red-600 hover:bg-red-50 hover:border-red-200 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:border-red-800" data-action="delete" data-id="${escapeHtml(tc.id)}" aria-label="${escapeHtml(labelDelete)} ${escapeHtml(tc.id)}">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
          ${escapeHtml(labelDelete)}
        </button>
      </div>
    </div>
    <h3 class="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-3 leading-snug">${escapeHtml(tc.title)}</h3>
    <div class="space-y-2 text-xs text-slate-600 dark:text-slate-400">
      <div>
        <span class="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide text-[10px]">${escapeHtml(labelPreconditions)}</span>
        <p class="mt-0.5 whitespace-pre-line">${escapeHtml(tc.preconditions || '—')}</p>
      </div>
      <div>
        <span class="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide text-[10px]">${escapeHtml(labelSteps)}</span>
        <p class="mt-0.5 whitespace-pre-line">${escapeHtml(tc.steps)}</p>
      </div>
      <div>
        <span class="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide text-[10px]">${escapeHtml(labelExpected)}</span>
        <p class="mt-0.5 whitespace-pre-line">${escapeHtml(tc.expectedResult)}</p>
      </div>
    </div>
  `;

  return article;
}

// ─────────────────────────────────────────────
//  RENDER — Results Section
// ─────────────────────────────────────────────

/**
 * Re-renders all test case cards based on the active filter.
 */
function renderResults() {
  const container   = document.getElementById('testCaseCards');
  const emptyState  = document.getElementById('emptyState');
  const resultsSection = document.getElementById('resultsSection');

  // Show section if there are any test cases
  if (testCases.length > 0) {
    resultsSection.classList.remove('hidden');
  } else {
    resultsSection.classList.add('hidden');
    return;
  }

  // Update counts
  const counts = { All: testCases.length, Positive: 0, Negative: 0, 'Edge Case': 0 };
  testCases.forEach(tc => { if (counts[tc.type] !== undefined) counts[tc.type]++; });

  document.getElementById('totalCount').textContent = t('totalCount', counts.All);
  document.getElementById('countAll').textContent      = counts.All;
  document.getElementById('countPositive').textContent = counts.Positive;
  document.getElementById('countNegative').textContent = counts.Negative;
  document.getElementById('countEdge').textContent     = counts['Edge Case'];

  // Filter
  const filtered = activeFilter === 'All'
    ? testCases
    : testCases.filter(tc => tc.type === activeFilter);

  container.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    filtered.forEach(tc => container.appendChild(buildTestCaseCard(tc)));
    // Re-attach drag events after rebuild
    attachDragEvents(container);
  }
}

// ─────────────────────────────────────────────
//  DRAG-TO-REORDER
// ─────────────────────────────────────────────

/** @type {HTMLElement|null} The card currently being dragged */
let dragSrcEl = null;

/**
 * Attaches HTML5 drag-and-drop event listeners to all .tc-card elements
 * inside the given container.
 * @param {HTMLElement} container
 */
function attachDragEvents(container) {
  const cards = container.querySelectorAll('.tc-card');

  cards.forEach(card => {
    card.addEventListener('dragstart', onDragStart);
    card.addEventListener('dragend', onDragEnd);
    card.addEventListener('dragover', onDragOver);
    card.addEventListener('dragleave', onDragLeave);
    card.addEventListener('drop', onDrop);
  });
}

function onDragStart(e) {
  dragSrcEl = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.dataset.id);
}

function onDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.tc-card.drag-over').forEach(el => el.classList.remove('drag-over'));
  dragSrcEl = null;
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (dragSrcEl && this !== dragSrcEl) {
    this.classList.add('drag-over');
  }
}

function onDragLeave() {
  this.classList.remove('drag-over');
}

function onDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');

  if (!dragSrcEl || dragSrcEl === this) return;

  const srcId  = dragSrcEl.dataset.id;
  const destId = this.dataset.id;

  // Reorder the testCases array to reflect the new visual order
  const srcIndex  = testCases.findIndex(tc => tc.id === srcId);
  const destIndex = testCases.findIndex(tc => tc.id === destId);

  if (srcIndex === -1 || destIndex === -1) return;

  // Splice and insert
  const [moved] = testCases.splice(srcIndex, 1);
  testCases.splice(destIndex, 0, moved);

  // Re-render (preserves filter)
  renderResults();
}

// ─────────────────────────────────────────────
//  RENDER — History Panel
// ─────────────────────────────────────────────

/**
 * Re-renders the history list in the side panel.
 */
function renderHistory() {
  const list = document.getElementById('historyList');
  list.innerHTML = '';

  if (history.length === 0) {
    list.innerHTML = `
      <div class="text-center py-10">
        <p class="text-slate-400 text-sm">${escapeHtml(t('history.empty'))}</p>
      </div>`;
    return;
  }

  // Show most recent first
  [...history].reverse().forEach(entry => {
    const count = entry.cases.length;
    const countLabel = count === 1 ? t('history.testCase') : t('history.testCases');

    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">${escapeHtml(entry.label)}</p>
          <p class="text-xs text-slate-400 mt-0.5">${escapeHtml(entry.date)} · ${count} ${escapeHtml(countLabel)}</p>
        </div>
        <button class="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0 p-0.5"
          data-action="deleteHistory" data-history-id="${escapeHtml(entry.id)}"
          aria-label="Delete history entry ${escapeHtml(entry.label)}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `;

    // Load history entry on click (not on delete button)
    div.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="deleteHistory"]')) return;
      loadHistoryEntry(entry.id);
    });

    list.appendChild(div);
  });
}

// ─────────────────────────────────────────────
//  HISTORY — save / load / delete
// ─────────────────────────────────────────────

/** Persists current history array to localStorage. */
function saveHistory() {
  localStorage.setItem('tcf_history', JSON.stringify(history));
}

/**
 * Adds the current test case set to history.
 * @param {string} label  Feature name used as the entry label
 */
function addToHistory(label) {
  const entry = {
    id: `h_${Date.now()}`,
    label,
    date: new Date().toLocaleString(),
    cases: JSON.parse(JSON.stringify(testCases)), // deep copy
  };
  history.push(entry);
  saveHistory();
  renderHistory();
}

/**
 * Loads a history entry into the active test cases.
 * @param {string} historyId
 */
function loadHistoryEntry(historyId) {
  const entry = history.find(h => h.id === historyId);
  if (!entry) return;
  testCases = JSON.parse(JSON.stringify(entry.cases));
  // Ensure all loaded cases have a status field (backward-compat)
  testCases.forEach(tc => { if (!tc.status) tc.status = 'Pending'; });
  syncTcCounter();
  activeFilter = 'All';
  updateFilterTabs('All');
  renderResults();
  closeHistoryPanel();
  showToast(t('toast.loaded', entry.label));
}

/**
 * Deletes a history entry by id.
 * @param {string} historyId
 */
function deleteHistoryEntry(historyId) {
  history = history.filter(h => h.id !== historyId);
  saveHistory();
  renderHistory();
  showToast(t('toast.historyDeleted'));
}

// ─────────────────────────────────────────────
//  HISTORY PANEL — open / close
// ─────────────────────────────────────────────

function openHistoryPanel() {
  const panel   = document.getElementById('historyPanel');
  const overlay = document.getElementById('historyOverlay');
  panel.classList.remove('translate-x-full');
  panel.setAttribute('aria-hidden', 'false');
  overlay.classList.remove('hidden');
  renderHistory();
}

function closeHistoryPanel() {
  const panel   = document.getElementById('historyPanel');
  const overlay = document.getElementById('historyOverlay');
  panel.classList.add('translate-x-full');
  panel.setAttribute('aria-hidden', 'true');
  overlay.classList.add('hidden');
}

// ─────────────────────────────────────────────
//  FILTER TABS
// ─────────────────────────────────────────────

/**
 * Updates the active visual state of filter tab buttons.
 * @param {string} filter
 */
function updateFilterTabs(filter) {
  document.querySelectorAll('.filter-tab').forEach(btn => {
    const isActive = btn.dataset.filter === filter;
    btn.classList.toggle('active-tab', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });
}

// ─────────────────────────────────────────────
//  MODAL — open / close / populate
// ─────────────────────────────────────────────

function openModal(tc = null) {
  editingId = tc ? tc.id : null;
  document.getElementById('modalTitle').textContent = tc ? t('modal.editTitle') : t('modal.addTitle');
  document.getElementById('modalTcId').value           = tc?.id ?? '';
  document.getElementById('modalTitle_').value         = tc?.title ?? '';
  document.getElementById('modalPreconditions').value  = tc?.preconditions ?? '';
  document.getElementById('modalSteps').value          = tc?.steps ?? '';
  document.getElementById('modalExpected').value       = tc?.expectedResult ?? '';
  document.getElementById('modalType').value           = tc?.type ?? 'Positive';
  document.getElementById('modalPriority').value       = tc?.priority ?? 'Medium';

  // Clear previous validation errors
  ['modalTitleError', 'modalStepsError', 'modalExpectedError'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });

  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('modalTitle_').focus();
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  editingId = null;
}

// ─────────────────────────────────────────────
//  MODAL FORM — validation & save
// ─────────────────────────────────────────────

/**
 * Validates and saves a test case from the modal form.
 * Handles both create (new) and update (edit) cases.
 * Status defaults to 'Pending' for new cases; preserves existing status on edit.
 */
function saveModalForm() {
  const title    = document.getElementById('modalTitle_').value.trim();
  const steps    = document.getElementById('modalSteps').value.trim();
  const expected = document.getElementById('modalExpected').value.trim();

  let valid = true;

  if (!title)    { document.getElementById('modalTitleError').classList.remove('hidden');    valid = false; }
  else             document.getElementById('modalTitleError').classList.add('hidden');

  if (!steps)    { document.getElementById('modalStepsError').classList.remove('hidden');    valid = false; }
  else             document.getElementById('modalStepsError').classList.add('hidden');

  if (!expected) { document.getElementById('modalExpectedError').classList.remove('hidden'); valid = false; }
  else             document.getElementById('modalExpectedError').classList.add('hidden');

  if (!valid) return;

  // Preserve existing status when editing; default to 'Pending' for new
  const existingTc = editingId ? testCases.find(t => t.id === editingId) : null;

  /** @type {TestCase} */
  const tc = {
    id:             editingId ?? nextTcId(),
    title,
    preconditions:  document.getElementById('modalPreconditions').value.trim(),
    steps,
    expectedResult: expected,
    type:           document.getElementById('modalType').value,
    priority:       document.getElementById('modalPriority').value,
    status:         existingTc?.status ?? 'Pending',
  };

  if (editingId) {
    const idx = testCases.findIndex(t => t.id === editingId);
    if (idx !== -1) testCases[idx] = tc;
    showToast(t('toast.updated'));
  } else {
    testCases.push(tc);
    showToast(t('toast.added'));
  }

  renderResults();
  closeModal();

  if (testCases.length > 0) {
    document.getElementById('resultsSection').classList.remove('hidden');
  }
}

// ─────────────────────────────────────────────
//  STATUS CHANGE — inline per-card select
// ─────────────────────────────────────────────

/**
 * Updates the status of a test case when the inline status select changes.
 * @param {string} id      - TC id
 * @param {string} status  - New status value
 */
function updateStatus(id, status) {
  const tc = testCases.find(t => t.id === id);
  if (!tc) return;
  tc.status = status;
  // Update the select element's colour class without re-rendering everything
  const sel = document.getElementById(`statusSel-${id}`);
  if (sel) {
    sel.className = `status-select status-${status}`;
  }
}

// ─────────────────────────────────────────────
//  EXPORT — CSV
// ─────────────────────────────────────────────

/**
 * Converts a value to a safely quoted CSV cell.
 * @param {string} val
 * @returns {string}
 */
function csvCell(val) {
  return `"${String(val).replace(/"/g, '""')}"`;
}

/**
 * Triggers a CSV file download of all current test cases (includes Status column).
 */
function exportToCSV() {
  if (testCases.length === 0) { showToast(t('toast.noExport')); return; }

  const headers = ['ID', 'Title', 'Type', 'Priority', 'Status', 'Preconditions', 'Steps', 'Expected Result'];
  const rows = testCases.map(tc => [
    csvCell(tc.id),
    csvCell(tc.title),
    csvCell(tc.type),
    csvCell(tc.priority),
    csvCell(tc.status),
    csvCell(tc.preconditions),
    csvCell(tc.steps),
    csvCell(tc.expectedResult),
  ].join(','));

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `testcases_${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast(t('toast.exported'));
}

// ─────────────────────────────────────────────
//  CLIPBOARD — copy all
// ─────────────────────────────────────────────

/**
 * Copies a plain-text summary of all test cases to the clipboard.
 */
function copyToClipboard() {
  if (testCases.length === 0) { showToast(t('toast.noCopy')); return; }

  const text = testCases.map(tc =>
    `[${tc.id}] ${tc.title}\nType: ${tc.type} | Priority: ${tc.priority} | Status: ${tc.status}\nPreconditions: ${tc.preconditions}\nSteps:\n${tc.steps}\nExpected: ${tc.expectedResult}`
  ).join('\n\n---\n\n');

  navigator.clipboard.writeText(text)
    .then(() => showToast(t('toast.copied')))
    .catch(() => showToast(t('toast.copyFail')));
}

// ─────────────────────────────────────────────
//  FORM VALIDATION — main generator form
// ─────────────────────────────────────────────

/**
 * Validates the main generator form.
 * @returns {boolean}
 */
function validateForm() {
  let valid = true;
  const name  = document.getElementById('featureName').value.trim();
  const desc  = document.getElementById('featureDesc').value.trim();
  const types = [...document.querySelectorAll('.type-checkbox:checked')].map(cb => cb.value);

  if (!name)  { document.getElementById('featureNameError').classList.remove('hidden'); valid = false; }
  else          document.getElementById('featureNameError').classList.add('hidden');

  if (!desc)  { document.getElementById('featureDescError').classList.remove('hidden'); valid = false; }
  else          document.getElementById('featureDescError').classList.add('hidden');

  if (types.length === 0) { document.getElementById('testTypeError').classList.remove('hidden'); valid = false; }
  else                      document.getElementById('testTypeError').classList.add('hidden');

  return valid;
}

// ─────────────────────────────────────────────
//  EVENT WIRING
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  // ── Apply initial dark mode & language ────────────
  applyDarkMode();
  applyTranslations();
  document.getElementById('langLabel').textContent = currentLang.toUpperCase();

  // ── Dark mode toggle ───────────────────────
  document.getElementById('btnDarkMode').addEventListener('click', () => {
    darkMode = !darkMode;
    applyDarkMode();
  });

  // ── Language toggle ────────────────────────
  document.getElementById('btnLangToggle').addEventListener('click', () => {
    currentLang = currentLang === 'en' ? 'id' : 'en';
    localStorage.setItem('tcf_lang', currentLang);
    document.getElementById('langLabel').textContent = currentLang.toUpperCase();
    applyTranslations();
    // Re-render cards and history with new language if results are visible
    if (!document.getElementById('resultsSection').classList.contains('hidden')) {
      renderResults();
    }
    renderHistory();
  });

  // ── Main form submit ───────────────────────
  document.getElementById('generatorForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const featureName   = document.getElementById('featureName').value.trim();
    const featureDesc   = document.getElementById('featureDesc').value.trim();
    const selectedTypes = [...document.querySelectorAll('.type-checkbox:checked')].map(cb => cb.value);

    const generated = generateTestCases(featureName, featureDesc, selectedTypes);

    if (generated.length === 0) {
      showToast(t('toast.noMatch'));
      return;
    }

    // Append to current test cases
    testCases = [...testCases, ...generated];

    activeFilter = 'All';
    updateFilterTabs('All');
    renderResults();

    // Persist to history
    addToHistory(featureName);

    showToast(t('toast.generated', generated.length));

    // Scroll to results
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ── Filter tabs ────────────────────────────
  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      updateFilterTabs(activeFilter);
      renderResults();
    });
  });

  // ── Card actions (edit / delete / status) via delegation ──
  document.getElementById('testCaseCards').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id     = btn.dataset.id;

    if (action === 'edit') {
      const tc = testCases.find(t => t.id === id);
      if (tc) openModal(tc);
    }

    if (action === 'delete') {
      testCases = testCases.filter(t => t.id !== id);
      renderResults();
      showToast(t('toast.deleted'));
    }
  });

  // ── Status select change via delegation ───
  document.getElementById('testCaseCards').addEventListener('change', (e) => {
    const sel = e.target.closest('[data-action="statusChange"]');
    if (!sel) return;
    updateStatus(sel.dataset.id, sel.value);
  });

  // ── History list delegation (delete button) ──
  document.getElementById('historyList').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="deleteHistory"]');
    if (!btn) return;
    deleteHistoryEntry(btn.dataset.historyId);
  });

  // ── Add manually button ────────────────────
  document.getElementById('btnAddManual').addEventListener('click', () => {
    openModal(null);
  });

  // ── Modal form submit ──────────────────────
  document.getElementById('modalForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveModalForm();
  });

  // ── Modal close ────────────────────────────
  document.getElementById('btnCloseModal').addEventListener('click', closeModal);
  document.getElementById('btnCancelModal').addEventListener('click', closeModal);
  document.getElementById('modalBackdrop').addEventListener('click', closeModal);

  // ── Export / Copy ──────────────────────────
  document.getElementById('btnExportCSV').addEventListener('click', exportToCSV);
  document.getElementById('btnCopy').addEventListener('click', copyToClipboard);

  // ── History panel toggle ───────────────────
  document.getElementById('btnHistoryToggle').addEventListener('click', openHistoryPanel);
  document.getElementById('btnCloseHistory').addEventListener('click', closeHistoryPanel);
  document.getElementById('historyOverlay').addEventListener('click', closeHistoryPanel);

  // ── Escape key closes modal / history ─────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!document.getElementById('modal').classList.contains('hidden')) closeModal();
      if (!document.getElementById('historyPanel').classList.contains('translate-x-full')) closeHistoryPanel();
    }
  });

  // ── Initialise history render ──────────────
  renderHistory();
});
