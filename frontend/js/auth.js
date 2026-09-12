const API_BASE = "https://ss-store-api-production.up.railway.app";
const page = document.body.dataset.authPage;
const $ = (selector, root = document) => root.querySelector(selector);

function apiError(message, status = 0, details = null) {
  return Object.assign(new Error(message), { status, details });
}

function setFeedback(message, type = "error") {
  const box = $("#auth-feedback");
  if (!box) return;
  box.hidden = !message;
  box.className = `feedback ${type === "success" ? "success" : ""}`;
  box.textContent = message || "";
}

function setFieldError(form, field, message) {
  const input = $(`[name="${field}"]`, form);
  const error = $(`[data-error-for="${field}"]`, form);
  if (input) input.classList.toggle("invalid", Boolean(message));
  if (error) error.textContent = message || "";
}

function clearValidation(form) {
  form.querySelectorAll(".field-error").forEach((node) => { node.textContent = ""; });
  form.querySelectorAll(".field").forEach((field) => field.classList.remove("invalid"));
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validatePhone(value) {
  return value.replace(/\D/g, "").length >= 7;
}

function validateLogin(form) {
  const values = Object.fromEntries(new FormData(form).entries());
  const errors = {};
  if (!validateEmail(values.email)) errors.email = "Enter a valid email address.";
  if (!values.password) errors.password = "Enter your password.";
  return { values, errors };
}

function validateSignup(form) {
  const values = Object.fromEntries(new FormData(form).entries());
  const errors = {};
  if (!values.name || values.name.trim().length < 2) errors.name = "Name must be at least 2 characters.";
  if (!validateEmail(values.email)) errors.email = "Enter a valid email address.";
  if (!validatePhone(values.phone || "")) errors.phone = "Enter a valid phone number.";
  if (!values.password || values.password.length < 6) errors.password = "Password must be at least 6 characters.";
  if (values.confirmPassword !== values.password) errors.confirmPassword = "Passwords do not match.";
  return { values, errors };
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { Accept: "application/json", "Content-Type": "application/json", ...(options.headers || {}) },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.success === false) {
      throw apiError(body?.message || `Request failed (${response.status})`, response.status, body?.details);
    }
    return body?.data ?? body;
  } catch (error) {
    if (error.name === "AbortError") throw apiError("The request timed out. Try again.");
    if (error instanceof Error && error.message) throw error;
    throw apiError("Network error. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
}

function extractToken(data) {
  return data?.token || data?.accessToken || data?.data?.token || data?.data?.accessToken || null;
}

async function submitAuth(form, mode) {
  clearValidation(form);
  setFeedback("");
  const result = mode === "login" ? validateLogin(form) : validateSignup(form);
  Object.entries(result.errors).forEach(([field, message]) => setFieldError(form, field, message));
  if (Object.keys(result.errors).length) return;

  const button = $("button[type=submit]", form);
  const label = $(".button-label", button);
  const originalLabel = label.textContent;
  button.disabled = true;
  button.classList.add("loading");
  label.innerHTML = `<span class="spinner" aria-hidden="true"></span>${mode === "login" ? "Logging in…" : "Creating account…"}`;

  try {
    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body = mode === "login"
      ? { email: result.values.email.trim(), password: result.values.password }
      : { name: result.values.name.trim(), email: result.values.email.trim(), phone: result.values.phone.trim(), password: result.values.password };
    const data = await request(endpoint, { method: "POST", body: JSON.stringify(body) });
    const token = extractToken(data);
    if (!token) throw apiError("Authentication succeeded, but no token was returned by the server.");
    localStorage.setItem("token", token);
    localStorage.setItem("ss-store-auth-user", JSON.stringify(data?.user || data?.data?.user || {}));
    location.href = "index.html";
  } catch (error) {
    setFeedback(error.message || "Something went wrong. Try again.");
    button.disabled = false;
    button.classList.remove("loading");
    label.textContent = originalLabel;
  }
}

function bindPasswordToggles() {
  document.querySelectorAll("[data-toggle-password]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = $(`#${button.dataset.togglePassword}`);
      if (!input) return;
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      button.textContent = visible ? "Show" : "Hide";
      button.setAttribute("aria-label", visible ? "Show password" : "Hide password");
    });
  });
}

function init() {
  if (localStorage.getItem("token")) {
    location.href = "index.html";
    return;
  }
  bindPasswordToggles();
  const form = $(`#${page}-form`);
  if (form) form.addEventListener("submit", (event) => { event.preventDefault(); submitAuth(form, page); });
}

init();
