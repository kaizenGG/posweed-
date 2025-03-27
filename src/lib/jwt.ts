import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "fallback-secret";

export function signJwtAccessToken(payload: any) {
  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: "1d" // El token expira en 1 día
  });
  return token;
}

export function verifyJwtAccessToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error("Error al verificar JWT:", error);
    return null;
  }
} 