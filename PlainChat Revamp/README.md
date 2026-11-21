# PlainChat Revamp

**Version:** 1.1.5  
**Authors:** BerNNas & ChatGPT  
**Description:** Role-aware DK aliases for League of Legends Champion Select, with strict local-player protection, safe chat-label cleanup, and low-overhead lifecycle management.

A Pengu Loader plugin, developed as a rework of the plainChat concept. The original plainChat project is credited under **Acknowledgements** below. This is a local visual modification; it does not modify the game server or gameplay.

## Queue safety (v1.1.5)

DK aliases are enabled **only** after the LCU gameflow session confirms queue ID **420 (Ranked Solo/Duo)**. Ranked Flex, Ranked 5s, normal modes, and unknown or unavailable queues leave original nicknames intact in banners, chat, and notifications. Queue is revalidated on LCU refresh. If the queue changes or becomes unconfirmed, aliases are restored. Queue validation uses `/lol-gameflow/v1/session` and fails closed. Check `__plainChatRevamp.status().queueId` and `.diagnostics.reason`.

## Champion Select aliases

| Confirmed role | Displayed name for an ally |
| --- | --- |
| TOP | DK Doran |
| JUNGLE | DK Kanavi |
| MID / MIDDLE | DK ShowMaker |
| BOT / BOTTOM / ADC | DK Smash |
| SUPPORT / UTILITY | DK Delight |

**Your own banner is never rewritten.** The League Client already shows your real nickname. The plugin identifies it by its existing text where possible, and also uses a verified self marker or cell ID when available. It does **not** identify the local player from pick order. If identity is uncertain, it skips DK replacements instead of guessing.

Anonymous Champion Select placeholders recognized: **Gromp, Murk Wolf, Raptor, Krug, Scuttle Crab**. Their pick-order sequence is not used to assign roles. Only allied banners with a confirmed role and an anonymous placeholder are replaced. Unknown real player names are preserved.

## What changes in 1.1.0

- Project renamed **PlainChat Revamp**; author metadata set to **BerNNas & ChatGPT**.
- Corrects the old bug where the local player's real nickname could appear on another banner after changing pick order between games. The plugin does not write your nickname to any banner.
- Roles are read from `.summoner-secondary-text` in each `.summoner-container`, cross-checked with LCU `/lol-champ-select/v1/session` where possible; no role guessing from pick order.
- Supports partial role information: confirmed allies can be renamed even when another role is still loading.
- Role swaps restore previous aliases and apply new aliases only when LCU and DOM evidence agree.
- Rebuilds associations for each Champion Select and clears them when leaving it.
- Maps chat sender names to DK aliases only when their original anonymous label unambiguously matches a processed banner; message bodies are not rewritten.
- Safely removes Riot ID tags from chat sender labels outside Champion Select via lightweight periodic checks. This does **not** mean every possible post-game UI label is cleaned.
- Uses WebSocket session/phase events when available, with polling fallback, a debounced DOM observer only during Champion Select, and explicit cleanup.
- Internal diagnostics exposed by the engine (`status().diagnostics`) for automated testing; not a user-facing diagnostic panel.

## Installation

1. Close the League Client and disable/remove previous `plainChat`, `plainChat DK`, and `PlainChat Revamp` plugin copies to avoid conflicts.
2. Extract the ZIP into the **Pengu Loader plugins** folder, preserving the `PlainChat-Revamp` directory.
3. Restart the League Client with Pengu Loader enabled.
4. Check the lobby and Champion Select. Prefer a non-ranked validation first.

Expected layout:

```text
plugins/
  PlainChat-Revamp/
    index.js
    README.md
    CHANGELOG.md
    tests/  (optional; not required by Pengu Loader)
```

## Known limitations

- **Banners and a SUPPORT chat sender have been validated in a real ranked Champion Select**, as reported with screenshots. Role swaps are not yet validated, and delay/performance improvements still need measurement.
- The anonymous sender name in Champion Select chat must match an anonymous banner label for DK replacement. No artificial `Ally 1`–`Ally 4` aliases are generated.
- Some client layouts may not expose the expected role markup; uncertain banners remain unchanged.
- The normal-lobby/post-game cleanup is deliberately limited to recognized chat sender-name elements. It does not rewrite chat messages, URLs, or arbitrary UI labels.
- Role labels are expected in English, as requested.
- The plugin is cosmetic and relies on undocumented League Client structures that can change after patches.

## Versioning

Initial Revamp release: **1.1.0**. Subsequent patch releases increment the last number one step at a time: **1.1.1**, **1.1.2**, **1.1.4**, and so on. No automatic version increment occurs until a new release is built.

## Testing

From the `tests` directory with Node.js:

```bash
node tests.mjs
node edge-tests.mjs
node role-tests.mjs
node additional-tests.mjs
node self-protection-tests.mjs
```

## Acknowledgements

Original **plainChat** by **tuxedocatsgoated**: https://github.com/tuxedocatsgoated/plain-chat. This Revamp release is authored by BerNNas & ChatGPT and credits the upstream inspiration separately; it does not claim to be the original upstream release.

### v1.1.2: role detection and team boundary
In the captured ranked Champion Select, `.summoner-secondary-text` sometimes contains `Banning...` rather than a role. The plugin now checks exact visible-text lines (`TOP`, `JUNGLE`, `MID`, `BOTTOM`, `SUPPORT`) as a fallback. It does not infer roles from pick order.

The captured UI had five allied `.summoner-container` elements followed by five enemy elements. This version uses that boundary **only** when the own banner is independently detected in the allied half. If the layout changes or the own banner cannot be confirmed, it leaves names unchanged rather than risking enemy or self renaming.

Debug is disabled by default in `index.js` (`DEBUG=false`). Set it to `true` only when collecting detailed logs. In DevTools use `__plainChatRevamp.status()` and look for `[PlainChat Revamp] slots` / `result` entries. Avoid sharing personal identifiers in logs.

The regression tests are simulations of the captured DOM, not proof of compatibility with every live ranked Champion Select.

### v1.1.4: faster first paint and focused cleanup
- First confirmed Champion Select session now reconciles immediately when the DOM is available, rather than waiting for the 120 ms debounce.
- Subsequent relevant DOM mutations use a 35 ms debounce. The existing polling fallback and role/self safety checks remain.
- DEBUG is off by default. `__plainChatRevamp.status()` remains available and includes `timing.lastReconcileMs` and `timing.lastAppliedAt`.
- Riot ID tags are stripped from structured `joined/left the lobby` system notifications without touching arbitrary system text or chat messages.
- The local player's banner is still read-only, including any parenthesized anonymous suffix.
- Real-client verification is required to determine whether the initial visual delay improved.
