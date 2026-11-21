## 1.1.5 — Ranked Solo/Duo only

- Require confirmed queue ID 420 from the gameflow session before applying any DK aliases.
- Preserve real nicknames in Ranked 5s, Flex, and all other or unknown queues.
- Restore aliases when queue is no longer confirmed as Solo/Duo.
- Expose queue ID and queue-blocking reason in diagnostics.
- Preserve v1.1.4 performance tuning and role/self protections.

## v1.1.4 — Champion Select fluidity

- Debounce DOM updates at 120 ms and throttle repeated scans to 160 ms.
- Parse role/innerText only for the allied half of the verified ten-banner layout.
- Filter embedded chat observer events to relevant sender and system labels.
- Reduce fallback repair frequency to 12 seconds.
- Keep immediate first application, role checks, and self-banner protection unchanged.

## 1.1.4
- Faster first confirmed Champion Select DOM pass; shorter debounced follow-up.
- DEBUG disabled by default; status timing retained.
- Scoped Riot ID cleanup for join/leave lobby notifications.
- Preserved role, team-boundary, self-name and chat alias safeguards.

# Changelog

## 1.1.1

- Console diagnostics only (`DEBUG=true` at the top of `index.js`): logs `session`, `slots` and `result`; `__plainChatRevamp.status()` also available. No logic changes.

## 1.1.0 — PlainChat Revamp

- Renamed plugin and metadata; authors: BerNNas & ChatGPT.
- Changed local-player banner to read-only; uses actual League nickname as identity evidence.
- Prevented old pick-order associations from being reused across Champion Select sessions.
- Applied DK names by validated roles rather than visual pick order.
- Allowed partial banner updates while protecting unknown and real names.
- Added protection for staggered role swaps and 404 session exit.
- Preserved chat message bodies and added limited tag cleanup for sender labels outside Champion Select.
- Included five automated test suites and explicit known limitations.

## 1.1.2 — Live Champion Select DOM compatibility
- Fixed role detection when `.summoner-secondary-text` only displays `Banning...` but the role appears as an exact line in the banner's `innerText`.
- In the observed 10-container layout, only the first five allied banners are eligible, and only when the local player's self marker/name confirms that half. Enemy banners are never renamed.
- Unique `is-self` marker with a real displayed name remains valid even when LCU `gameName` differs from the displayed client label; own banner is never written.
- Added regression test mirroring the user's actual Champion Select diagnostic output.
- No role inference from pick order; only the team boundary uses the observed layout, with a self-check.
- Still requires live client validation. Debug logging remains enabled for diagnosis.
