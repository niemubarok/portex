import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'portex-secret-key-2026'

export function signToken(payload: any) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}
