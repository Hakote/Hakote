export const nowKST = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));

export const todayKSTDateOnly = () => {
  const d = nowKST();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

export const isWeekdayKST = () => {
  const d = nowKST().getDay(); // 0 Sun ... 6 Sat
  return d >= 1 && d <= 5;
};

export const yyyyMmDdKST = () => {
  const d = todayKSTDateOnly();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export const getDateHash = (date: Date = nowKST()) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  return year * 10000 + (month + 1) * 100 + day;
};
