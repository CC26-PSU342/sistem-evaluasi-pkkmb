// Simple bearer-token guard for write endpoints.
// Set ADMIN_API_TOKEN in .env, send header: Authorization: Bearer <token>
export function requireAdmin(req, res, next) {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "ADMIN_API_TOKEN not configured on server" });
  }
  const header = req.headers.authorization || "";
  const [scheme, value] = header.split(" ");
  if (scheme !== "Bearer" || value !== token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
