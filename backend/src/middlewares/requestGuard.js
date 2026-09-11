const buckets = new Map();

function rateLimit({ windowMs = 60_000, max = 120, message = 'Too many requests. Try again shortly.' } = {}) {
  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const current = buckets.get(key);
    if (!current || now >= current.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    current.count += 1;
    if (current.count > max) {
      res.set('Retry-After', String(Math.ceil((current.resetAt - now) / 1000)));
      return res.status(429).json({ success: false, message });
    }
    next();
  };
}

function requestTimeout(timeoutMs = 15_000) {
  return (req, res, next) => {
    let finished = false;
    const timer = setTimeout(() => {
      if (!finished && !res.headersSent) {
        res.status(408).json({ success: false, message: 'Request timed out. Try again.' });
        req.destroy();
      }
    }, timeoutMs);
    const clear = () => { finished = true; clearTimeout(timer); };
    res.once('finish', clear);
    res.once('close', clear);
    next();
  };
}

module.exports = { rateLimit, requestTimeout };
