import jwt from 'jsonwebtoken'
import process from 'node:process'

export default function requireAdmin(request, response, next) {
  const token = request.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) return response.status(401).json({ message: 'Admin sign-in required' })

  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET || 'borcelle-local-development-key')
    if (claims.role !== 'admin') return response.status(403).json({ message: 'Admin access required' })
    request.admin = claims
    next()
  } catch {
    response.status(401).json({ message: 'Admin session expired. Sign in again.' })
  }
}