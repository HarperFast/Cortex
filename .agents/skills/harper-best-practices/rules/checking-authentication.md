---
name: checking-authentication
description: How to handle user authentication and sessions in Harper Resources.
---

# Checking Authentication

Instructions for the agent to follow when handling authentication and sessions.

## When to Use

Use this skill when you need to implement sign-in/sign-out functionality, protect specific resource endpoints, or identify the currently logged-in user in a Harper application.

## Steps

1. **Configure Harper for Sessions**: Ensure `harperdb-config.yaml` has sessions enabled and local auto-authorization disabled for testing:
   ```yaml
   authentication:
     authorizeLocal: false
     enableSessions: true
   ```
2. **Implement Sign In**: Use `this.getContext().login(username, password)` to create a session:
   ```ts
   async post(_target, data) {
     const context = this.getContext();
     try {
       await context.login(data.username, data.password);
     } catch {
       return new Response('Invalid credentials', { status: 403 });
     }
     return new Response('Logged in', { status: 200 });
   }
   ```
3. **Identify Current User**: Use `this.getCurrentUser()` to access session data:
   ```ts
   async get() {
     const user = this.getCurrentUser?.();
     if (!user) return new Response(null, { status: 401 });
     return { username: user.username, role: user.role };
   }
   ```
4. **Implement Sign Out**: Use `this.getContext().logout()` or delete the session from context:
   ```ts
   async post() {
     const context = this.getContext();
     await context.session?.delete?.(context.session.id);
     return new Response('Logged out', { status: 200 });
   }
   ```
5. **Protect Routes**: In your Resource, use `allowRead()`, `allowUpdate()`, etc., to enforce authorization logic based on `this.getCurrentUser()`. For privileged actions, verify `user.role.permission.super_user`.

## Status code conventions used here

- 200: Successful operation. For `GET /me`, a `200` with empty body means “not signed in”.
- 400: Missing required fields (e.g., username/password on sign-in).
- 401: No current session for an action that requires one (e.g., sign out when not signed in).
- 403: Authenticated but not authorized (bad credentials on login attempt, or insufficient privileges).

## Client considerations

- Sessions are cookie-based; the server handles setting and reading the cookie via Harper. If you make cross-origin requests, ensure the appropriate `credentials` mode and CORS settings.
- If developing locally, double-check the server config still has `authentication.authorizeLocal: false` to avoid accidental superuser bypass.

## Token-based auth (JWT + refresh token) for non-browser clients

Cookie-backed sessions are great for browser flows. For CLI tools, mobile apps, or other non-browser clients, it’s often easier to use **explicit tokens**:

- **JWT (`operation_token`)**: short-lived bearer token used to authorize API requests.
- **Refresh token (`refresh_token`)**: longer-lived token used to mint a new JWT when it expires.

This project includes two Resource patterns for that flow:

### Issuing tokens: `IssueTokens`

**Description / use case:** Generate `{ refreshToken, jwt }` either:

- with an existing Authorization token (either Basic Auth or a JWT) and you want to issue new tokens, or
- from an explicit `{ username, password }` payload (useful for direct “login” from a CLI/mobile client).

```
js
export class IssueTokens extends Resource {
static loadAsInstance = false;

	async get(target) {
		const { refresh_token: refreshToken, operation_token: jwt } =
			await databases.system.hdb_user.operation(
				{ operation: 'create_authentication_tokens' },
				this.getContext(),
			);
		return { refreshToken, jwt };
	}

	async post(target, data) {
		if (!data.username || !data.password) {
			throw new Error('username and password are required');
		}

		const { refresh_token: refreshToken, operation_token: jwt } =
			await databases.system.hdb_user.operation({
				operation: 'create_authentication_tokens',
				username: data.username,
				password: data.password,
			});
		return { refreshToken, jwt };
	}
}
```

**Recommended documentation notes to include:**

- `GET` variant: intended for “I already have an Authorization token, give me new tokens”.
- `POST` variant: intended for “I have credentials, give me tokens”.
- Response shape:
  - `refreshToken`: store securely (long-lived).
  - `jwt`: attach to requests (short-lived).

### Refreshing a JWT: `RefreshJWT`

**Description / use case:** When the JWT expires, the client uses the refresh token to get a new JWT without re-supplying username/password.

```
js
export class RefreshJWT extends Resource {
static loadAsInstance = false;

	async post(target, data) {
		if (!data.refreshToken) {
			throw new Error('refreshToken is required');
		}

		const { operation_token: jwt } = await databases.system.hdb_user.operation({
			operation: 'refresh_operation_token',
			refresh_token: data.refreshToken,
		});
		return { jwt };
	}
}
```

**Recommended documentation notes to include:**

- Requires `refreshToken` in the request body.
- Returns a new `{ jwt }`.
- If refresh fails (expired/revoked), client must re-authenticate (e.g., call `IssueTokens.post` again).

### Suggested client flow (high-level)

1. **Sign in (token flow)**
   - POST /IssueTokens/ with a body of `{ "username": "your username", "password": "your password" }` or GET /IssueTokens/ with an existing Authorization token.
   - Receive `{ jwt, refreshToken }` in the response
2. **Call protected APIs**
   - Send the JWT with each request in the Authorization header (as your auth mechanism expects)
3. **JWT expires**
   - POST /RefreshJWT/ with a body of `{ "refreshToken": "your refresh token" }`.
   - Receive `{ jwt }` in the response and continue

## Quick checklist

- [ ] Public endpoints explicitly `allowRead`/`allowCreate` as needed.
- [ ] Sign-in uses `context.login` and handles 400/403 correctly.
- [ ] Protected routes call `ensureSuperUser(this.getCurrentUser())` (or another role check) before doing work.
- [ ] Sign-out verifies a session and deletes it.
- [ ] `authentication.authorizeLocal` is `false` and `enableSessions` is `true` in Harper config.
- [ ] If using tokens: `IssueTokens` issues `{ jwt, refreshToken }`, `RefreshJWT` refreshes `{ jwt }` with a `refreshToken`.
