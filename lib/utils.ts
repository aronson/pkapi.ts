export function validatePrivacy(keys: Array<string>, obj: any) {
  const priv: any = {};
  for (var k of keys) {
    if (obj[k] == null) continue;
    if (['private', 'public'].includes(obj[k])) {
      priv[k] = obj[k];
      continue;
    }

    priv[k] = obj[k] ? 'public' : 'private';
  }

  return priv;
}

export function formatDate(D: Date) {
  const y = ('000' + D.getFullYear()).slice(-4);
  const m = ('0' + (D.getMonth() + 1)).slice(-2);
  const d = ('0' + (D.getDate())).slice(-2);

  return `${y}-${m}-${d}`;
}
