// Sahte izleyici üreteci: yayına çıkmadan oyunu test etmek için.
const NAMES = ['ayse', 'mehmet', 'zeynep', 'can', 'elif', 'burak', 'deniz', 'selin', 'emre', 'ece',
  'kaan', 'irem', 'mert', 'defne', 'arda', 'nehir', 'yusuf', 'lara', 'ali', 'su', 'omer', 'derin'];
const TALK = ['hadi', 'çek!', 'güç', 'haha', 'hadiii', 'ÇEK', '💪', 'kazanacağız', 'yaa', '🔥'];
const GIFTS = [['Gül', 1], ['TikTok', 1], ['Kalp', 5], ['Parfüm', 20], ['Aslan', 29999]];

const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function startDemo(emit) {
  const users = NAMES.map((n) => ({
    user: { id: n, name: n, avatar: null },
    team: null,
  }));

  setInterval(() => {
    const u = pick(users);
    if (!u.team || Math.random() < 0.03) {
      u.team = Math.random() < 0.5 ? 'kedi' : 'köpek';
      emit({ type: 'chat', user: u.user, text: u.team });
      return;
    }
    const r = Math.random();
    if (r < 0.82) emit({ type: 'chat', user: u.user, text: pick(TALK) });
    else if (r < 0.95) emit({ type: 'like', user: u.user, count: 1 + Math.floor(Math.random() * 15) });
    else if (r < 0.99) {
      const [gift, diamonds] = pick(GIFTS.slice(0, 4));
      emit({ type: 'gift', user: u.user, gift, diamonds, count: 1 + Math.floor(Math.random() * 3) });
    } else emit({ type: pick(['follow', 'share']), user: u.user });
  }, 220);
}
