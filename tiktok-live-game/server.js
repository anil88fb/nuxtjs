// Kediler vs Köpekler – TikTok LIVE halat çekme oyunu
// TikTok yayınındaki yorum/hediye/beğeni olaylarını okuyup tarayıcıdaki oyuna iletir.
//
// Kullanım:
//   TIKTOK_USERNAME=kullaniciadin npm start     -> gerçek yayına bağlanır
//   npm run demo                               -> sahte izleyicilerle test eder
//
// İsteğe bağlı: EULER_API_KEY=...  (bağlantı imza servisi için, bkz. README)

import express from 'express';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Server } from 'socket.io';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';
import { startDemo } from './demo.js';

const PORT = Number(process.env.PORT || 3000);
const USERNAME = (process.env.TIKTOK_USERNAME || '').replace(/^@/, '').trim();
const DEMO = process.argv.includes('--demo') || process.env.DEMO === '1';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
const server = http.createServer(app);
const io = new Server(server);

let status = { source: 'yok', connected: false, message: 'Bağlantı bekleniyor' };
const setStatus = (s) => { status = { ...status, ...s }; io.emit('status', status); console.log('[durum]', status.message); };
io.on('connection', (socket) => socket.emit('status', status));

/** Oyuna tek tip olay gönderir. */
export function emitGameEvent(ev) {
  io.emit('game', ev);
}

const toUser = (u) => ({
  id: u?.uniqueId || u?.userId?.toString() || 'anonim',
  name: u?.nickname || u?.uniqueId || 'izleyici',
  avatar: u?.profilePicture?.url?.[0] || u?.profilePicture?.urlList?.[0] || null,
});

async function connectTikTok() {
  const conn = new TikTokLiveConnection(USERNAME, {
    signApiKey: process.env.EULER_API_KEY || undefined,
    enableExtendedGiftInfo: false,
  });

  conn.on(WebcastEvent.CHAT, (d) =>
    emitGameEvent({ type: 'chat', user: toUser(d.user), text: String(d.comment || '') }));

  conn.on(WebcastEvent.GIFT, (d) => {
    const giftType = d.giftDetails?.giftType;
    if (giftType === 1 && !d.repeatEnd) return; // seri devam ediyor, bitince say
    emitGameEvent({
      type: 'gift',
      user: toUser(d.user),
      gift: d.giftDetails?.giftName || 'Hediye',
      diamonds: Number(d.giftDetails?.diamondCount || 1),
      count: Number(d.repeatCount || 1),
    });
  });

  conn.on(WebcastEvent.LIKE, (d) =>
    emitGameEvent({ type: 'like', user: toUser(d.user), count: Number(d.likeCount || 1) }));
  conn.on(WebcastEvent.FOLLOW, (d) => emitGameEvent({ type: 'follow', user: toUser(d.user) }));
  conn.on(WebcastEvent.SHARE, (d) => emitGameEvent({ type: 'share', user: toUser(d.user) }));
  conn.on(WebcastEvent.MEMBER, (d) => emitGameEvent({ type: 'join', user: toUser(d.user) }));

  conn.on(WebcastEvent.STREAM_END, () => setStatus({ connected: false, message: 'Yayın bitti' }));
  conn.on(ControlEvent.DISCONNECTED, () => {
    setStatus({ connected: false, message: 'Bağlantı koptu, 10 sn sonra tekrar denenecek' });
    setTimeout(connectTikTok, 10_000);
  });

  try {
    const state = await conn.connect();
    setStatus({ source: 'tiktok', connected: true, message: `@${USERNAME} yayınına bağlandı (oda ${state.roomId})` });
  } catch (err) {
    setStatus({ connected: false, message: `Bağlanamadı: ${err?.message || err}. 15 sn sonra tekrar.` });
    setTimeout(connectTikTok, 15_000);
  }
}

server.listen(PORT, () => {
  console.log(`\n🎮 Oyun: http://localhost:${PORT}`);
  console.log(`   Test modu (klavye ile sahte yorum): http://localhost:${PORT}/?test=1\n`);
  if (USERNAME) connectTikTok();
  if (DEMO) {
    setStatus({ source: 'demo', connected: true, message: 'Demo modu: sahte izleyiciler oynuyor' });
    startDemo(emitGameEvent);
  }
  if (!USERNAME && !DEMO) {
    setStatus({ message: 'TIKTOK_USERNAME verilmedi. Gerçek yayın için: TIKTOK_USERNAME=kullaniciadin npm start' });
  }
});
