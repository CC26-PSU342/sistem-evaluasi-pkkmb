export function notFound(req, res) {
  res.status(404).json({ error: "Resource not found", path: req.originalUrl });
}

export function errorHandler(err, req, res, _next) {
  console.error("[error]", err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || "Internal Server Error",
    ...(err.details ? { details: err.details } : {}),
  });
}
