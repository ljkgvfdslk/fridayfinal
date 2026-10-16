/**
 * Corporate Office Supply Requisition System
 * Production-Ready Supabase Database Client & Security Layer
 * 
 * Strict Supabase-Backed Authentication & Real Data Persistence
 */

// Supabase Configuration
var SUPABASE_URL = (typeof window !== 'undefined' && window.SUPABASE_URL) || "https://ymyetrwjewtxsrhcsmig.supabase.co";
var SUPABASE_ANON_KEY = (typeof window !== 'undefined' && window.SUPABASE_ANON_KEY) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlteWV0cndqZXd0eHNyaGNzbWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNDgwNTYsImV4cCI6MjEwNzYyNDA1Nn0.CcDLrwZSKkFdqSahQuJ2aNESE88Qx_O4EdlzWdZtQKs";

// Initialize Supabase Client
var supabaseClient = (typeof window !== 'undefined' && window.supabaseClient) || null;

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  const scope = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : self);
  if (scope.supabase && typeof scope.supabase.createClient === 'function') {
    try {
      supabaseClient = scope.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      return supabaseClient;
    } catch (err) {
      console.warn("Failed to initialize Supabase JS SDK client:", err);
    }
  }
  return null;
}

// Initial client instantiation
getSupabaseClient();

/**
 * Catalog of Office Supply Items
 * Used as fallback if Supabase `items` table is empty or unavailable
 */
var DEFAULT_SUPPLY_ITEMS = [
  { id: 1, item_name: "กระดาษถ่ายเอกสาร A4 Double A 80 แกรม (500 แผ่น/รีม)", category: "กระดาษและงานพิมพ์ (Paper)", stock: 150, unit: "รีม" },
  { id: 2, item_name: "ปากกาลูกลื่น Ballpoint Pen 0.5 มม. (กล่อง 12 ด้าม)", category: "เครื่องเขียน (Writing)", stock: 85, unit: "กล่อง" },
  { id: 3, item_name: "สมุดโน้ตสันห่วง A5 แบบมีเส้น (100 แผ่น)", category: "สมุดบันทึก (Notebook)", stock: 95, unit: "เล่ม" },
  { id: 4, item_name: "ปากกาไฮไลท์เน้นข้อความ Pastel (ชุด 4 สี)", category: "เครื่องเขียน (Writing)", stock: 65, unit: "ชุด" },
  { id: 5, item_name: "กระดาษโน้ตดัชนีมีกาวในตัว Sticky Notes (แพ็ค 4 สี)", category: "เครื่องเขียนและอุปกรณ์ (Stationery)", stock: 120, unit: "ชุด" },
  { id: 6, item_name: "เครื่องเย็บกระดาษโลหะ No.10 พร้อมลวดเย็บ", category: "อุปกรณ์สำนักงาน (Desk Tools)", stock: 45, unit: "ชุด" },
  { id: 7, item_name: "ปากกาไวท์บอร์ดหัวตัด 4 สี (น้ำเงิน แดง ดำ เขียว)", category: "ห้องประชุม (Meeting Room)", stock: 60, unit: "ชุด" },
  { id: 8, item_name: "เมาส์ไร้สายเพื่อสุขภาพ Silent Optical Mouse", category: "อุปกรณ์ไอที (IT Accessories)", stock: 24, unit: "ตัว" },
  { id: 9, item_name: "คลิปหนีบกระดาษโลหะเคลือบกันสนิม (กล่อง 100 ชิ้น)", category: "อุปกรณ์สำนักงาน (Desk Tools)", stock: 140, unit: "กล่อง" },
  { id: 10, item_name: "ลิควิดเทปลบคำผิด (แพ็ค 3 ชิ้น)", category: "เครื่องเขียน (Writing)", stock: 75, unit: "แพ็ค" },
  { id: 11, item_name: "แท่นวางจอคอมพิวเตอร์เพื่อสุขภาพ พร้อมช่องเก็บคีย์บอร์ด", category: "อุปกรณ์เพื่อสุขภาพ (Ergonomics)", stock: 18, unit: "ชิ้น" },
  { id: 12, item_name: "สติกเกอร์ลาเบลอเนกประสงค์สำหรับเครื่องพิมพ์เลเซอร์", category: "กระดาษและงานพิมพ์ (Paper)", stock: 50, unit: "แพ็ค" }
];

/**
 * Clean all mock users from localStorage to ensure the app strictly relies on real Supabase users
 */
function cleanMockUsersFromStorage() {
  if (typeof localStorage === 'undefined') return;
  try {
    // Clear mock users list
    localStorage.removeItem('corp_users');
    
    // Check current session keys: if session user is an old hardcoded mock account, clear it
    ['currentUser', 'corp_user'].forEach(key => {
      const currentSession = localStorage.getItem(key);
      if (currentSession) {
        try {
          const u = JSON.parse(currentSession);
          if (u && (u.id === 'admin-master-001' || u.id === 'user-somchai-001' || (u.id && String(u.id).startsWith('mock-')))) {
            localStorage.removeItem(key);
          }
        } catch (err) {
          localStorage.removeItem(key);
        }
      }
    });
  } catch (e) {
    console.warn("Storage cleanup notice:", e);
  }
}

// Run cleanup immediately on load
cleanMockUsersFromStorage();

/**
 * 1. SUPABASE DATA LOADING: Fetch products/supplies list
 * Dynamic loading from Supabase `items` table with fallback to demo catalog if table is empty
 */
async function getSupplyItems() {
  const client = getSupabaseClient();
  let supabaseItems = [];

  if (client) {
    try {
      const { data, error } = await client.from('items').select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        supabaseItems = data;
      }
    } catch (e) {
      console.warn("Supabase SDK items query error:", e);
    }
  }

  // REST fallback if SDK returned empty or failed
  if (supabaseItems.length === 0) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/items?select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          supabaseItems = data;
        }
      }
    } catch (e) {
      console.warn("REST items fetch fallback:", e);
    }
  }

  // If Supabase table has items, normalize and return them
  if (supabaseItems.length > 0) {
    return supabaseItems.map((item, idx) => ({
      id: item.id || (idx + 1),
      item_name: item.item_name || item.name || `อุปกรณ์ #${item.id}`,
      category: item.category || 'อุปกรณ์ทั่วไป (General)',
      stock: typeof item.stock === 'number' ? item.stock : 50,
      unit: item.unit || 'ชิ้น'
    }));
  }

  // Fallback to default catalog if Supabase table is empty so the dropdown is NEVER blank
  return DEFAULT_SUPPLY_ITEMS;
}

/**
 * Security: Password Hashing using Web Crypto SHA-256 + Salt
 */
async function hashPassword(plainText) {
  if (!plainText) return "";
  const salt = "CORP_SALT_2026_SUPPLY_#$!";
  const fullText = plainText + salt;
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
      const enc = new TextEncoder();
      const data = enc.encode(fullText);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (err) {
    console.warn("crypto.subtle.digest error, using fallback hashing:", err);
  }
  // Deterministic fallback hash
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < fullText.length; i++) {
    const ch = fullText.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(64, '0');
}

/**
 * Generate standard RFC4122 UUID v4
 */
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Data Masking: Phone Number Masking (e.g. "0812345678" -> "081-***-5678")
 */
function maskPhoneNumber(phone) {
  if (!phone) return "-";
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length >= 10) {
    const p1 = digits.slice(0, 3);
    const p3 = digits.slice(-4);
    return `${p1}-***-${p3}`;
  } else if (digits.length === 9) {
    const p1 = digits.slice(0, 2);
    const p3 = digits.slice(-4);
    return `${p1}-***-${p3}`;
  } else if (phone.includes('-')) {
    const parts = phone.split('-');
    if (parts.length === 3) {
      return `${parts[0]}-***-${parts[2]}`;
    }
  }
  return phone.replace(/(\d{3})\d{3,4}(\d{3,4})/, '$1-***-$2');
}

/**
 * Session Management
 * Retrieves currentUser from localStorage.getItem('currentUser') (primary) or 'corp_user' or Supabase auth session
 */
function getCurrentUser() {
  try {
    if (typeof localStorage === 'undefined') return null;
    
    // 1. Primary check: localStorage.getItem('currentUser')
    let raw = localStorage.getItem('currentUser');
    
    // 2. Secondary fallback check: localStorage.getItem('corp_user')
    if (!raw) {
      raw = localStorage.getItem('corp_user');
    }
    
    // 3. Check for Supabase session stored in localStorage (sb-*-auth-token)
    if (!raw) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
          try {
            const tokenObj = JSON.parse(localStorage.getItem(k));
            if (tokenObj && tokenObj.user) {
              const u = tokenObj.user;
              const extractedUser = {
                id: u.id,
                username: u.user_metadata?.username || (u.email ? u.email.split('@')[0] : 'User'),
                full_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email || 'User',
                phone: u.user_metadata?.phone || u.phone || '',
                role: u.user_metadata?.role || 'user'
              };
              // Persist into both keys for immediate subsequent loads
              localStorage.setItem('currentUser', JSON.stringify(extractedUser));
              localStorage.setItem('corp_user', JSON.stringify(extractedUser));
              return extractedUser;
            }
          } catch (e) {}
        }
      }
    }

    if (!raw) return null;
    
    let parsed = JSON.parse(raw);
    if (!parsed) return null;

    // Normalize user object fields
    const user = {
      id: parsed.id || parsed.user_id || parsed.uid,
      username: parsed.username || parsed.user_name || (parsed.email ? parsed.email.split('@')[0] : 'User'),
      full_name: parsed.full_name || parsed.name || parsed.username || 'User',
      phone: parsed.phone || parsed.phoneNumber || '',
      role: parsed.role || 'user'
    };

    if (!user.id && user.username && user.username !== 'User') {
      user.id = generateUUID();
    }

    return user;
  } catch (e) {
    console.error("Failed to parse currentUser session:", e);
    return null;
  }
}

function setCurrentUser(user) {
  if (typeof localStorage === 'undefined' || !user) return;
  try {
    const serialized = JSON.stringify(user);
    // Write to both 'currentUser' and 'corp_user'
    localStorage.setItem('currentUser', serialized);
    localStorage.setItem('corp_user', serialized);
  } catch (e) {
    console.warn("Failed to set currentUser in storage:", e);
  }
}

function clearSession() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('corp_user');
  }
  if (typeof window !== 'undefined') {
    window.location.replace('index.html');
  }
}

/**
 * Guard: Check if user is authenticated; if missing, redirect automatically to Login screen
 */
function ensureAuthenticated(message = "กรุณาเข้าสู่ระบบก่อนใช้งาน", redirectUrl = "index.html") {
  const user = getCurrentUser();
  if (!user || !user.id) {
    if (typeof window !== 'undefined') {
      // Automatic redirect as required
      window.location.replace(redirectUrl);
    }
    return null;
  }
  return user;
}

/**
 * RBAC Route Guard: Verifies login and role permissions
 */
function requireAuth(allowedRole = null) {
  const user = ensureAuthenticated("กรุณาเข้าสู่ระบบก่อนใช้งาน");
  if (!user) {
    return null;
  }

  if (allowedRole === 'admin' && user.role !== 'admin') {
    if (typeof window !== 'undefined') {
      window.location.replace('dashboard.html');
    }
    return null;
  }

  return user;
}

/**
 * REAL SUPABASE USER REGISTRATION
 * Strictly registers users into Supabase `users` table
 */
async function registerUserInSupabase(userData) {
  const client = getSupabaseClient();
  const usernameClean = (userData.username || '').trim();
  const phoneClean = (userData.phone || '').trim();

  if (!usernameClean) {
    return { success: false, errorMessage: "กรุณาระบุชื่อผู้ใช้งาน (Username)" };
  }

  // 1. Check if username or phone already exists in Supabase
  try {
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/users?username=eq.${encodeURIComponent(usernameClean)}&select=id`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (checkRes.ok) {
      const existing = await checkRes.json();
      if (Array.isArray(existing) && existing.length > 0) {
        return { success: false, errorMessage: "ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว กรุณาเลือกชื่อผู้ใช้อื่น" };
      }
    }
  } catch (err) {
    console.warn("User existence check notice:", err);
  }

  const userPayload = {
    id: userData.id || generateUUID(),
    username: usernameClean,
    password_hash: userData.password_hash,
    role: userData.role || 'user',
    full_name: userData.full_name ? userData.full_name.trim() : usernameClean,
    phone: phoneClean,
    created_at: new Date().toISOString()
  };

  let insertedUser = null;
  let insertError = null;

  // Try via Supabase client first
  if (client) {
    try {
      const { data, error } = await client
        .from('users')
        .insert([userPayload])
        .select();

      if (error) {
        insertError = error;
      } else if (Array.isArray(data) && data.length > 0) {
        insertedUser = data[0];
      }
    } catch (e) {
      insertError = e;
    }
  }

  // REST fallback if SDK failed
  if (!insertedUser) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(userPayload)
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          insertedUser = data[0];
          insertError = null;
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        insertError = new Error(errJson.message || `HTTP ${res.status}`);
      }
    } catch (e) {
      insertError = e;
    }
  }

  if (insertError) {
    console.error("Supabase Users Insert Error:", insertError);
    return {
      success: false,
      error: insertError,
      errorMessage: insertError.message || "ไม่สามารถลงทะเบียนเข้าสู่ Supabase ได้ กรุณาลองใหม่อีกครั้ง"
    };
  }

  const sessionUser = {
    id: insertedUser ? insertedUser.id : userPayload.id,
    username: userPayload.username,
    full_name: userPayload.full_name,
    phone: userPayload.phone,
    role: userPayload.role
  };

  setCurrentUser(sessionUser);

  return {
    success: true,
    user: sessionUser
  };
}

/**
 * REAL SUPABASE USER LOGIN
 * Strictly authenticates against Supabase `users` table
 * Removes all hardcoded demo/test credentials and fallback accounts
 */
async function loginUserFromSupabase(identifier, passwordHash) {
  const idClean = (identifier || '').trim();
  const idDigits = idClean.replace(/\D/g, '');

  if (!idClean) {
    return { user: null, error: new Error('กรุณากรอกชื่อผู้ใช้งานหรือเบอร์โทรศัพท์') };
  }

  const client = getSupabaseClient();
  let supabaseUsers = [];
  let queryError = null;

  // 1. Query Supabase users table via JS SDK
  if (client) {
    try {
      let filter = `username.eq.${idClean}`;
      if (idDigits.length >= 9) {
        filter += `,phone.eq.${idDigits},phone.eq.${idClean}`;
      } else {
        filter += `,phone.eq.${idClean}`;
      }

      const { data, error } = await client
        .from('users')
        .select('*')
        .or(filter);

      if (error) {
        queryError = error;
      } else if (Array.isArray(data)) {
        supabaseUsers = data;
      }
    } catch (e) {
      queryError = e;
    }
  }

  // 2. Direct REST fallback if JS SDK client is not initialized or returned empty
  if (supabaseUsers.length === 0) {
    try {
      let filterQuery = `username=eq.${encodeURIComponent(idClean)}`;
      if (idDigits.length >= 9) {
        filterQuery = `or=(username.eq.${encodeURIComponent(idClean)},phone.eq.${encodeURIComponent(idDigits)},phone.eq.${encodeURIComponent(idClean)})`;
      }
      const res = await fetch(`${SUPABASE_URL}/rest/v1/users?${filterQuery}&select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          supabaseUsers = data;
          queryError = null;
        }
      }
    } catch (e) {
      console.warn("REST login query fallback:", e);
    }
  }

  // 3. Strict authentication check
  if (supabaseUsers.length > 0) {
    const matched = supabaseUsers.find(u => u.password_hash === passwordHash);
    if (matched) {
      const sessionUser = {
        id: matched.id,
        username: matched.username,
        full_name: matched.full_name || matched.username,
        phone: matched.phone || '',
        role: matched.role || 'user'
      };
      setCurrentUser(sessionUser);
      return { user: sessionUser, error: null };
    } else {
      return {
        user: null,
        error: new Error('รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง')
      };
    }
  }

  // No user found in Supabase
  return {
    user: null,
    error: new Error('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบหรือทำการลงทะเบียนสมาชิกใหม่')
  };
}

/**
 * FORM 1: Office Supply Requisition (table `requisitions`)
 * Inserts directly into Supabase `requisitions` table
 */
async function insertRequisitionToSupabase(reqData) {
  const client = getSupabaseClient();

  let activeUserId = reqData.user_id;
  if (!activeUserId) {
    const currentUser = getCurrentUser();
    activeUserId = currentUser ? currentUser.id : null;
  }
  if (!activeUserId) {
    throw new Error("กรุณาเข้าสู่ระบบก่อนใช้งาน");
  }

  // Supabase requisitions table schema columns: user_id, item_id, quantity, reason, status, created_at
  const payload = {
    user_id: activeUserId,
    item_id: parseInt(reqData.item_id) || 1,
    quantity: parseInt(reqData.quantity) || 1,
    reason: reqData.reason ? reqData.reason.trim() : '',
    status: reqData.status || 'pending',
    created_at: new Date().toISOString()
  };

  let insertedData = null;
  let insertError = null;

  // Try via Supabase client SDK
  if (client) {
    try {
      const res = await client
        .from('requisitions')
        .insert([payload])
        .select();

      if (res.error) {
        insertError = res.error;
      } else if (Array.isArray(res.data) && res.data.length > 0) {
        insertedData = res.data[0];
      }
    } catch (e) {
      insertError = e;
    }
  }

  // Direct REST fallback
  if (!insertedData) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/requisitions`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          insertedData = data[0];
          insertError = null;
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        insertError = new Error(errJson.message || `HTTP ${res.status}`);
      }
    } catch (e) {
      insertError = e;
    }
  }

  if (insertError) {
    console.error("Supabase Requisitions Insert Error:", insertError);
    return {
      success: false,
      error: insertError,
      errorMessage: insertError.message || "Failed to insert requisition into Supabase"
    };
  }

  return {
    success: true,
    data: insertedData,
    requisition: insertedData
  };
}

/**
 * FORM 2: Service Satisfaction Feedback (table `feedbacks`)
 * Inserts directly into Supabase `feedbacks` table
 */
async function insertFeedbackToSupabase(fbData) {
  const client = getSupabaseClient();

  let activeUserId = fbData.user_id;
  if (!activeUserId) {
    const currentUser = getCurrentUser();
    activeUserId = currentUser ? currentUser.id : null;
  }
  if (!activeUserId) {
    throw new Error("กรุณาเข้าสู่ระบบก่อนใช้งาน");
  }

  // Supabase feedbacks table schema columns: user_id, rating, comment, created_at
  const payload = {
    user_id: activeUserId,
    rating: parseInt(fbData.rating) || 5,
    comment: fbData.comment ? fbData.comment.trim() : '',
    created_at: new Date().toISOString()
  };

  let insertedData = null;
  let insertError = null;

  // Try via Supabase client SDK
  if (client) {
    try {
      const res = await client
        .from('feedbacks')
        .insert([payload])
        .select();

      if (res.error) {
        insertError = res.error;
      } else if (Array.isArray(res.data) && res.data.length > 0) {
        insertedData = res.data[0];
      }
    } catch (e) {
      insertError = e;
    }
  }

  // Direct REST fallback
  if (!insertedData) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/feedbacks`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          insertedData = data[0];
          insertError = null;
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        insertError = new Error(errJson.message || `HTTP ${res.status}`);
      }
    } catch (e) {
      insertError = e;
    }
  }

  if (insertError) {
    console.error("Supabase Feedback Insert Error:", insertError);
    return {
      success: false,
      error: insertError,
      errorMessage: insertError.message || "Failed to insert feedback into Supabase"
    };
  }

  return {
    success: true,
    data: insertedData,
    feedback: insertedData
  };
}

/**
 * Fetch User's OWN Requisitions from Supabase
 */
async function fetchUserRequisitions(userId) {
  let targetId = userId;
  if (!targetId) {
    const user = getCurrentUser();
    targetId = user ? (user.id || user.user_id) : null;
  }
  if (!targetId) return [];

  // Check if targetId is a valid UUID to avoid PostgreSQL syntax errors
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);

  let list = [];
  const client = getSupabaseClient();

  if (isUuid && client) {
    try {
      const { data, error } = await client
        .from('requisitions')
        .select('*')
        .eq('user_id', targetId)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        list = data;
      }
    } catch (e) {
      console.warn("Supabase fetch user requisitions error:", e);
    }
  }

  if (isUuid && list.length === 0) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/requisitions?user_id=eq.${encodeURIComponent(targetId)}&order=created_at.desc&select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) list = data;
      }
    } catch (e) {
      console.warn("REST user requisitions error:", e);
    }
  }

  // Enrich with item details from catalog / Supabase items safely
  let itemMap = new Map();
  try {
    const items = await getSupplyItems();
    if (Array.isArray(items)) {
      itemMap = new Map(items.map(it => [it.id, it.item_name]));
    }
  } catch (e) {}

  return list.map(r => ({
    ...r,
    item_name: itemMap.get(r.item_id) || r.item_name || `อุปกรณ์สำนักงาน (ID: ${r.item_id})`
  }));
}

/**
 * Delete User's OWN Requisition from Supabase
 */
async function deleteRequisitionFromSupabase(reqId, userId, isAdmin = false) {
  if (!userId) {
    const user = getCurrentUser();
    userId = user ? user.id : null;
  }
  let supabaseResult = { success: true };
  const client = getSupabaseClient();

  if (client) {
    try {
      let query = client.from('requisitions').delete().eq('id', reqId);
      if (!isAdmin && userId) {
        query = query.eq('user_id', userId);
      }
      const { error } = await query;
      if (error) {
        supabaseResult = { success: false, error: error, errorMessage: error.message };
      }
    } catch (e) {
      supabaseResult = { success: false, errorMessage: e.message };
    }
  } else {
    try {
      let filter = `id=eq.${reqId}`;
      if (!isAdmin && userId) {
        filter += `&user_id=eq.${encodeURIComponent(userId)}`;
      }
      const res = await fetch(`${SUPABASE_URL}/rest/v1/requisitions?${filter}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (!res.ok) {
        supabaseResult = { success: false, errorMessage: `HTTP ${res.status}` };
      }
    } catch (e) {
      supabaseResult = { success: false, errorMessage: e.message };
    }
  }

  return supabaseResult;
}

/**
 * Admin: Fetch ALL Requisitions across all users
 */
async function fetchAllRequisitionsForAdmin() {
  let list = [];
  const client = getSupabaseClient();

  if (client) {
    try {
      const { data, error } = await client
        .from('requisitions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        list = data;
      }
    } catch (e) {
      console.warn("Supabase admin fetch error:", e);
    }
  }

  if (list.length === 0) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/requisitions?order=created_at.desc&select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) list = data;
      }
    } catch (e) {
      console.warn("REST admin fetch error:", e);
    }
  }

  // Enrich with item details and user information
  const [items, usersRes] = await Promise.all([
    getSupplyItems(),
    fetch(`${SUPABASE_URL}/rest/v1/users?select=id,username,full_name,phone`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    }).then(r => r.ok ? r.json() : []).catch(() => [])
  ]);

  const itemMap = new Map(items.map(it => [it.id, it.item_name]));
  const userMap = new Map((Array.isArray(usersRes) ? usersRes : []).map(u => [u.id, u]));

  return list.map(r => {
    const u = userMap.get(r.user_id);
    return {
      ...r,
      item_name: itemMap.get(r.item_id) || r.item_name || `อุปกรณ์สำนักงาน (ID: ${r.item_id})`,
      user_name: u ? (u.full_name || u.username) : (r.user_name || 'ผู้ใช้งาน'),
      user_phone: u ? u.phone : (r.user_phone || '-')
    };
  });
}

/**
 * Admin: Update Requisition Status in Supabase ('approved' / 'rejected')
 */
async function updateRequisitionStatusInSupabase(reqId, newStatus, adminComment = '') {
  let supaSuccess = true;
  let supaError = null;
  const client = getSupabaseClient();

  if (client) {
    try {
      const { data, error } = await client
        .from('requisitions')
        .update({ status: newStatus })
        .eq('id', reqId)
        .select();

      if (error) {
        supaSuccess = false;
        supaError = error;
      }
    } catch (e) {
      supaSuccess = false;
      supaError = e;
    }
  }

  if (!supaSuccess) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/requisitions?id=eq.${reqId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        supaSuccess = true;
        supaError = null;
      }
    } catch (e) {}
  }

  return {
    success: supaSuccess,
    error: supaError,
    errorMessage: supaError ? supaError.message : null
  };
}

/**
 * Fetch Feedback History from Supabase
 */
async function fetchAllFeedbacks() {
  let list = [];
  const client = getSupabaseClient();

  if (client) {
    try {
      const { data, error } = await client
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        list = data;
      }
    } catch (e) {
      console.warn("Supabase feedbacks query error:", e);
    }
  }

  if (list.length === 0) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/feedbacks?order=created_at.desc&select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) list = data;
      }
    } catch (e) {
      console.warn("REST feedbacks query error:", e);
    }
  }

  // Enrich with user name from users table
  try {
    const uRes = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id,username,full_name`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (uRes.ok) {
      const users = await uRes.json();
      const userMap = new Map((Array.isArray(users) ? users : []).map(u => [u.id, u.full_name || u.username]));
      list = list.map(item => ({
        ...item,
        user_name: userMap.get(item.user_id) || item.user_name || 'ผู้ใช้งาน'
      }));
    }
  } catch (e) {}

  return list;
}

/**
 * Toast / Notification Helper
 */
function showToast(icon, title, timer = 2500) {
  if (window.Swal) {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: timer,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });
    Toast.fire({
      icon: icon,
      title: title
    });
  } else {
    alert(title);
  }
}

// Global CorpSystem Object
var CorpSystem = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  supabaseClient,
  getSupabaseClient,
  DEFAULT_SUPPLY_ITEMS,
  getSupplyItems,
  hashPassword,
  generateUUID,
  maskPhoneNumber,
  getCurrentUser,
  setCurrentUser,
  clearSession,
  requireAuth,
  ensureAuthenticated,
  cleanMockUsersFromStorage,
  registerUserInSupabase,
  loginUserFromSupabase,
  insertRequisitionToSupabase,
  insertFeedbackToSupabase,
  fetchUserRequisitions,
  deleteRequisitionFromSupabase,
  fetchAllRequisitionsForAdmin,
  updateRequisitionStatusInSupabase,
  fetchAllFeedbacks,
  showToast
};

// Explicitly attach to global window and globalThis
if (typeof window !== 'undefined') {
  window.CorpSystem = CorpSystem;
  window.hashPassword = hashPassword;
  window.generateUUID = generateUUID;
  window.maskPhoneNumber = maskPhoneNumber;
  window.getCurrentUser = getCurrentUser;
  window.setCurrentUser = setCurrentUser;
  window.clearSession = clearSession;
  window.requireAuth = requireAuth;
  window.ensureAuthenticated = ensureAuthenticated;
  window.cleanMockUsersFromStorage = cleanMockUsersFromStorage;
  window.registerUserInSupabase = registerUserInSupabase;
  window.loginUserFromSupabase = loginUserFromSupabase;
  window.insertRequisitionToSupabase = insertRequisitionToSupabase;
  window.insertFeedbackToSupabase = insertFeedbackToSupabase;
  window.fetchUserRequisitions = fetchUserRequisitions;
  window.deleteRequisitionFromSupabase = deleteRequisitionFromSupabase;
  window.fetchAllRequisitionsForAdmin = fetchAllRequisitionsForAdmin;
  window.updateRequisitionStatusInSupabase = updateRequisitionStatusInSupabase;
  window.fetchAllFeedbacks = fetchAllFeedbacks;
  window.getSupplyItems = getSupplyItems;
  window.showToast = showToast;
  window.SUPABASE_URL = SUPABASE_URL;
  window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;
  window.supabaseClient = supabaseClient || getSupabaseClient();
}

if (typeof globalThis !== 'undefined') {
  globalThis.CorpSystem = CorpSystem;
  globalThis.hashPassword = hashPassword;
  globalThis.maskPhoneNumber = maskPhoneNumber;
}

// CommonJS export if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CorpSystem;
}
