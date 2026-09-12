# SS Store auth frontend

Vanilla HTML, CSS, and JavaScript pages for customer login and signup.

- Login: `POST /api/auth/login`
- Signup: `POST /api/auth/register`
- Token storage: `localStorage.setItem("token", token)`
- Successful authentication redirects to `index.html`.
- Existing tokens redirect away from auth pages.
- Validation covers email format, phone, password length, required fields, and confirmation matching.
- Requests have timeout, network, malformed-response, and API-error handling.

Run with a static server so browser module/security behavior is predictable:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/login.html`.
