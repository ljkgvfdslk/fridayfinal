/**
 * Corporate Office Supply Requisition System
 * Production-Ready Supabase Database Client & Security Layer
 */

// Supabase Configuration
const SUPABASE_URL = "https://ymyetrwjewtxsrhcsmig.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlteWV0cndqZXd0eHNyaGNzbWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNDgwNTYsImV4cCI6MjEwNzYyNDA1Nn0.CcDLrwZSKkFdqSahQuJ2aNESE88Qx_O4EdlzWdZtQKs";

// Initialize Supabase Client
let supabaseClient = null;
if (window.supabase && typeof window.supabase.createClient === 'function') {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase Client initialized successfully:", SUPABASE_URL);
  } catch (err) {
    console.error("Failed to initialize Supabase Client:", err);
  }
}

// Pre-seeded Catalog of Office Supply Items with INTEGER IDs matching DB schema
const DEFAULT_SUPPLY_ITEMS = [
  { id: 1, item_name: "A4 Copy Paper Double A (80gsm, 500 sheets)", category: "กระดาษและงานพิมพ์ (Paper)", stock: 150, unit: "รีม" },
  { id: 2, item_name: "Blue Gel Ink Rollerball Pens (0.5mm, Box of 12)", category: "เครื่องเขียน (Writing)", stock: 85, unit: "กล่อง" },
  { id: 3, item_name: "Black Gel Ink Rollerball Pens (0.5mm, Box of 12)", category: "เครื่องเขียน (Writing)", stock: 70, unit: "กล่อง" },
  { id: 4, item_name: "Ergonomic Silent Wireless Optical Mouse", category: "อุปกรณ์ไอที (IT Accessories)", stock: 24, unit: "ตัว" },
  { id: 5, item_name: "Pastel Self-Adhesive Sticky Notes (76x76mm, 4-Pack)", category: "เครื่องเขียน (Stationery)", stock: 120, unit: "ชุด" },
  { id: 6, item_name: "Heavy-Duty Desktop Metal Stapler + Staples No.10", category: "อุปกรณ์สำนักงาน (Desk Tools)", stock: 45, unit: "ชุด" },
  { id: 7, item_name: "Chisel Tip Whiteboard Markers (Assorted 4 Colors)", category: "ห้องประชุม (Meeting Room)", stock: 60, unit: "ชุด" },
  { id: 8, item_name: "Dual-Tier Ergonomic Wooden Monitor Riser Stand", category: "อุปกรณ์เพื่อสุขภาพ (Ergonomics)", stock: 18, unit: "ชิ้น" },
  { id: 9, item_name: "Executive Hardcover Grid Notebook A5 (160 Pages)", category: "สมุดบันทึก (Stationery)", stock: 95, unit: "เล่ม" },
  { id: 10, item_name: "Flame-Retardant Desktop Cable Organizer Box", category: "อุปกรณ์ไอที (IT Accessories)", stock: 32, unit: "กล่อง" },
  { id: 11, item_name: "Premium Steel Paper Clips (33mm, 100 pcs/box)", category: "เครื่องเขียน (Stationery)", stock: 140, unit: "กล่อง" },
  { id: 12, item_name: "Laser Multi-Function Shipping Labels (100 Sheets)", category: "กระดาษและงานพิมพ์ (Paper)", stock: 50, unit: "แพ็ค" }
];

/**
 * Fetch available office supply items (From Supabase `items` table or default catalog)
 */
async function getSupplyItems() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('items').select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (e) {
      console.warn("Supabase items query fallback:", e);
    }
  }
  return DEFAULT_SUPPLY_ITEMS;
}

/**
 * 2. Security: Password Hashing using Web Crypto SHA-256 + Salt
 */
async function hashPassword(plainText) {
  if (!plainText) return "";
  const salt = "CORP_SALT_2026_SUPPLY_#$!";
  const enc = new TextEncoder();
  const data = enc.encode(plainText + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
 * 5. Data Masking: Phone Number Masking (e.g. "0812345678" -> "081-***-5678")
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
 * Session Management in localStorage
 */
function getCurrentUser() {
  try {
    const userJson = localStorage.getItem('corp_user');
    return userJson ? JSON.parse(userJson) : null;
  } catch (e) {
    console.error("Failed to parse session user:", e);
    return null;
  }
}

function setCurrentUser(user) {
  localStorage.setItem('corp_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('corp_user');
  window.location.href = 'index.html';
}

/**
 * RBAC Route Guard: Verifies login and role permissions
 */
function requireAuth(allowedRole = null) {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'index.html';
    return null;
  }

  if (allowedRole === 'admin' && user.role !== 'admin') {
    if (window.Swal) {
      Swal.fire({
        title: 'การเข้าถึงถูกปฏิเสธ (Access Denied)',
        text: 'หน้านี้สงวนไว้สำหรับผู้ดูแลระบบ (Admin) เท่านั้น บัญชีของคุณมีสิทธิ์ "user"',
        icon: 'warning',
        confirmButtonColor: '#2563eb',
        confirmButtonText: 'กลับไปยังหน้าผู้ใช้งาน'
      }).then(() => {
        window.location.href = 'dashboard.html';
      });
    } else {
      alert("Access Denied: Admin role required.");
      window.location.href = 'dashboard.html';
    }
    return null;
  }

  return user;
}

/**
 * 1. REAL SUPABASE INTEGRATION: Register User in `users` table
 */
async function registerUserInSupabase(userData) {
  if (!supabaseClient) {
    throw new Error("Supabase Client is not initialized.");
  }

  // Schema: id (uuid), username (text), password_hash (text), role (text), full_name (text), phone (text), created_at (timestamp)
  const userPayload = {
    id: userData.id || generateUUID(),
    username: userData.username,
    password_hash: userData.password_hash,
    role: userData.role || 'user',
    full_name: userData.full_name,
    phone: userData.phone,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabaseClient
    .from('users')
    .insert([userPayload])
    .select();

  if (error) {
    console.error("Supabase Users Insert Error:", error);
    // Also save in local persistence as backup
    const localUsers = JSON.parse(localStorage.getItem('corp_users') || '[]');
    localUsers.push(userPayload);
    localStorage.setItem('corp_users', JSON.stringify(localUsers));
    
    return {
      success: false,
      error: error,
      user: userPayload,
      errorMessage: error.message || "Database insert failed"
    };
  }

  // Persist locally as active user
  const localUsers = JSON.parse(localStorage.getItem('corp_users') || '[]');
  localUsers.push(userPayload);
  localStorage.setItem('corp_users', JSON.stringify(localUsers));

  return {
    success: true,
    data: data,
    user: userPayload
  };
}

/**
 * 1. REAL SUPABASE INTEGRATION: Query User for Login
 */
async function loginUserFromSupabase(identifier, passwordHash) {
  let matchedUser = null;
  let supabaseError = null;

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .or(`username.eq.${identifier},phone.eq.${identifier}`);

      if (error) {
        supabaseError = error;
        console.warn("Supabase user query notice:", error);
      } else if (data && data.length > 0) {
        matchedUser = data.find(u => u.password_hash === passwordHash);
      }
    } catch (e) {
      console.warn("Supabase login exception:", e);
    }
  }

  // Also verify against local users repository
  if (!matchedUser) {
    const localUsers = JSON.parse(localStorage.getItem('corp_users') || '[]');
    matchedUser = localUsers.find(u => 
      ((u.username && u.username.toLowerCase() === identifier.toLowerCase()) ||
       (u.phone && u.phone === identifier)) &&
      u.password_hash === passwordHash
    );
  }

  return { user: matchedUser, error: supabaseError };
}

/**
 * 1. REAL SUPABASE INTEGRATION: Form 1 Office Supply Requisition (table `requisitions`)
 * Schema: id (integer auto-generated), user_id (uuid), item_id (integer), quantity (integer), reason (text), status (text), created_at (timestamp)
 */
async function insertRequisitionToSupabase(reqData) {
  if (!supabaseClient) {
    throw new Error("Supabase Client is not initialized.");
  }

  const payload = {
    user_id: reqData.user_id,
    item_id: parseInt(reqData.item_id) || 1,
    quantity: parseInt(reqData.quantity) || 1,
    reason: reqData.reason,
    status: reqData.status || 'pending',
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabaseClient
    .from('requisitions')
    .insert([payload])
    .select();

  // Save to local persistence cache with readable details for UI
  const localEntry = {
    id: (data && data[0] && data[0].id) ? data[0].id : ("local-" + Date.now()),
    ...payload,
    item_name: reqData.item_name || "Office Supply",
    user_name: reqData.user_name || "Employee",
    user_phone: reqData.user_phone || "0812345678"
  };

  const currentLocal = JSON.parse(localStorage.getItem('corp_requisitions') || '[]');
  currentLocal.unshift(localEntry);
  localStorage.setItem('corp_requisitions', JSON.stringify(currentLocal));

  if (error) {
    console.error("Supabase Requisitions Insert Error:", error);
    return {
      success: false,
      error: error,
      errorMessage: error.message || "Failed to insert requisition to Supabase",
      requisition: localEntry
    };
  }

  return {
    success: true,
    data: data,
    requisition: localEntry
  };
}

/**
 * 1. REAL SUPABASE INTEGRATION: Form 2 Service Satisfaction Feedback (table `feedbacks`)
 * Schema: id (integer auto-generated), user_id (uuid), rating (integer 1-5), comment (text), created_at (timestamp)
 */
async function insertFeedbackToSupabase(fbData) {
  if (!supabaseClient) {
    throw new Error("Supabase Client is not initialized.");
  }

  const payload = {
    user_id: fbData.user_id,
    rating: parseInt(fbData.rating) || 5,
    comment: fbData.comment,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabaseClient
    .from('feedbacks')
    .insert([payload])
    .select();

  const localEntry = {
    id: (data && data[0] && data[0].id) ? data[0].id : ("fb-" + Date.now()),
    ...payload,
    user_name: fbData.user_name || "Employee"
  };

  const currentFeedbacks = JSON.parse(localStorage.getItem('corp_feedbacks') || '[]');
  currentFeedbacks.unshift(localEntry);
  localStorage.setItem('corp_feedbacks', JSON.stringify(currentFeedbacks));

  if (error) {
    console.error("Supabase Feedback Insert Error:", error);
    return {
      success: false,
      error: error,
      errorMessage: error.message || "Failed to insert feedback to Supabase",
      feedback: localEntry
    };
  }

  return {
    success: true,
    data: data,
    feedback: localEntry
  };
}

/**
 * 3. Fetch User's OWN Requisitions (Data Ownership checked)
 */
async function fetchUserRequisitions(userId) {
  let list = [];
  if (supabaseClient && userId) {
    try {
      const { data, error } = await supabaseClient
        .from('requisitions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        list = data;
      }
    } catch (e) {
      console.warn("Supabase fetch user requisitions error:", e);
    }
  }

  // Combine with local storage cache
  const localList = JSON.parse(localStorage.getItem('corp_requisitions') || '[]');
  const userLocal = localList.filter(r => r.user_id === userId);

  const map = new Map();
  [...list, ...userLocal].forEach(item => map.set(String(item.id), item));
  return Array.from(map.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/**
 * Delete User's OWN Requisition (Data Ownership enforced)
 */
async function deleteRequisitionFromSupabase(reqId, userId, isAdmin = false) {
  let supabaseResult = { success: true };

  if (supabaseClient) {
    try {
      let query = supabaseClient.from('requisitions').delete().eq('id', reqId);
      if (!isAdmin) {
        query = query.eq('user_id', userId);
      }
      const { error } = await query;
      if (error) {
        console.warn("Supabase delete notice:", error);
        supabaseResult = { success: false, error: error, errorMessage: error.message };
      }
    } catch (e) {
      console.warn("Supabase delete exception:", e);
      supabaseResult = { success: false, errorMessage: e.message };
    }
  }

  // Also remove from local persistence
  const current = JSON.parse(localStorage.getItem('corp_requisitions') || '[]');
  const filtered = current.filter(r => {
    if (String(r.id) === String(reqId)) {
      if (!isAdmin && r.user_id !== userId) {
        throw new Error("คุณไม่มีสิทธิ์ลบรายการของผู้อื่น (Data Ownership Restricted)");
      }
      return false;
    }
    return true;
  });
  localStorage.setItem('corp_requisitions', JSON.stringify(filtered));

  return supabaseResult;
}

/**
 * 6. Admin: Fetch ALL Requisitions across all users
 */
async function fetchAllRequisitionsForAdmin() {
  let list = [];
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('requisitions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        list = data;
      }
    } catch (e) {
      console.warn("Supabase admin fetch error:", e);
    }
  }

  const localList = JSON.parse(localStorage.getItem('corp_requisitions') || '[]');
  const map = new Map();
  [...list, ...localList].forEach(item => map.set(String(item.id), item));
  return Array.from(map.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/**
 * 6. Admin: Update Requisition Status in Supabase ('approved' / 'rejected')
 */
async function updateRequisitionStatusInSupabase(reqId, newStatus, adminComment = '') {
  let supaSuccess = true;
  let supaError = null;

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('requisitions')
        .update({ status: newStatus })
        .eq('id', reqId)
        .select();

      if (error) {
        supaSuccess = false;
        supaError = error;
        console.warn("Supabase status update error:", error);
      }
    } catch (e) {
      supaSuccess = false;
      supaError = e;
    }
  }

  // Update local storage entry as well
  const current = JSON.parse(localStorage.getItem('corp_requisitions') || '[]');
  const target = current.find(r => String(r.id) === String(reqId));
  if (target) {
    target.status = newStatus;
    target.admin_comment = adminComment;
    target.updated_at = new Date().toISOString();
    localStorage.setItem('corp_requisitions', JSON.stringify(current));
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
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        list = data;
      }
    } catch (e) {
      console.warn("Supabase feedbacks query error:", e);
    }
  }

  const localList = JSON.parse(localStorage.getItem('corp_feedbacks') || '[]');
  const map = new Map();
  [...list, ...localList].forEach(item => map.set(String(item.id), item));
  return Array.from(map.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
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

// Attach to window
window.CorpSystem = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  supabaseClient,
  getSupplyItems,
  hashPassword,
  generateUUID,
  maskPhoneNumber,
  getCurrentUser,
  setCurrentUser,
  clearSession,
  requireAuth,
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
