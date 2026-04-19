# ASTRA API URL Migration Policy

This document outlines the standard protocol for migrating the ASTRA backend to a new URL/domain to prevent "bricking" older app versions.

## 1. Redirection Grace Period
-   **Mandatory Proxy**: The old URL must remain active for at least **7 days** after the new URL goes live.
-   **301 Redirects**: All traffic to the old URL should be redirected (HTTP 301) to the new URL.
-   **Version Check Proxy**: If a full redirect is not possible, the `/api/version` endpoint on the old URL **must** remain functional and return the new URL in its response.

## 2. Pre-Migration Notification
-   **Broadcast**: Send a high-priority push notification to all users at least 24 hours before switching URLs.
-   **Message**: "ASTRA is moving to a more stable server! Please ensure you have the latest version (vX.X.X+) to avoid connectivity issues."

## 3. Fallback Mechanism (Planned for v4.0)
-   The app should check a static secondary source (e.g., a raw JSON file on GitHub Pages) if the primary `API_BASE` fails.
-   This "Discovery Service" will provide the current valid `API_BASE`.

## 4. Current Status
-   **Current API**: `https://astra-backend-production-a16d.up.railway.app`
-   **Deprecated API**: `https://astra-backend-production-e996.up.railway.app` (Inactive since 2026-04-16)
