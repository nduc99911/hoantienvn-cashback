/**
 * Zalo PERSONAL bot qua zca-js (unofficial).
 *
 * ⚠️ Unofficial — ban risk. ACC PHỤ only. 1 listener / 1 acc (đừng mở Zalo Web).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSetting } from '../db/schema.js';
import { handleZaloMessage } from './zaloBot.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SESSION = path.join(__dirname, '../../data/zca-session.json');

let api = null;
let starting = false;
let ownUid = null;
let lastError = null;
let lastMsgAt = null;
let lastSendAt = null;
let msgCount = 0;
let sendOk = 0;
let sendFail = 0;
let restartTimer = null;

export function isZcaEnabled() {
  const env = process.env.ZCA_ENABLED;
  if (env === '0' || env === 'false') return false;
  if (env === '1' || env === 'true') return true;
  return getSetting('zalo_personal_enabled', '0') === '1';
}

export function isZcaOnline() {
  return Boolean(api?.listener);
}

export function getZcaOwnId() {
  return ownUid;
}

function sessionPath() {
  return (
    process.env.ZCA_SESSION_PATH ||
    getSetting('zalo_personal_session_path', '') ||
    DEFAULT_SESSION
  );
}

export function loadZcaCredentials() {
  const b64 = (process.env.ZCA_SESSION_B64 || '').trim();
  if (b64) {
    try {
      const raw = Buffer.from(b64, 'base64').toString('utf8');
      const j = JSON.parse(raw);
      if (j.cookie && j.imei && j.userAgent) return j;
    } catch (e) {
      console.error('[zca] ZCA_SESSION_B64 parse fail', e.message);
    }
  }

  const cookieEnv = (process.env.ZCA_COOKIE || '').trim();
  const imei = (process.env.ZCA_IMEI || '').trim();
  const userAgent = (process.env.ZCA_USER_AGENT || '').trim();
  if (cookieEnv && imei && userAgent) {
    try {
      const cookie = JSON.parse(cookieEnv);
      return { cookie, imei, userAgent };
    } catch (e) {
      console.error('[zca] ZCA_COOKIE parse fail', e.message);
    }
  }

  const p = sessionPath();
  if (fs.existsSync(p)) {
    try {
      const j = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (j.cookie && j.imei && j.userAgent) return j;
    } catch (e) {
      console.error('[zca] session file fail', p, e.message);
    }
  }
  return null;
}

export function saveZcaCredentials(creds, filePath = sessionPath()) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const payload = {
    cookie: creds.cookie,
    imei: creds.imei,
    userAgent: creds.userAgent,
    language: creds.language || 'vi',
    savedAt: new Date().toISOString(),
    warning:
      'SECRET — Zalo personal session. Do not commit. Use secondary account only.',
  };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
  return filePath;
}

function extractText(message) {
  const c = message?.data?.content;
  if (typeof c === 'string') return c.trim();
  if (c && typeof c === 'object') {
    if (typeof c.title === 'string') return c.title.trim();
    if (typeof c.href === 'string') return c.href.trim();
    if (typeof c.description === 'string') return c.description.trim();
    if (typeof c.params === 'string') {
      try {
        const p = JSON.parse(c.params);
        if (p?.title) return String(p.title).trim();
        if (p?.href) return String(p.href).trim();
      } catch {
        /* ignore */
      }
    }
  }
  const raw = message?.data;
  if (raw?.href) return String(raw.href).trim();
  if (typeof raw?.msg === 'string') return raw.msg.trim();
  return '';
}

function extractDisplayName(message) {
  const d = message?.data;
  return (
    d?.dName ||
    d?.displayName ||
    d?.senderName ||
    message?.threadId ||
    ''
  );
}

/** Gửi tin — thử object rồi fallback string */
async function replyZca(threadId, text, threadType) {
  if (!api || !text) {
    return { ok: false, error: 'no api/text' };
  }
  const msg = String(text).slice(0, 1900);
  const tid = String(threadId);
  try {
    let r = await api.sendMessage({ msg }, tid, threadType);
    lastSendAt = new Date().toISOString();
    sendOk += 1;
    console.log(
      `[zca] send OK to=${tid} len=${msg.length} msgId=${
        r?.[0]?.message?.msgId || r?.message?.msgId || '?'
      }`
    );
    return { ok: true, result: r };
  } catch (e1) {
    console.error('[zca] send object fail', e1.message);
    try {
      const r2 = await api.sendMessage(msg, tid, threadType);
      lastSendAt = new Date().toISOString();
      sendOk += 1;
      console.log(`[zca] send OK (string) to=${tid} len=${msg.length}`);
      return { ok: true, result: r2 };
    } catch (e2) {
      sendFail += 1;
      lastError = e2.message;
      console.error('[zca] send FAIL to=', tid, e2.message);
      return { ok: false, error: e2.message };
    }
  }
}

export async function sendZcaText(zaloUserId, text) {
  if (!api) {
    return { ok: false, skipped: true, reason: 'zca offline' };
  }
  const { ThreadType } = await import('zca-js');
  return replyZca(zaloUserId, text, ThreadType.User);
}

function scheduleRestart(reason) {
  if (restartTimer) return;
  if (!isZcaEnabled()) return;
  console.log(`[zca] schedule restart in 5s (${reason})`);
  restartTimer = setTimeout(async () => {
    restartTimer = null;
    try {
      stopZcaPersonal();
      await startZcaPersonal();
    } catch (e) {
      console.error('[zca] restart fail', e.message);
    }
  }, 5000);
}

/**
 * Khởi động listener personal.
 */
export async function startZcaPersonal() {
  if (starting) return api;
  if (api) return api;
  if (!isZcaEnabled()) {
    console.log('[zca] skip — ZCA_ENABLED/zalo_personal_enabled chưa bật');
    return null;
  }

  const creds = loadZcaCredentials();
  if (!creds) {
    console.log(
      '[zca] skip — chưa có session. Chạy: node scripts/zca-login-qr.js'
    );
    return null;
  }

  starting = true;
  try {
    const { Zalo, ThreadType, FriendEventType } = await import('zca-js');
    const zalo = new Zalo({
      logging: process.env.ZCA_DEBUG === '1',
      selfListen: false,
    });
    const newApi = await zalo.login({
      cookie: creds.cookie,
      imei: creds.imei,
      userAgent: creds.userAgent,
      language: creds.language || 'vi',
    });

    try {
      if (typeof newApi.getOwnId === 'function') {
        ownUid = await newApi.getOwnId();
      }
    } catch {
      ownUid = null;
    }
    if (!ownUid) {
      try {
        const me = await newApi.fetchAccountInfo();
        ownUid =
          me?.profile?.userId ||
          me?.userId ||
          me?.uid ||
          String(me?.profile?.userId || '') ||
          null;
      } catch {
        /* ignore */
      }
    }

    const allowGroup =
      process.env.ZCA_ALLOW_GROUP === '1' ||
      getSetting('zalo_personal_allow_group', '0') === '1';

    // Auto accept friend request — cần để reply 1-1 ổn định
    newApi.listener.on('friend_event', async (ev) => {
      try {
        console.log(
          `[zca] friend_event type=${ev?.type} thread=${ev?.threadId}`
        );
        if (ev?.type !== FriendEventType.REQUEST) return;
        const uid =
          ev?.data?.uid ||
          ev?.data?.userId ||
          ev?.data?.fromUid ||
          ev?.threadId;
        if (!uid || typeof newApi.acceptFriendRequest !== 'function') return;
        await newApi.acceptFriendRequest(String(uid));
        console.log('[zca] acceptFriendRequest', uid);
      } catch (e) {
        console.error('[zca] friend_event', e.message);
      }
    });

    // Queue tuần tự — tránh race send
    let chain = Promise.resolve();
    newApi.listener.on('message', (message) => {
      chain = chain
        .then(async () => {
          try {
            if (message.isSelf) {
              console.log('[zca] skip isSelf');
              return;
            }
            const isUser = message.type === ThreadType.User;
            const isGroup = message.type === ThreadType.Group;
            if (isGroup && !allowGroup) {
              console.log('[zca] skip group (ZCA_ALLOW_GROUP=0)');
              return;
            }
            if (!isUser && !isGroup) return;

            const text = extractText(message);
            msgCount += 1;
            lastMsgAt = new Date().toISOString();

            console.log(
              `[zca] IN type=${isUser ? 'user' : 'group'} thread=${message.threadId} rawType=${message.type} text=${JSON.stringify(text).slice(0, 100)} contentType=${typeof message?.data?.content}`
            );

            if (!text) {
              // Vẫn trả menu nếu tin không parse được text (sticker/image)
              if (isUser) {
                await replyZca(
                  message.threadId,
                  'Gửi link Shopee hoặc gõ menu nhé!',
                  message.type
                );
              }
              return;
            }

            if (isGroup) {
              const t = text.toLowerCase();
              const hasCmd =
                /(?:sodu|menu|don|subid|lienket|dangky)/i.test(t) ||
                /shopee\.vn|s\.shopee|shp\.ee|shope\.ee/i.test(t);
              if (!hasCmd) return;
            }

            const replyTo = String(message.threadId);
            const uidForUser = isUser
              ? replyTo
              : String(
                  message.data?.uidFrom ||
                    message.data?.senderId ||
                    replyTo
                );

            const reply = await handleZaloMessage({
              zaloUserId: uidForUser,
              text,
              displayName: extractDisplayName(message),
            });

            console.log(
              `[zca] handler reply len=${reply ? reply.length : 0} head=${JSON.stringify(reply?.slice(0, 60) || null)}`
            );

            if (reply) {
              await replyZca(replyTo, reply, message.type);
            }
          } catch (e) {
            lastError = e.message;
            console.error('[zca] message handler', e.message, e.stack?.split('\n')[1]);
          }
        })
        .catch((e) => console.error('[zca] chain', e.message));
    });

    newApi.listener.on('error', (err) => {
      lastError = err?.message || String(err);
      console.error('[zca] listener error', lastError);
    });

    newApi.listener.on('closed', (code, reason) => {
      console.error(`[zca] closed code=${code} reason=${reason || ''}`);
      lastError = `closed ${code}`;
      api = null;
      // DuplicateConnection / kick → restart
      if (code !== 1000) scheduleRestart(`closed ${code}`);
    });

    newApi.listener.on('disconnected', (code, reason) => {
      console.error(`[zca] disconnected code=${code} reason=${reason || ''}`);
    });

    newApi.listener.on('connected', () => {
      console.log('[zca] websocket connected');
    });

    newApi.listener.start();
    api = newApi;
    lastError = null;
    console.log(
      `[zca] personal bot ONLINE uid=${ownUid || '?'} (unofficial — acc phụ only)`
    );
    console.log(
      '[zca] TIP: nhắn từ acc KHÁC → kết bạn acc bot → gõ menu. Đừng mở Zalo Web cùng acc bot.'
    );
    return api;
  } catch (e) {
    api = null;
    lastError = e.message;
    console.error('[zca] start failed:', e.message);
    return null;
  } finally {
    starting = false;
  }
}

export function stopZcaPersonal() {
  try {
    if (api?.listener?.stop) api.listener.stop();
  } catch {
    /* ignore */
  }
  api = null;
  console.log('[zca] stopped');
}

export function zcaStatus() {
  return {
    enabled: isZcaEnabled(),
    online: isZcaOnline(),
    ownUid: ownUid || null,
    sessionPath: sessionPath(),
    hasCredentials: Boolean(loadZcaCredentials()),
    allowGroup:
      process.env.ZCA_ALLOW_GROUP === '1' ||
      getSetting('zalo_personal_allow_group', '0') === '1',
    stats: {
      msgCount,
      sendOk,
      sendFail,
      lastMsgAt,
      lastSendAt,
      lastError,
    },
    warning:
      'Unofficial zca-js — ban risk. Secondary account only. Session is secret. 1 listener only.',
  };
}
