function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

export function isAuthorized(header: string | null): boolean {
  const user = process.env.SAKSI_WEB_USER;
  const password = process.env.SAKSI_WEB_PASSWORD;
  if (!user || !password) return false;
  if (!header || !header.startsWith("Basic ")) return false;
  try {
    const decoded = atob(header.slice(6));
    return safeEqual(decoded, `${user}:${password}`);
  } catch {
    return false;
  }
}
