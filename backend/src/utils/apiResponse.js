function success(res, { status = 200, message = 'Success', data = null } = {}) { return res.status(status).json({ success: true, message, data }); }
function error(res, { status = 500, message = 'Internal server error', details } = {}) { const body = { success: false, message }; if (details !== undefined) body.details = details; return res.status(status).json(body); }
module.exports = { success, error };
