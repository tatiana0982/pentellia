# Pentellia Security Platform — Technical Reference

**Document Version:** 1.0  
**Classification:** Internal — Client Handover  
**Prepared by:** Dev Jadiya
**Status:** Production Ready

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Authentication and Session Management](#4-authentication-and-session-management)
5. [Routing and Middleware](#5-routing-and-middleware)
6. [Backend Module Architecture](#6-backend-module-architecture)
7. [Database Design](#7-database-design)
8. [Scan Execution Engine](#8-scan-execution-engine)
9. [Scan Classification System](#9-scan-classification-system)
10. [Payment and Subscription System](#10-payment-and-subscription-system)
11. [Usage Tracking and Rate Limiting](#11-usage-tracking-and-rate-limiting)
12. [Dashboard and Analytics](#12-dashboard-and-analytics)
13. [Security Architecture](#13-security-architecture)
14. [Infrastructure and Deployment](#14-infrastructure-and-deployment)
15. [Concurrency and Edge Cases](#15-concurrency-and-edge-cases)
16. [Notification System](#16-notification-system)
17. [Account Management](#17-account-management)
18. [Performance Characteristics](#18-performance-characteristics)
19. [Glossary](#19-glossary)
20. [Appendix: Detailed System Flow](#20-appendix-detailed-system-flows)

---

## 1. Executive Summary

Pentellia is a production-grade, multi-tenant Software-as-a-Service (SaaS) platform that delivers web-accessible cybersecurity scanning capabilities to individual practitioners and development teams. The platform abstracts the complexity of operating 35 individual security tools behind a unified dashboard, subscription billing model, and programmatic API surface.

The system is architected across two distinct computational tiers. The frontend and API orchestration layer runs on Vercel's serverless infrastructure, providing geographic distribution, automatic scaling, and zero-server maintenance. The scan execution engine runs on a dedicated Virtual Private Server (VPS), where long-running processes, system-level CLI tools, and resource-intensive operations can execute without the function timeout constraints imposed by serverless environments.

Commercially, the platform operates on a subscription model with four tiers, each granting differentiated daily and monthly quotas for two scan categories — deep and light — defined by the computational intensity and intrusiveness of the underlying tool invocations.

---

## 2. Technology Stack

### 2.1 Frontend and API Layer

| Component | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15.5.9 |
| Runtime | React | 19.2.1 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.4.1 |
| Icon Library | Lucide React | 0.475.0 |
| Charts | Recharts | 2.15.1 |
| Toast Notifications | React Hot Toast | 2.6.0 |
| Markdown Rendering | React Markdown | 10.1.0 |
| PDF Generation | Puppeteer Core + Chromium Min | 24.36.1 |

### 2.2 Authentication

| Component | Technology | Version |
|---|---|---|
| Client Authentication | Firebase (client SDK) | 11.9.1 |
| Server Token Verification | Firebase Admin SDK | 13.6.0 |
| Session Mechanism | HttpOnly session cookies | — |
| OTP Transport | Nodemailer via Gmail SMTP | 7.0.13 |

### 2.3 Data and Persistence

| Component | Technology | Version |
|---|---|---|
| Primary Database | PostgreSQL | 16 |
| Database Client | node-postgres (pg) | 8.16.3 |
| Connection Pool | pg.Pool | max=8, min=1 |

### 2.4 Payments

| Component | Technology | Version |
|---|---|---|
| Payment Gateway | Razorpay | 2.9.6 |
| Webhook Verification | HMAC-SHA256 (Node.js crypto) | — |

### 2.5 Scan Execution Engine (VPS)

| Component | Technology |
|---|---|
| Web Framework | Flask (Python) |
| WSGI Server | Gunicorn (multi-worker) |
| Reverse Proxy | Nginx |
| Process Isolation | Background threading per job |
| Job Persistence | JSON-backed job database (job_db.py) |
| Scanner Tools | 35 tools (see Section 8) |

### 2.6 Deployment

| Component | Provider |
|---|---|
| Frontend and API Hosting | Vercel |
| VPS (scan engine + database) | Hostinger ARM64 Debian |
| Domain and DNS | Client-managed |
| SSL Certificates | Let's Encrypt via Certbot |
| Source Control | GitHub (private repository) |

---

## 3. System Architecture

### 3.1 High-Level Overview

The platform consists of three primary layers: the client browser, the Vercel-hosted Next.js application (frontend and API), and the VPS-hosted scan execution backend. These layers communicate exclusively over authenticated HTTPS.

The Next.js application handles all user-facing concerns: rendering pages, enforcing authentication, managing subscriptions, tracking usage, and forwarding scan requests to the Flask engine. The Flask engine is a stateless executor — it receives a job, runs the tool, stores the result in its local JSON database, and makes the result available via its REST API. The PostgreSQL database serves as the authoritative record store for all user data, scan metadata, billing records, and analytics.

<img width="5959" height="3920" alt="API Architecture for Public-2026-04-12-124344" src="https://github.com/user-attachments/assets/f529f552-6272-428a-a16a-8563ecd744a6" />

*Fig. 1.1: Overall System Architecture — Browser, Vercel (Next.js), VPS (Flask + PostgreSQL), and external services (Firebase, Razorpay)*

### 3.2 Request Routing

All client requests first pass through Vercel's edge network. Static assets (`_next/static/**`) are served from CDN with content-hash filenames and indefinite cache headers. Dynamic page requests and API calls are routed to serverless function instances in the nearest region.

<img width="7675" height="5885" alt="API Architecture for Public-2026-04-12-124551" src="https://github.com/user-attachments/assets/fc69f431-7d1a-448e-bbdf-57b781c6dd35" />

*Fig. 1.2: Frontend–Backend Interaction Flow — Sequence diagram showing request lifecycle from browser to database*

### 3.3 Microservice Interaction

The Next.js API layer and the Flask engine communicate as discrete services. The API layer is responsible for authentication, authorization, usage enforcement, and persistence. The Flask engine is responsible solely for tool execution. This separation ensures that a Flask execution failure does not compromise billing integrity — all usage tracking and payment records are managed exclusively by the API layer.

<img width="3737" height="5617" alt="API Architecture for Public-2026-04-12-124712" src="https://github.com/user-attachments/assets/79d32ede-72d7-4103-9e0d-bc53365b3ffc" />

*Fig. 1.3: Microservice Interaction — Next.js API routes, Flask endpoints, and PostgreSQL table ownership*

### 3.4 Deployment Architecture

<img width="6020" height="5325" alt="API Architecture for Public-2026-04-12-124733" src="https://github.com/user-attachments/assets/a6d39b0d-36c8-42e2-9a6c-db64b9ed52f4" />

*Fig. 1.4: Deployment Architecture — Vercel build pipeline, serverless function distribution, and VPS service topology*

### 3.5 Network Topology

The VPS exposes only ports 80 and 443 externally. Port 5000 (Flask) and port 5432 (PostgreSQL) are bound to `127.0.0.1` exclusively. The UFW firewall denies all inbound traffic except on those two public ports and SSH (port 22). Nginx on port 443 terminates TLS and proxies authenticated requests to Flask on localhost.

<img width="5049" height="3465" alt="API Architecture for Public-2026-04-12-124748" src="https://github.com/user-attachments/assets/b076508b-d8a1-4fd1-a543-96226dd1e019" />

*Fig. 1.5: Network Topology — Port exposure, firewall rules, and internal vs. public interface segmentation*

### 3.6 Environment Separation

<img width="8192" height="1125" alt="API Architecture for Public-2026-04-12-124804" src="https://github.com/user-attachments/assets/44441476-d9ea-48c2-9052-0c9d859d2ef5" />

*Fig. 1.6: Environment Separation — Local development, staging (Vercel preview), and production configuration*

---

## 4. Authentication and Session Management

### 4.1 Authentication Flow

Authentication is implemented using Firebase Authentication for identity verification, combined with server-issued session cookies for subsequent request authorization.

The sequence is as follows. The client uses the Firebase client SDK to authenticate via email/password or Google OAuth. Firebase issues a short-lived ID token (JSON Web Token, 1-hour validity). The client submits this token to `POST /api/auth/login`. The API route calls `adminAuth.verifyIdToken(token, checkRevoked=true)` via the Firebase Admin SDK — this performs full cryptographic verification and checks token revocation status. Upon success, the API calls `adminAuth.createSessionCookie(idToken, { expiresIn: 7 days })`, which produces a longer-lived, HttpOnly session cookie. This cookie is set on the response as `__session`.

<img width="8192" height="3916" alt="API Architecture for Public-2026-04-12-130140" src="https://github.com/user-attachments/assets/7131581f-a079-4f63-8c43-a536d04e7e56" />

*Fig. 4.1: Authentication Flow — Firebase ID token verification and session cookie issuance sequence*

### 4.2 Session Cookie Properties

| Property | Value | Rationale |
|---|---|---|
| Cookie name | `__session` | Firebase Hosting convention |
| HttpOnly | true | Prevents JavaScript access; XSS-resistant |
| Secure | true (production) | HTTPS-only transmission |
| SameSite | strict (production) | CSRF protection |
| MaxAge | 604,800 seconds (7 days) | Balance between UX and security |
| Path | `/` | Available for all routes |

### 4.3 Session Validation Architecture

Authentication verification is performed at two layers:

**Layer 1 — Middleware (Edge Runtime):** The Next.js middleware runs on Vercel's Edge Runtime, which does not support the Firebase Admin SDK (Node.js-only). The middleware performs a shallow check — it verifies that the `__session` cookie is present. This check prevents casual access to protected routes but does not cryptographically verify the cookie. A forged or expired cookie passes the middleware check.

**Layer 2 — API Route Handlers (Node.js Runtime):** Every protected API route calls `getUid()`, which invokes `adminAuth.verifySessionCookie(cookie)` — full Firebase Admin cryptographic verification. A forged, expired, or revoked cookie is rejected here. All database queries are then scoped to the verified `uid`. No user data is ever accessible to an unverified caller.

This two-layer approach is a deliberate architectural constraint imposed by the Edge Runtime limitation, not a security weakness. The actual data gate is always at the Node.js layer.

<img width="5458" height="4629" alt="API Architecture for Public-2026-04-12-130152" src="https://github.com/user-attachments/assets/811aac93-45fe-461b-8f90-06b8f0be2680" />

*Fig. 4.2: Session Validation Flow — Middleware shallow check vs. API route full cryptographic verification*

### 4.4 OTP Verification System

Password reset operations are authenticated via a time-limited one-time password (OTP) system.

A six-digit numeric OTP is generated, hashed using bcrypt (cost factor 10), and stored in the `otp_store` table with a 10-minute expiry. The plaintext OTP is transmitted to the user via Gmail SMTP (Nodemailer). On verification, the submitted OTP is compared against the stored hash using `bcrypt.compare()`. On success, the record is marked `used=true` to prevent replay attacks. Old records for the same email and purpose are deleted before each new OTP is issued, preventing accumulation.

<img width="5458" height="4629" alt="API Architecture for Public-2026-04-12-130152" src="https://github.com/user-attachments/assets/d35c1206-89b5-4e12-81bb-ad86ca68f655" />

*Fig. 4.3: OTP Verification Flow — Generation, hashing, email delivery, and single-use verification*

**Critical operational note:** Gmail SMTP requires `SMTP_FROM_EMAIL === SMTP_USER`. Gmail rejects messages where the `From` header does not match the authenticated SMTP account. If these environment variables diverge, all OTP and confirmation emails will be silently rejected by the SMTP server.

---

## 5. Routing and Middleware

### 5.1 App Router Structure

The application uses Next.js App Router with route groups to apply different layout and authentication contexts without affecting URL paths:

| Route Group | Protected | Layout Applied |
|---|---|---|
| `(app)/` | Yes | AppSidebar, Header, WalletProvider |
| `(account)/` | Yes | Account navigation |
| `(auth)/` | No (redirects if authed) | Minimal auth layout |
| `(marketing)/` | No | Marketing header and footer |

### 5.2 Middleware Execution

The middleware function (`src/middleware.ts`) runs on every request except those matching `_next/static`, `_next/image`, `favicon.ico`, and SVG files.

Execution order:

1. `maybePrune()` — cleans expired rate limit entries from the in-memory map every 500 requests.
2. IP-based rate limiting — auth endpoints: 10 requests per minute; all API endpoints: 100 requests per minute. Returns 429 with `Retry-After: 60` on breach.
3. For `/api/*` paths: verifies cookie presence. Public API paths (login, logout, OTP, webhooks, cron) bypass this check.
4. For protected page paths (`/dashboard`, `/account`, `/subscription`): redirects to `/login?next=<path>` if no cookie.
5. For auth pages (`/login`, `/signup`): redirects to `/dashboard` if cookie is present.
6. Applies security headers to all passing responses.

<img width="6166" height="5686" alt="API Architecture for Public-2026-04-12-124850" src="https://github.com/user-attachments/assets/d6c69445-6962-4b8e-bab9-61ea8e470b54" />

*Fig. 5.1: Next.js App Router Routing Flow — Route groups, layouts, and authentication contexts*

<img width="8191" height="5616" alt="API Architecture for Public-2026-04-12-124909" src="https://github.com/user-attachments/assets/cb69d529-3ef3-41da-8972-488d08894cd6" />

*Fig. 5.2: Middleware Execution Flow — Rate limiting, cookie checking, and security header injection*

### 5.3 Security Headers Applied to All Responses

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Content-Security-Policy` | See Section 13.3 |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |

---

## 6. Backend Module Architecture

### 6.1 Module Responsibility Map

| Module | Path | Responsibility |
|---|---|---|
| Auth helper | `src/lib/auth.ts` | `getUid()`, `authenticate()` — token extraction and verification |
| Subscription logic | `src/lib/subscription.ts` | `checkUsageLimit()`, `getUsageSummary()`, `activateSubscription()`, plan management |
| Scan classifier | `src/lib/scan-classifier.ts` | `classifyScan()`, `normalizeParams()` — pure parameter-based type determination |
| Notification helper | `src/lib/notifications.ts` | `createNotification()` — persistent notification creation |
| Email templates | `src/lib/email-templates.ts` | HTML email bodies for OTP, subscription confirmation |
| Database pool | `src/config/db.ts` | pg.Pool singleton with auto-retry on transient errors |
| Environment config | `src/config/env.ts` | Validated environment variable access |
| Firebase Admin | `src/config/firebaseAdmin.ts` | `adminAuth` singleton — initialized once per cold start |
| User service | `src/services/user.service.ts` | `syncUser()`, `logLoginHistory()` — DB upsert on login |

<img width="8192" height="4378" alt="API Architecture for Public-2026-04-12-124824" src="https://github.com/user-attachments/assets/b6002df0-28d7-4c78-b4c2-779feebb3ae1" />

*Fig. 6.1: Backend Module Structure — Dependency graph between API routes, lib modules, config, and services*

### 6.2 Database Connection Pool

The pool is implemented as a Node.js global singleton to survive hot reloads in development and be reused across warm serverless invocations in production:

```
max connections: 8
min connections: 1
idle timeout: 60,000ms
connection timeout: 15,000ms (extended for remote VPS)
keepAlive: true
keepAlive initial delay: 10,000ms
```

The `query()` wrapper performs one automatic retry on transient connection errors (connection terminated, timeout, `57P01` admin shutdown), with a 600ms delay between attempts.

### 6.3 Frontend Provider Architecture

<img width="8192" height="2093" alt="API Architecture for Public-2026-04-12-124837" src="https://github.com/user-attachments/assets/86f912a5-3f42-4d55-859a-93009a43dccf" />

*Fig. 6.2: Frontend Component Hierarchy — Provider nesting, layout inheritance, and page component tree*

Two context providers wrap the application:

**AuthProvider** (`src/providers/AuthProvider.tsx`): Fetches and caches the authenticated user profile from `GET /api/users`. Exposes `user`, `isLoading`, and `refreshUser()` via React context. Consumed by pages that require user metadata (name, avatar, preferences).

**WalletProvider** (`src/providers/WalletProvider.tsx`): Fetches subscription status and usage counters from `GET /api/subscription/wallet-summary`. Polls every 5 minutes. Exposes subscription tier, plan limits, and daily/monthly usage figures. Consumed by the subscription banner, usage bars, and the scan initiation gate on the frontend.

---

## 7. Database Design

### 7.1 Entity Relationship Overview

The database contains 15 primary tables organized around the central `users` entity. All user-owned tables carry a `user_uid` foreign key referencing `users.uid`. This column is present on every query predicate without exception, providing row-level data isolation without requiring PostgreSQL Row-Level Security policies.

<img width="6166" height="5686" alt="API Architecture for Public-2026-04-12-124850" src="https://github.com/user-attachments/assets/ed3a9a60-7909-4d63-b7bd-09ef75928f08" />

*Fig. 7.1: Entity Relationship Diagram — Full schema with all entities, attributes, and cardinalities*

<img width="8191" height="5616" alt="API Architecture for Public-2026-04-12-124909" src="https://github.com/user-attachments/assets/76ef47a6-4760-415a-aa47-7b6cf3f9e34c" />

*Fig. 7.2: Table Relationship Mapping — Foreign key graph and ownership hierarchy*

### 7.2 Core Tables

**users** — Stores identity data sourced from Firebase on first login. Fields: `uid` (text PK — Firebase UID), `email`, `first_name`, `last_name`, `avatar`, `company`, `role`, `country`, `timezone`, `verified_domain`, `created_at`.

**scans** — Central scan record. Fields: `id` (uuid PK), `user_uid` (FK), `tool_id` (FK → tools), `target`, `params` (jsonb), `external_job_id` (Flask job reference), `scan_type` (varchar: `light|deep`), `status` (text: `queued|running|completed|failed|cancelled`), `result` (jsonb — normalized findings), `created_at`, `completed_at`, `deleted_at`. Soft-deleted via `deleted_at`.

**subscription_plans** — Static plan configuration. Fields: `id`, `name`, `price_inr`, `deep_scan_monthly`, `deep_scan_daily`, `light_scan_monthly`, `light_scan_daily`, `report_monthly`, `report_daily`, `sort_order`, `is_active`.

**user_subscriptions** — Per-user subscription state. Fields: `id`, `user_uid`, `plan_id`, `status` (`active|expired|cancelled`), `started_at`, `expires_at`, `pending_plan_id` (deferred downgrade), `razorpay_order_id`, `razorpay_payment_id`.

**usage_tracking** — Monthly aggregate usage per subscription period. Fields: `id`, `user_uid`, `period_start` (= `user_subscriptions.started_at`), `period_end`, `deep_scans_used`, `light_scans_used`, `reports_used`. Unique constraint on `(user_uid, period_start)`.

**daily_usage** — Per-day usage counters. Fields: `id`, `user_uid`, `date`, `deep_scans_used`, `light_scans_used`, `reports_used`. Unique constraint on `(user_uid, date)`. New row inserted per calendar day.

**invoices** — Immutable billing records. Fields: `id`, `user_uid`, `razorpay_order_id`, `razorpay_payment_id` (UNIQUE — idempotency anchor), `plan_id`, `amount_inr`, `invoice_number` (formatted `INV-YYYYMM-NNNN`), `customer_name`, `customer_email`, `status`. Retained after account deletion with PII anonymized.

**razorpay_orders** — Tracks Razorpay order lifecycle. Fields: `user_uid`, `plan_id`, `razorpay_order_id` (PK), `amount_inr`, `status` (`created|paid|failed`), `idempotency_key`, `paid_at`.

**notifications** — Event-driven user notifications. Fields: `id`, `user_uid`, `title`, `message`, `type` (`info|success|error|warning`), `is_read` (default false), `created_at`.

**otp_store** — Short-lived OTP records. Fields: `id`, `email`, `otp_hash` (bcrypt), `purpose` (`reset_password|verify_email`), `used` (bool), `expires_at`, `created_at`.

**login_history** — Audit trail of successful logins. Fields: `id`, `user_uid`, `ip`, `user_agent`, `country`, `city`, `timezone`, `created_at`.

**assets** — Discovered scan targets. Fields: `id`, `user_uid`, `target`, `discovered_at`, `deleted_at`.

**ai_summaries** — Cached AI-generated executive summaries. Fields: `id`, `user_uid`, `scan_id`, `content` (text), `created_at`.

**admin_user_archive** — Forensic archive of deleted accounts. Retained for 2 years. Contains anonymized metadata only.

**tools** — Tool registry mirroring Flask's `SUPPORTED_TOOLS`. Fields: `id`, `name`, `category`, `description`, `timeout`.

### 7.3 Indexing Strategy

Performance-critical indexes:

- `scans(user_uid, created_at DESC)` — dashboard listing queries
- `scans(user_uid, scan_type, created_at DESC)` — analytics and usage breakdown
- `scans(user_uid, status)` — active scan count queries
- `daily_usage(user_uid, date)` — UNIQUE constraint doubles as index
- `usage_tracking(user_uid, period_start)` — UNIQUE constraint doubles as index
- `notifications(user_uid, is_read, created_at DESC)` — unread notification queries
- `login_history(user_uid, created_at DESC)` — login history display

---

## 8. Scan Execution Engine

### 8.1 Architecture Overview

The Flask scan engine (`apisHub/f.py`) is a Python application running under Gunicorn with multi-threaded workers. It exposes a REST API on localhost:5000, proxied externally via Nginx on port 443. All requests require the `X-API-Key` header. Rate limiting is enforced at 100 requests per IP per hour, stored in a persistent job database.

*[Insert Fig. 8.1 — Scan Execution Lifecycle Diagram here]*

*Fig. 8.1: Scan Execution Lifecycle — Full sequence from scan request through queuing, execution, and result retrieval*

### 8.2 Supported Tools

The engine supports 35 tools across six categories:

**Reconnaissance:** wafw00f (WAF detection), nmap (network mapping), masscan (fast port scanning), httpx (HTTP probing), whatweb (technology fingerprinting), headeraudit (security header analysis), domainfinder (domain discovery), subdomainfinder (subdomain enumeration), shodansearch (Shodan intelligence), virustotal (domain reputation)

**Vulnerability Scanning:** nuclei (CVE/template scanning), nikto (web vulnerability scanning), sslscan (SSL/TLS analysis), cvesearch (multi-source CVE discovery), gvm (OpenVAS full vulnerability assessment)

**CMS Security:** wpscan (WordPress), drupalscanner (Drupal), joomlascanner (Joomla), sharepointscanner (SharePoint), cmsscan (auto-detecting unified scanner)

**Exploitation and Attack Simulation:** sqlmap (SQL injection), xssstrike (XSS detection), dalfox (advanced XSS), passwordauditor (credential testing), React-2-Shell (CVE-2025-55182 / CVE-2025-66478 exploit)

**Intelligence:** breachvip (breach database via BreachVIP API), breachintel (breach data via BreachDirectory RapidAPI), jsspider (JavaScript analysis and endpoint discovery), cloudscanner (cloud misconfiguration detection)

**Composite Scanners:** webscan (multi-tool web assessment), networkscan (multi-tool network assessment), cloudscan (cloud asset discovery), discovery (interactive asset enumeration), authtest (authentication security testing)

### 8.3 Job Lifecycle

Each scan request results in a job record in the Flask job database (`jobs_db.json`). Jobs transition through states: `queued → running → completed|failed|cancelled`. Execution occurs in a daemon background thread. Progress is updated in real time via `job_db.update_job()`. The job database supports multiple Nginx/Gunicorn workers accessing shared state without race conditions.

*[Insert Fig. 8.2 — External Tools Integration Flow here]*

*Fig. 8.2: External Tools Integration Flow — Request routing through Next.js API to Flask tool dispatch*

### 8.4 Flask Endpoint Routing

The Next.js API resolves which Flask endpoint to invoke based on tool identity and parameters:

| Condition | Flask Endpoint | Tools |
|---|---|---|
| `params.discovery === true` | `POST /discovery` | Asset Discovery orchestrator |
| `tool === "authtest"` | `POST /authtest` | Auth Testing orchestrator |
| All other tools | `POST /scan` | All 33 remaining tools |

The composite scanners (`webscan`, `networkscan`, `cloudscan`) are invoked via `POST /scan` and internally orchestrate multiple sub-tools using `concurrent.futures.ThreadPoolExecutor`.

*[Insert Fig. 8.3 — Tool Routing Logic Diagram here]*

*Fig. 8.3: Tool Routing Logic — Decision tree for Flask endpoint selection*

### 8.5 Concurrency Limits

The Flask engine enforces a hard limit of 5 concurrent active scans across all users. This counter is stored in the persistent job database and survives process restarts. A self-healing mechanism detects counter drift (active count > 0 but no running jobs found) and resets the counter, logging the event to `audit.log`.

Individual tool timeouts range from 60 seconds (wafw00f, virustotal, breachintel) to 3,600 seconds (gvm, webscan, networkscan). Long-running scans that exceed 2 hours are recovered by the stale-scan cron job.

*[Insert Fig. 8.4 — Failure Recovery Flow here]*

*Fig. 8.4: Failure Recovery Flow — Stale scan detection, marking, usage refund, and user notification*

*[Insert Fig. 8.5 — Concurrent Scan Handling Diagram here]*

*Fig. 8.5: Concurrent Scan Handling — Per-user job isolation and shared VPS resource boundaries*

### 8.6 Scan Polling

The frontend scan result page implements an adaptive polling strategy against `GET /api/dashboard/scans/:id/stream`. The stream endpoint queries Flask for current job status and fetches normalized results on completion.

| Time Since Page Load | Poll Interval |
|---|---|
| 0–30 seconds | Every 2 seconds |
| 30–150 seconds | Every 5 seconds |
| After 150 seconds | Every 10 seconds |

Additional behaviors:

- First poll on page load hits `GET /api/dashboard/scans/:id` (database-only, no Flask call) to immediately restore any previously completed scan state.
- Polls are skipped when `document.hidden === true` (tab backgrounded), reducing unnecessary Flask load.
- A `visibilitychange` event listener resumes polling immediately when the user returns to the tab.
- The `setScan` state setter guards against downgrading a completed scan to a running state from a stale poll response.
- Polling stops permanently upon receiving `status === completed|failed|cancelled`.

*[Insert Fig. 8.6 — Scan Polling Mechanism Flow here]*

*Fig. 8.6: Scan Polling Mechanism — Adaptive interval strategy, tab visibility handling, and terminal state detection*

---

## 9. Scan Classification System

### 9.1 Purpose and Problem Statement

Prior to this system, all scans regardless of parameters were recorded as `deep` in the database. This caused paying users on light plans to exhaust their deep scan quota performing basic reconnaissance operations — nmap with `-T4 -F` (top 100 ports, 60s) would consume the same quota as nmap with `-A -p-` (all 65535 ports, aggressive, 15+ minutes).

The scan classifier resolves this by reading the actual parameters submitted by the user and applying rules derived from reading every tool function in the Flask source.

### 9.2 Classification Architecture

The classifier (`src/lib/scan-classifier.ts`) is a pure TypeScript function with no I/O. It accepts a tool slug and a raw parameters object. It returns `"light"` or `"deep"`. No database roundtrip is required, making it synchronous and zero-latency.

*[Insert Fig. 9.1 — Scan Type Classification Flow here]*

*Fig. 9.1: Scan Type Classification Flow — Rule evaluation sequence from tool identity through parameter analysis*

### 9.3 Classification Rules

Rules are evaluated in priority order. The first matching rule determines the result.

**Rule 1 — Tool-level always-deep override:** The tools `gvm`, `discovery`, `authtest`, and `React-2-Shell` are unconditionally classified as deep regardless of parameters. These tools perform operations that are inherently resource-intensive, intrusive, or legally sensitive at any configuration level.

**Rule 2 — Explicit scope declaration:** If `scan_level`, `depth`, or `scope` equals `"deep"` or `"full"`, classification is deep. These parameters exist on composite scanners (webscan, networkscan, cloudscan) and directly control which sub-tools are executed.

**Rule 3 — Intensity parameters:** `level >= 3` (sqlmap test thoroughness), `risk >= 2` (sqlmap exploit aggressiveness), or `threads > 5` (httpx, sqlmap, wpscan) trigger deep classification. Default values (`level=1`, `risk=1`, `threads<=5`) remain light.

**Rule 4 — Nmap scan type:** `type='2'` invokes `nmap -A -T3 -p-` (all ports, aggressive timing, OS detection). `type='1'` invokes `nmap -T4 -F -sV` (top 100 ports, version detection). The default `type='1'` is light.

**Rule 5 — CVE and vulnerability flags:** `enable_cve=true` adds `--script vulners,vuln` to nmap or `-tags cve` to nuclei, triggering vulnerability script execution. `use_nmap=true` in cvesearch explicitly runs nmap with vuln scripts. Both are deep.

**Rules 6–15** cover attack flags (aggressive mode, deep DOM XSS, blind XSS, recursive enumeration), credential attack types (password spraying), WPScan sensitive enumeration flags (config backups, database exports), nuclei severity scope (medium/low/info), masscan full port range, and jsspider sensitive path probing.

**Default:** Any tool invocation not matching any deep rule is classified as light.

### 9.4 Parameter Normalization

Different tools use different parameter key names for equivalent concepts. The `normalizeParams()` function maps all variants to canonical names before rule evaluation:

| Canonical Name | Source Keys |
|---|---|
| `scanLevel` | `scan_level`, `depth`, `scope` |
| `intensity` | `level`, `intensity` |
| `threads` | `threads`, `max_threads` |
| `nmapType` | `type` |
| `enableCve` | `enable_cve` |
| `aggressive` | `aggressive` |
| `detectionMode` | `detection_mode` |

---

## 10. Payment and Subscription System

### 10.1 Architecture Overview

Payments are processed exclusively via Razorpay. The system uses Razorpay's order-based checkout flow: the server creates an order, the client presents the checkout modal, and payment verification is performed server-side via HMAC-SHA256 signature verification.

Subscription activation is idempotent — processing the same payment twice produces the same outcome. This is achieved through:
- Unique constraint on `invoices.razorpay_payment_id`
- Order status check before processing (`IF order.status = paid THEN skip`)
- Database transactions wrapping the activation operation (BEGIN/COMMIT)

<img width="7445" height="5885" alt="API Architecture for Public-2026-04-12-125018" src="https://github.com/user-attachments/assets/45ffd478-cd93-4f5c-b1e4-311431b28fa2" />

*Fig. 10.1: Razorpay Payment Flow — Order creation, checkout modal, and server-side verification sequence*

### 10.2 Payment Verification

On receipt of `{razorpay_payment_id, razorpay_order_id, razorpay_signature}`, the API route constructs the expected signature:

```
expectedSig = HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, RAZORPAY_KEY_SECRET)
```

Comparison is performed using `crypto.timingSafeEqual()` to prevent timing-based side-channel attacks.

<img width="5705" height="5825" alt="API Architecture for Public-2026-04-12-125032" src="https://github.com/user-attachments/assets/f2a81d40-f789-47b4-9456-d7456f1db49a" />

*Fig. 10.2: Webhook Handling Flow — Razorpay webhook delivery, signature verification, and idempotent DB update*

### 10.3 Subscription Lifecycle

Subscriptions transition through four states: `active`, `expiring` (visual only, ≤3 days remaining), `expired`, and `cancelled`. Renewal is not automatic — users must initiate a new payment. The cron maintenance job does not auto-renew subscriptions.

<img width="7673" height="3890" alt="API Architecture for Public-2026-04-12-125046" src="https://github.com/user-attachments/assets/5c238c68-3a36-4f1b-8724-efa0d255fde4" />

*Fig. 10.3: Subscription Lifecycle — State transitions between active, expiring, expired, and cancelled states*

### 10.4 Upgrade and Downgrade Logic

Plan changes are handled differently based on direction:

**Upgrade (higher `sort_order`):** Immediate activation. The new plan becomes active immediately, the subscription period resets to today, and both daily and monthly usage counters are zeroed.

**Same plan (renewal):** The expiry date is extended by 30 days from the current expiry. Usage counters are reset.

**Downgrade (lower `sort_order`):** Deferred activation. The new plan ID is stored in `pending_plan_id`. The current plan continues until its expiry date. On expiry, the next call to `getActiveSubscription()` detects the pending downgrade and activates the new plan.

<img width="4060" height="4435" alt="API Architecture for Public-2026-04-12-125058" src="https://github.com/user-attachments/assets/034e8464-68fc-4bee-9860-30a0373d115f" />

*Fig. 10.4: Upgrade vs. Downgrade Logic — Immediate vs. deferred activation decision tree*

### 10.5 Plan Tiers

| Plan | Price | Deep Scans / Month | Light Scans / Month | Daily Deep | Daily Light |
|---|---|---|---|---|---|
| Recon | ₹999 | 60 | 120 | 5 | 10 |
| Hunter | ₹1,800 | 120 | 240 | 10 | 20 |
| Elite | ₹2,500 | 210 | 420 | 15 | 30 |
| Elite Max | ₹29,999 | 4,000 | 8,000 | 200 | 400 |

<img width="8192" height="2806" alt="API Architecture for Public-2026-04-12-125111" src="https://github.com/user-attachments/assets/1510123f-5e27-4b45-aaaf-bf85bb92d8e7" />

*Fig. 10.5: Invoice Generation Flow — Post-payment invoice creation and PDF download mechanism*

*[Insert Fig. 10.6 — Plan Mapping Diagram here]*

*Fig. 10.6: Plan Mapping — Tier names, prices, and quota limits across all four subscription plans*

---

## 11. Usage Tracking and Rate Limiting

### 11.1 Two-Tier Usage Architecture

Usage is tracked at two independent time horizons: daily and monthly.

**Monthly tracking** is anchored to the subscription period. The `usage_tracking` table records cumulative usage since `user_subscriptions.started_at`. Resetting occurs only when a new payment is processed (i.e., `activateSubscription()` is called), zeroing the counters and updating `period_start`.

**Daily tracking** is a calendar-day counter. The `daily_usage` table creates a new row per `(user_uid, date)` pair. No explicit reset is needed — a new day produces a new row from zero. Days with no scan activity produce no row.

*[Insert Fig. 11.1 — Monthly Usage Tracking Flow here]*

*Fig. 11.1: Monthly Usage Tracking Flow — Subscription-period-anchored aggregation and reset logic*

*[Insert Fig. 11.2 — Daily Rate Limiting Flow here]*

*Fig. 11.2: Daily Rate Limiting Flow — Calendar-day counter behavior and reset timer calculation*

### 11.2 Atomic Enforcement

The check-and-increment operation is vulnerable to a time-of-check/time-of-use (TOCTOU) race condition under concurrent load. Two requests that both read `used=4` against `limit=5` would both conclude they are permitted and both proceed, resulting in `used=6`.

This is resolved by combining the check and increment into a single atomic SQL statement using `INSERT ... ON CONFLICT DO UPDATE ... WHERE col < limit RETURNING col`. The `WHERE` clause in the `DO UPDATE` portion means the update only executes if the current value is still below the limit at the moment of write. If the update does not execute, `RETURNING` produces zero rows. Zero rows returned indicates the limit was hit concurrently, and the request is rejected with 429.

*[Insert Fig. 11.3 — Atomic Usage Enforcement Diagram here]*

*Fig. 11.3: Atomic Usage Enforcement — SQL-level TOCTOU prevention and concurrent request isolation*

### 11.3 Usage Refund Mechanism

If a scan fails after usage has been incremented, the increment is reversed:

```sql
UPDATE daily_usage
SET col = GREATEST(0, col - 1)
WHERE user_uid = $1 AND date = CURRENT_DATE
```

The `GREATEST(0, ...)` guard prevents the counter from going negative under any circumstance. Refunds occur on two failure paths: network error reaching Flask (scan never started), and Flask returning a non-200 response (scan rejected by engine).

*[Insert Fig. 11.4 — Overuse Prevention Flow here]*

*Fig. 11.4: Overuse Prevention Flow — Complete gate sequence from authentication through atomic increment to Flask dispatch*

### 11.4 Daily Limit Reset Timer

When a user hits the daily limit, the API response includes a `resetAt` field (ISO 8601 UTC timestamp of the next midnight UTC) and a human-readable string in `HH:MM` format indicating time remaining until reset. This is computed at the moment the limit is hit:

```
midnightUTC = Date.UTC(year, month, day + 1, 0, 0, 0)
minsLeft = ceil((midnightUTC - now) / 60000)
hh:mm = String(floor(minsLeft / 60)).padStart(2, "0") + ":" + String(minsLeft % 60).padStart(2, "0")
```

*[Insert Fig. 11.5 — Usage Reset Cycle Diagram here]*

*Fig. 11.5: Usage Reset Cycle — Daily calendar-day reset and monthly subscription-period reset interaction*

---

## 12. Dashboard and Analytics

### 12.1 Single-Query Architecture

The dashboard is populated by a single HTTP call to `GET /api/dashboard/init`, which internally executes a single PostgreSQL query using a Common Table Expression (CTE). All eight data aggregations (scan counts, asset counts, recent scans, 7-day trend, previous week count, risk distribution, top targets, today stats) are resolved in one database round trip.

This design eliminates N+1 query patterns that would otherwise require 5–8 separate queries and accumulate 1,000–2,000ms of latency against a remote database.

*[Insert Fig. 12.1 — Dashboard Data Aggregation Flow here]*

*Fig. 12.1: Dashboard Data Aggregation Flow — CTE query structure and response shape mapping to UI components*

### 12.2 Risk Distribution Consistency

The `totalFindings` KPI and the risk distribution chart are computed from the same source values:

```
totalFindings = critical + high + medium + low + informational
```

The `riskDistribution` chart array contains five entries with the same five values. The `totalFindings` displayed in the center of the donut chart and the sum of chart slices are identical by construction. Prior to the production fix applied during this phase, `totalFindings` was computed as `critical + high + medium + low`, excluding informational findings, causing a visible discrepancy.

### 12.3 Risk Distribution Deduplication

The risk distribution query uses `DISTINCT ON (target, tool_id) ORDER BY created_at DESC` to select only the most recent scan per unique (target, tool) combination. This prevents a target scanned 10 times from contributing its findings 10-fold to the aggregate totals. The dashboard reflects current exposure posture, not cumulative historical scan output.

### 12.4 Data Freshness

Dashboard data is fetched fresh on every page load and on receipt of `dashboard-refresh` custom window events (fired by the scan result page on scan completion). There is no client-side caching or stale-while-revalidate behavior on dashboard data. Usage bars reflect live database values.

---

*End of Part 1 — Continued in Part 2*

# Pentellia Security Platform — Technical Reference (Part 2)

*Continued from Part 1*

---

## 13. Security Architecture

### 13.1 Defense-in-Depth Model

Security is applied at five distinct layers:

1. **Transport:** TLS 1.2+ on all connections. HSTS enforced.
2. **Edge:** Rate limiting and security headers in Next.js middleware.
3. **Authentication:** Firebase session cookie verification on every API route.
4. **Data:** All queries scoped by verified `user_uid`. No cross-user data path exists.
5. **Scan engine:** SSRF protection, input validation, API key authentication.

*[Insert Fig. 13.1 — API Security Architecture Diagram here]*

*Fig. 13.1: API Security Architecture — Layered defense model across transport, middleware, route handlers, and scan engine*

### 13.2 SSRF Protection

All scan targets submitted by users are validated by Flask's `validate_target()` function before any tool is invoked. The validation rejects:

- Targets longer than 253 characters
- Characters outside the safe URL character set
- Shell metacharacters: `;`, `|`, `&`, backtick, `$`, `(`, `)`, `\`, `<`, `>`
- Shell command patterns: `cat`, `rm`, `wget`, `curl`, `exec`, `bash`
- Newline injection (`\r`, `\n`)
- Private IPv4 ranges (RFC 1918): 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
- Loopback: 127.0.0.0/8
- Reserved addresses
- Cloud metadata service IPs: 169.254.169.254 (AWS), 168.63.129.16 (Azure), 100.100.100.200 (Alibaba)

For domain targets, the domain is resolved to an IP before being checked against the same private/metadata IP blocklist. Domains that resolve to private IPs are rejected.

*[Insert Fig. 13.2 — SSRF and Injection Protection Flow here]*

*Fig. 13.2: SSRF and Injection Protection — Input validation pipeline and blocklist enforcement in Flask*

### 13.3 Content Security Policy

The CSP applied to all pages:

```
default-src 'self'
script-src 'self' 'unsafe-inline' 'unsafe-eval'
  https://checkout.razorpay.com https://*.razorpay.com
  https://apis.google.com https://*.firebaseapp.com
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
font-src 'self' https://fonts.gstatic.com data:
img-src 'self' data: blob: https:
connect-src 'self'
  https://api.razorpay.com https://*.razorpay.com
  https://identitytoolkit.googleapis.com
  https://securetoken.googleapis.com https://*.googleapis.com
frame-src https://api.razorpay.com https://checkout.razorpay.com
  https://*.razorpay.com https://*.firebaseapp.com
  https://accounts.google.com
```

`'unsafe-inline'` and `'unsafe-eval'` are required by the Razorpay checkout SDK and Firebase client SDK. These cannot be removed without replacing those third-party dependencies.

### 13.4 CORS Configuration (Flask)

The Flask engine sets `Access-Control-Allow-Origin` to the value of the `ALLOWED_ORIGIN` environment variable, defaulting to `https://pentellia.io`. Cross-origin requests from any other domain are rejected. Credentials are not permitted (`Access-Control-Allow-Credentials: false`). Pre-flight responses are cached for 86,400 seconds.

### 13.5 Razorpay Webhook Security

Webhook authenticity is verified using HMAC-SHA256:

```
signature = HMAC-SHA256(requestBody, RAZORPAY_WEBHOOK_SECRET)
expectedSig = crypto.timingSafeEqual(Buffer.from(signature, 'hex'), generatedHash)
```

`crypto.timingSafeEqual()` is used exclusively — string comparison (`===`) is not used, as it terminates early on the first differing byte and is vulnerable to timing-based forgery attacks.

---

## 14. Infrastructure and Deployment

### 14.1 CI/CD Pipeline

Deployment is triggered automatically on pushes to the `main` branch via GitHub's Vercel integration. The build process executes `npx next build`. TypeScript type checking and ESLint are bypassed during builds (`ignoreBuildErrors: true`, `ignoreDuringBuilds: true`) to prevent build failures from non-blocking issues. All type errors should be resolved in the development environment before merging.

*[Insert Fig. 14.1 — CI/CD Pipeline Diagram here]*

*Fig. 14.1: CI/CD Pipeline — GitHub commit to Vercel build, static generation, and serverless function deployment*

### 14.2 Build Optimizations

The `next.config.ts` includes the following production optimizations:

**Package import optimization:** `optimizePackageImports` is configured for `lucide-react`, `recharts`, and 8 Radix UI packages. This instructs the Next.js bundler to tree-shake these libraries at the import level, including only the specific components used rather than the entire library.

**Console removal:** The `compiler.removeConsole` option is set with `exclude: ["error"]` for production builds, automatically stripping all `console.log` and `console.warn` calls from the compiled output while preserving `console.error`.

**External packages:** `puppeteer-core` and `@sparticuz/chromium-min` are declared as `serverExternalPackages`, preventing them from being bundled into the main function chunks. They are only loaded in the specific routes that require PDF generation.

**Compression:** `compress: true` enables Gzip compression on all API responses.

### 14.3 VPS Configuration

The VPS runs Debian on ARM64 architecture. The Flask application is managed by a systemd service and automatically restarts on failure. Nginx handles TLS termination using Let's Encrypt certificates (auto-renewed via certbot). PostgreSQL 16 binds exclusively to `127.0.0.1` and is not accessible from the public network.

**Process configuration:**
```
Gunicorn: 4 workers, threaded=True
Flask: debug=False in production
PostgreSQL: max_connections=100 (system default)
Nginx: worker_processes=auto
```

### 14.4 Cron Jobs

Two cron jobs are registered in `vercel.json` and executed via Vercel's cron infrastructure:

| Schedule | Endpoint | Purpose |
|---|---|---|
| `0 2 * * *` (2:00 AM UTC) | `POST /api/cron/maintenance` | Purge stale daily_usage (>30 days), old notifications (>90 days, read), expired OTPs, old archive records (>2 years) |
| `0 3 * * *` (3:00 AM UTC) | `POST /api/cron/stale-scans` | Find scans stuck >2 hours, mark failed, refund usage, notify users |

Both endpoints require the `CRON_SECRET` header for authentication. Vercel injects this header automatically from the environment variable.

*[Insert Fig. 14.2 — Cron Job Execution Flow here]*

*Fig. 14.2: Cron Job Execution Flow — Scheduled maintenance and stale scan recovery task details*

### 14.5 Environment Variables

All secrets are stored as Vercel environment variables. They are injected into the serverless function runtime and are never exposed to the client bundle. Only variables prefixed with `NEXT_PUBLIC_` are included in the client-side JavaScript bundle.

*[Insert Fig. 14.3 — Environment Variables Flow here]*

*Fig. 14.3: Environment Variables Flow — Vercel secret injection, server-only vs. public variable access*

### 14.6 Caching Strategy

*[Insert Fig. 14.4 — Caching Strategy Diagram here]*

*Fig. 14.4: Caching Strategy — Static asset CDN caching, API no-store policy, and client-side state management*

---

## 15. Concurrency and Edge Cases

This section documents the system's behavior under concurrent and adversarial load conditions. These scenarios were explicitly designed and tested against during implementation.

### 15.1 Two Users Logging In Simultaneously

**Scenario:** User A and User B submit credentials at the same time from different browsers.

**Behavior:** Each login request is fully independent. The `adminAuth.verifyIdToken()` call is stateless — Firebase processes each token independently. The `UserService.syncUser()` upsert uses `INSERT ... ON CONFLICT DO UPDATE`, so two simultaneous first-logins for the same user would result in one insert and one update, both producing the correct record. Login history records are inserted independently with no conflict potential. Session cookies are issued independently. No shared mutable state exists in the login path.

**Outcome:** Both users receive valid session cookies. Neither request is affected by the other.

### 15.2 Five Users Initiating Transactions Simultaneously

**Scenario:** Five distinct users submit payment verification requests at the same moment.

**Behavior:** Each `POST /api/subscription/verify-payment` request processes a unique `razorpay_payment_id`. HMAC verification is stateless. `activateSubscription()` wraps its operations in a database transaction (`BEGIN...COMMIT`). PostgreSQL serializes concurrent transactions targeting the same row via row-level locking. Since each user has a distinct `user_uid`, their subscription rows do not contend. The `invoices` table uses `ON CONFLICT (razorpay_payment_id) DO UPDATE`, ensuring that even if Razorpay delivers the webhook and the user submits the verification form simultaneously, only one invoice record is created.

**Outcome:** All five users' subscriptions are activated correctly. No duplicate invoices. No cross-user contamination.

### 15.3 Two Concurrent Requests Hitting the Daily Scan Limit

**Scenario:** User A has `daily_deep_scans_used = 4`, `daily_limit = 5`. Two browser tabs submit scan requests at the same instant.

**Behavior:** Both requests pass the soft read check in `checkUsageLimit()` (both read `used=4 < 5`). Both reach the atomic increment:

```sql
UPDATE daily_usage SET deep_scans_used = deep_scans_used + 1
WHERE user_uid = $1 AND date = $2 AND deep_scans_used < 5
RETURNING deep_scans_used
```

PostgreSQL serializes writes to the same row. The first writer increments to 5 and returns a row. The second writer finds `deep_scans_used = 5` which fails the `WHERE` predicate, returns zero rows, and is rejected with 429. The user cannot exceed the limit by any number of concurrent requests.

**Outcome:** Exactly one scan proceeds. The second request receives a descriptive 429 response with the reset timer.

### 15.4 Three Users Deleting Accounts Simultaneously

**Scenario:** Users A, B, and C invoke `DELETE /api/auth/delete-account` concurrently.

**Behavior:** Each deletion request is scoped exclusively to its `user_uid`. The 11 sequential operations (soft-delete scans, hard-delete notifications, anonymize invoices, archive, delete user record) all specify `WHERE user_uid = $uid`. PostgreSQL processes these as independent row operations. No table locks are acquired at the table level. The `admin_user_archive` INSERT uses a generated UUID PK, so three simultaneous inserts produce three independent rows with no conflict.

**Outcome:** All three accounts are cleanly deleted. Each user's data is isolated from the others throughout the process.

### 15.5 Scan Request During Subscription Expiry

**Scenario:** User's subscription expires at 14:00:00 UTC. User submits a scan at 13:59:58 UTC.

**Behavior:** `checkUsageLimit()` reads `status='active'` and `expires_at > NOW()` (true by 2 seconds). Usage is incremented. After the atomic increment, the code calls:

```sql
SELECT started_at, expires_at FROM user_subscriptions
WHERE user_uid = $1 AND status = 'active' AND expires_at > NOW()
```

If the clock has advanced past 14:00:00 UTC at this point (extremely unlikely given the 2-second window), zero rows are returned. The usage increment is refunded (`GREATEST(0, col-1)`) and the user receives 402. If the row is found, the scan proceeds normally.

**Outcome:** The scan either proceeds normally or is cleanly rejected with a refund. No usage is leaked.

### 15.6 Flask Engine Unavailable During Scan Submission

**Scenario:** VPS is unreachable. User submits a scan request.

**Behavior:** The `fetch()` call to the Flask engine uses `AbortSignal.timeout(30_000)` — it times out after 30 seconds. On timeout (or any network error), the catch block executes:

1. Refunds the daily usage increment: `GREATEST(0, col-1)`.
2. Refunds the monthly usage increment.
3. Returns HTTP 503 with message "Scan engine unreachable."

**Outcome:** User receives a clear error. No usage is consumed. The scan record is never inserted. The user can retry when the engine becomes available.

### 15.7 Duplicate Payment Webhook Delivery

**Scenario:** Razorpay delivers the `payment.captured` webhook twice for the same payment due to network retry.

**Behavior:** First delivery: `order.status = 'created'` → proceeds to activate subscription and insert invoice. Second delivery: `order.status = 'paid'` → returns 200 immediately without reprocessing. The `invoices` table `ON CONFLICT (razorpay_payment_id) DO UPDATE` provides a second safety net even if the status check is bypassed.

**Outcome:** Subscription activated exactly once. Exactly one invoice record created. No duplicate charges (charge is at Razorpay's level, not ours).

### 15.8 Stale Scan Counter in Flask

**Scenario:** VPS process crashes while 3 scans are running. The active scan counter remains at 3. After restart, no scans are actually running, but new scans are rejected as "maximum concurrent scans reached."

**Behavior:** The next scan request triggers a self-healing check. The code queries `job_db.list_jobs(status='running')` — finding zero running jobs — and detects counter drift. It calls `force_reset_active_scans()`, resets the counter to 0, and logs the event to `audit.log`. The original scan request then proceeds normally.

**Outcome:** Automatic recovery with no operator intervention required. The anomaly is recorded in the audit log for post-incident review.

### 15.9 User Refreshes Browser Mid-Scan

**Scenario:** A scan is running. The user refreshes the browser or navigates away and returns.

**Behavior:** The scan result page is at `/dashboard/scans/[tool]/[id]`. The scan ID is in the URL. On page load, the first fetch targets `GET /api/dashboard/scans/:id`, which reads directly from the PostgreSQL `scans` table (not Flask). The current scan state — whatever it is — is immediately restored from the database. If the scan completed while the user was away, the result is displayed immediately. If still running, polling resumes from the beginning of the adaptive interval sequence. The Flask job continues independently on the VPS throughout.

**Outcome:** No data loss. No manual refresh required. The user sees the current state immediately.

### 15.10 Concurrent Subscription Downgrade and Scan Request

**Scenario:** User schedules a downgrade to a lower plan (deferred). Before the current plan expires, they attempt a scan requiring deep quota.

**Behavior:** The downgrade is stored in `pending_plan_id` only. `user_subscriptions.plan_id` still points to the original plan. `checkUsageLimit()` reads limits from the current active plan. Usage enforcement uses the current plan's quotas.

**Outcome:** Downgrade does not affect quota enforcement until the plan's expiry date, as documented. Users retain their paid tier until the period ends.

### 15.11 Scan Arriving During Stale-Scan Cron Execution

**Scenario:** The cron job marks scan A as failed at the same instant the stream endpoint is polling scan A's status.

**Behavior:** The `UPDATE scans SET status='failed'` and the `SELECT scans WHERE id=$1` are serialized by PostgreSQL row locking. The stream endpoint either reads the pre-update status (still `running`) and schedules another poll, or reads the post-update status (`failed`) and terminates polling with an error toast. Both outcomes are safe.

**Outcome:** The scan is eventually marked failed. The user is notified. No stuck state is possible.

*[Insert Fig. 15.1 — Failure Scenario Handling Diagram here]*

*Fig. 15.1: Failure Scenario Handling — Payment failure, scan failure, DB failure, and Flask unreachability*

*[Insert Fig. 15.2 — Retry and Idempotency Flow here]*

*Fig. 15.2: Retry and Idempotency Flow — Payment idempotency keys, DB query retry, and webhook deduplication*

*[Insert Fig. 15.3 — Cold Start Handling Diagram here]*

*Fig. 15.3: Cold Start Handling — Serverless cold start impact, singleton initialization patterns, and mitigation strategy*

---

## 16. Notification System

### 16.1 Notification Creation

Notifications are created server-side by `createNotification()` on four trigger events:

| Trigger | Type | Message |
|---|---|---|
| Scan started | info | "Scan initiated for `{target}`" |
| Scan completed | success | "Scan for `{target}` finished." |
| Scan failed | error | "Scan for `{target}` failed." |
| Subscription activated | success | Plan name and invoice number |

All notifications are persisted to the `notifications` table. Unread notifications are surfaced in the header bell icon. Notifications older than 90 days that have been read are purged by the maintenance cron job.

*[Insert Fig. 16.1 — Notification System Flow here]*

*Fig. 16.1: Notification System Flow — Event triggers, database persistence, and frontend delivery*

### 16.2 Frontend Delivery

The header bell icon displays the count of unread notifications fetched from `GET /api/dashboard/notifications`. A dropdown shows the most recent unread items. Clicking "Mark all read" calls `PATCH /api/dashboard/notifications`. The full notification history is accessible at `/account/notifications`.

The notification count refreshes on receipt of `refresh-notifications` window events (fired after scan completion and AI summary generation) and on any page navigation that causes a re-mount of the header component.

---

## 17. Account Management

### 17.1 Profile Management

User profiles are stored in the `users` table and updated via `PATCH /api/users`. Profile completion percentage is calculated from the presence of optional fields: `firstName`, `lastName`, `company`, `role`, `country`, and `avatar`. Email is always present (Firebase-sourced) and is not counted. Each present field contributes equally to the percentage.

*[Insert Fig. 17.1 — Profile Completion Logic Diagram here]*

*Fig. 17.1: Profile Completion Logic — Field weighting and percentage calculation*

### 17.2 Account Deletion

Account deletion is a multi-step, irreversible operation that respects legal data retention requirements:

| Operation | Mechanism | Rationale |
|---|---|---|
| Scans | Soft-delete (`deleted_at = NOW()`) | Preserved for potential disputes |
| Assets, Reports | Soft-delete | Preserved |
| Login history | Hard delete | No legal requirement, PII-sensitive |
| Notifications | Hard delete | Operational data only |
| API keys | Hard delete | Security-sensitive |
| OTP records | Hard delete | Expired operational data |
| Usage tracking | Hard delete | No post-deletion relevance |
| AI summaries | Hard delete | Derived content, no retention need |
| Push subscriptions | Hard delete | Device-specific technical record |
| Invoices | Anonymized (`customer_name='DELETED'`, `customer_email='DELETED'`) | Legal tax record retention required |
| User archive | Insert to `admin_user_archive` | Forensic audit trail, 2-year retention |
| User record | Hard delete | Final step |

*[Insert Fig. 17.2 — Account Deletion Flow here]*

*Fig. 17.2: Account Deletion Flow — Multi-step deletion sequence with data retention classification*

---

## 18. Performance Characteristics

### 18.1 Request Latency Profile

| Operation | Expected Latency | Notes |
|---|---|---|
| Static page load (cached) | < 50ms | CDN-served |
| Dashboard init API | 200–400ms | Single CTE, remote DB |
| Scan submission | 500–2,000ms | Flask 30s timeout maximum |
| Session verification | 50–150ms | Firebase Admin network call |
| PDF generation | 3,000–8,000ms | Puppeteer Chromium cold start |
| AI summary generation | 5,000–30,000ms | Streaming, depends on response length |

The dominant latency factor for all database-dependent operations is the geographic distance between the Vercel function region (Washington DC by default) and the VPS (Hostinger, typically EU). Each query incurs approximately 180–250ms of round-trip network overhead. The single-CTE dashboard query converts what would otherwise be 8 × 200ms = 1,600ms of sequential queries into a single 200–400ms call.

### 18.2 Throughput Capacity

| Layer | Capacity |
|---|---|
| Vercel serverless | Effectively unlimited for concurrent requests; constrained by Vercel plan function limits |
| PostgreSQL connection pool | 8 concurrent connections per Vercel function instance |
| Flask concurrent scans | 5 concurrent active scans across all users |
| Flask rate limit | 100 requests per IP per hour |
| Middleware rate limit | 10 auth requests / 100 API requests per IP per minute |

### 18.3 Bundle Size

Post-cleanup production build metrics:

| Route | Page Size | First Load JS |
|---|---|---|
| `/` (landing) | 6.4 kB | 119 kB |
| `/dashboard` | 118 kB | 231 kB |
| `/dashboard/scans/[tool]/[id]` | 59.6 kB | 192 kB |
| `/login` | 144 B | 244 kB |
| `/subscription` | 6.97 kB | 122 kB |
| Shared JS (all routes) | — | 102 kB |

The `/login` page size of 144 bytes indicates that the auth form is lazily loaded, contributing to fast initial render. The `/dashboard` size of 118 kB includes the Recharts library loaded for the chart components.

*[Insert Fig. 18.1 — Scalability Architecture Diagram here]*

*Fig. 18.1: Scalability Architecture — Current capacity boundaries and recommended scaling path for Phase 2*

*[Insert Fig. 18.2 — Multi-Tenant Data Isolation Diagram here]*

*Fig. 18.2: Multi-Tenant Data Isolation — user_uid scoping across all tables and Flask job ownership*

*[Insert Fig. 18.3 — Cost vs. Usage Optimization Diagram here]*

*Fig. 18.3: Cost vs. Usage Optimization — Infrastructure cost structure and built-in efficiency measures*

---

## 19. Glossary

**Atomic increment:** A database operation that combines a read-and-conditional-write into a single statement, preventing race conditions. Used throughout the usage tracking system via `INSERT ... ON CONFLICT DO UPDATE ... WHERE col < limit RETURNING col`.

**classifyScan():** The TypeScript pure function in `src/lib/scan-classifier.ts` that determines whether a scan should count against deep or light usage quotas, based on the submitted parameters. No database access.

**Cold start:** The latency overhead incurred when a serverless function is invoked after a period of inactivity, requiring the Node.js runtime and application modules to be loaded from scratch. Mitigated through singleton patterns for database pool and Firebase Admin.

**CTE (Common Table Expression):** A named subquery defined using `WITH ... AS (...)` in SQL. Used in the dashboard init query to compute eight distinct aggregations in a single round trip.

**Deep scan:** A scan classification indicating the tool invocation is intensive, aggressive, or resource-heavy. Consumes `deep_scans_used` quota. Examples: nmap with full port range, nuclei with CVE tags, sqlmap with level >= 3.

**HMAC-SHA256:** Hash-based Message Authentication Code using SHA-256. Used to verify Razorpay webhook signatures and Flask API key authentication. Provides cryptographic proof of message origin.

**Idempotency key:** A unique value associated with an operation that allows the system to detect and safely ignore duplicate requests, producing the same result regardless of how many times the operation is submitted.

**Light scan:** A scan classification indicating the tool invocation is passive, reconnaissance-focused, or low-impact. Consumes `light_scans_used` quota. Examples: nmap with top-100 ports, nuclei with critical/high severity only, headeraudit.

**normalizeParams():** The parameter normalization function that maps tool-specific parameter key variants (e.g., `scan_level`, `depth`, `scope`) to canonical names before classification rules are applied.

**pending_plan_id:** A field on `user_subscriptions` that stores the ID of a downgrade plan to be applied at the end of the current billing period. The current plan remains active until `expires_at`.

**Soft delete:** A deletion mechanism that sets a `deleted_at` timestamp rather than removing the row. Soft-deleted records are excluded from all user-facing queries by `WHERE deleted_at IS NULL`.

**SSRF (Server-Side Request Forgery):** An attack where a malicious target value causes the server to make requests to internal resources. Prevented by Flask's `validate_target()` function, which blocks private IP ranges and cloud metadata service addresses.

**TOCTOU (Time-of-Check/Time-of-Use):** A race condition where the state of a resource changes between the check that determines if an operation is permitted and the operation itself. Mitigated by the atomic SQL increment pattern.

**`timingSafeEqual()`:** A constant-time string comparison function from Node.js's `crypto` module. Used to prevent timing attacks on HMAC signature verification — returning at the same speed regardless of how many bytes match.

**usage_tracking:** The PostgreSQL table that records cumulative monthly scan usage per user per subscription period. Unique constraint on `(user_uid, period_start)`.

**daily_usage:** The PostgreSQL table that records per-calendar-day scan usage. Each row represents one user on one calendar day. New rows are created on each new calendar day.

**xmax:** A PostgreSQL system column present on every row. A value of 0 indicates no concurrent update is pending, effectively meaning the row was freshly inserted (no competing transaction has modified it). Used in `user.service.ts` to detect first-time user creation versus update, for the purpose of sending a welcome notification only on initial registration.

---

## 20. Diagram Index

The following table maps each diagram figure to its originating file and section. All diagrams were generated in Mermaid format optimized for dark backgrounds (`%%{init: {'theme': 'dark'}}%%`).

| Figure | Title | Section | Source File |
|---|---|---|---|
| Fig. 1.1 | Overall System Architecture | 3.1 | `01-architecture-lld.md` |
| Fig. 1.2 | Frontend–Backend Interaction Flow | 3.2 | `01-architecture-lld.md` |
| Fig. 1.3 | Microservice Interaction Diagram | 3.3 | `01-architecture-lld.md` |
| Fig. 1.4 | Deployment Architecture Diagram | 3.4 | `01-architecture-lld.md` |
| Fig. 1.5 | Network Topology Diagram | 3.5 | `01-architecture-lld.md` |
| Fig. 1.6 | Environment Separation Diagram | 3.6 | `01-architecture-lld.md` |
| Fig. 4.1 | Authentication Flow Diagram | 4.1 | `04-security-devops.md` |
| Fig. 4.2 | Session Validation Flow | 4.3 | `04-security-devops.md` |
| Fig. 4.3 | OTP Verification Flow | 4.4 | `04-security-devops.md` |
| Fig. 5.1 | Routing Flow Diagram | 5.1 | `01-architecture-lld.md` |
| Fig. 5.2 | Middleware Execution Flow | 5.2 | `01-architecture-lld.md` |
| Fig. 6.1 | Backend Module Structure Diagram | 6.1 | `01-architecture-lld.md` |
| Fig. 6.2 | Frontend Component Hierarchy | 6.3 | `01-architecture-lld.md` |
| Fig. 7.1 | Entity Relationship Diagram | 7.1 | `03-scan-execution-database.md` |
| Fig. 7.2 | Table Relationship Mapping | 7.1 | `03-scan-execution-database.md` |
| Fig. 8.1 | Scan Execution Lifecycle | 8.1 | `03-scan-execution-database.md` |
| Fig. 8.2 | External Tools Integration Flow | 8.3 | `03-scan-execution-database.md` |
| Fig. 8.3 | Tool Routing Logic Diagram | 8.4 | `03-scan-execution-database.md` |
| Fig. 8.4 | Failure Recovery Flow | 8.5 | `03-scan-execution-database.md` |
| Fig. 8.5 | Concurrent Scan Handling | 8.5 | `03-scan-execution-database.md` |
| Fig. 8.6 | Scan Polling Mechanism Flow | 8.6 | `03-scan-execution-database.md` |
| Fig. 9.1 | Scan Type Classification Flow | 9.2 | `02-payment-subscription-usage.md` |
| Fig. 10.1 | Razorpay Payment Flow | 10.1 | `02-payment-subscription-usage.md` |
| Fig. 10.2 | Webhook Handling Flow | 10.2 | `02-payment-subscription-usage.md` |
| Fig. 10.3 | Subscription Lifecycle Diagram | 10.3 | `02-payment-subscription-usage.md` |
| Fig. 10.4 | Upgrade vs. Downgrade Logic | 10.4 | `02-payment-subscription-usage.md` |
| Fig. 10.5 | Invoice Generation Flow | 10.5 | `02-payment-subscription-usage.md` |
| Fig. 10.6 | Plan Mapping Diagram | 10.5 | `02-payment-subscription-usage.md` |
| Fig. 11.1 | Monthly Usage Tracking Flow | 11.1 | `02-payment-subscription-usage.md` |
| Fig. 11.2 | Daily Rate Limiting Flow | 11.1 | `02-payment-subscription-usage.md` |
| Fig. 11.3 | Atomic Usage Enforcement | 11.2 | `02-payment-subscription-usage.md` |
| Fig. 11.4 | Overuse Prevention Flow | 11.3 | `02-payment-subscription-usage.md` |
| Fig. 11.5 | Usage Reset Cycle Diagram | 11.4 | `02-payment-subscription-usage.md` |
| Fig. 12.1 | Dashboard Data Aggregation Flow | 12.1 | `05-ux-product-bonus.md` |
| Fig. 13.1 | API Security Architecture | 13.1 | `04-security-devops.md` |
| Fig. 13.2 | SSRF and Injection Protection Flow | 13.2 | `04-security-devops.md` |
| Fig. 14.1 | CI/CD Pipeline Diagram | 14.1 | `04-security-devops.md` |
| Fig. 14.2 | Cron Job Execution Flow | 14.4 | `04-security-devops.md` |
| Fig. 14.3 | Environment Variables Flow | 14.5 | `04-security-devops.md` |
| Fig. 14.4 | Caching Strategy Diagram | 14.6 | `04-security-devops.md` |
| Fig. 15.1 | Failure Scenario Handling | 15 | `04-security-devops.md` |
| Fig. 15.2 | Retry and Idempotency Flow | 15.7 | `04-security-devops.md` |
| Fig. 15.3 | Cold Start Handling Diagram | — | `04-security-devops.md` |
| Fig. 16.1 | Notification System Flow | 16.1 | `05-ux-product-bonus.md` |
| Fig. 17.1 | Profile Completion Logic | 17.1 | `05-ux-product-bonus.md` |
| Fig. 17.2 | Account Deletion Flow | 17.2 | `05-ux-product-bonus.md` |
| Fig. 18.1 | Scalability Architecture | 18.2 | `05-ux-product-bonus.md` |
| Fig. 18.2 | Multi-Tenant Data Isolation | 18.2 | `05-ux-product-bonus.md` |
| Fig. 18.3 | Cost vs. Usage Optimization | 18.2 | `05-ux-product-bonus.md` |
| Fig. A.1 | Arsenal Wordlist Fetch Flow | — | `05-ux-product-bonus.md` |
| Fig. A.2 | DFD Level 1 | — | `03-scan-execution-database.md` |
| Fig. A.3 | DFD Level 2 | — | `03-scan-execution-database.md` |
| Fig. A.4 | Audit Logging Flow | — | `03-scan-execution-database.md` |

---

*This document covers all systems implemented during the current development phase. Architecture decisions, implementation constraints, and operational boundaries described herein reflect the production state of the codebase at time of handover.*

*For questions regarding this documentation, refer to the source code repository and the five diagram source files in the `docs/` directory.*
