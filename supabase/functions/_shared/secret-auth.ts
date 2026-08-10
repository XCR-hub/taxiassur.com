export function constantTimeEqual(left: string, right: string): boolean {
  const maxLength = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < maxLength; index++) {
    difference |= (left.charCodeAt(index) || 0) ^
      (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export function verifyBearerSecret(
  req: Request,
  expectedSecret: string | undefined,
): boolean {
  const expected = expectedSecret?.trim();
  const authorization = req.headers.get("Authorization")?.trim();
  if (!expected || !authorization?.startsWith("Bearer ")) return false;
  return constantTimeEqual(authorization.slice(7), expected);
}
export function verifyServiceBearer(
  request: Request,
  serviceKey: string | undefined,
): boolean {
  const expected = serviceKey?.trim() || "";
  const authorization = request.headers.get("Authorization")?.trim() || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
  return expected.length >= 32 && Boolean(token) &&
    constantTimeEqual(token, expected);
}
