# AutoHonorV3 — Best Performance

An automatic honor plugin for League of Legends, built for Pengu Loader.

AutoHonorV3 automatically selects teammates to honor based on their in-game performance, using a Contribution Score system inspired by SnoozeFest.

Instead of selecting teammates randomly or relying only on KDA or gold, AutoHonorV3 evaluates multiple performance metrics to rank eligible teammates.

## Features

- **Automatic Honors** — Automatically submits honors after a match.
- **Best Performance Ranking** — Ranks teammates using a performance-based scoring system.
- **Role-Aware Scoring** — Supports Carry, Enchanter, and Tank performance profiles.
- **Multiple Performance Metrics** — Considers KDA, damage, kill participation, gold, and other role-relevant statistics.
- **Automatic Teammate Selection** — Prioritizes eligible teammates with the highest scores.
- **Debug Reports** — Provides information about rankings and honor submissions.
- **Pengu Loader Integration** — Runs within the League of Legends client.

## How It Works

After a match, AutoHonorV3:

1. Retrieves available post-game statistics.
2. Identifies eligible teammates.
3. Calculates a Contribution Score for each player.
4. Ranks teammates by performance.
5. Selects the highest-ranked eligible players.
6. Submits honors through the League Client API.

### Contribution Score

The scoring system uses different performance profiles:

| Profile | Performance Factors |
|---|---|
| Carry | KDA, champion damage, kill participation, kill share, gold |
| Enchanter | Kill participation, healing/shielding, KDA, gold, damage |
| Tank | KDA, kill participation, gold, damage, tankiness |

Scores are calculated relative to the match statistics, allowing the plugin to compare player contributions within the same game.

## Installation

1. Install Pengu Loader.
2. Download the AutoHonorV3 JavaScript plugin.
3. Place `AutoHonorV3.js` in your Pengu Loader plugins directory.
4. Ensure that any previous AutoHonor versions are disabled to avoid conflicts.
5. Restart the League of Legends client.

## Debugging

Open the League Client DevTools using `Ctrl + Shift + I` and navigate to the Console tab.

### Check Plugin Availability

```javascript
typeof AutoHonorV3
```

### View the Latest Report

```javascript
AutoHonorV3.report()
```

### View Performance Rankings

```javascript
console.table(AutoHonorV3.report()?.ranking)
```

Depending on the installed build, the report may include:

- Player names and PUUIDs
- Contribution Scores
- KDA and gold
- Performance rankings
- Honor submission responses
- HTTP status codes

### Understanding Honor Submission Status

An HTTP `204` response indicates that the League Client API accepted the request.

A report status of `submitted-unverified` means that the request was accepted but the plugin has not independently confirmed the final honor state.

## Example Performance Ranking

| Rank | Player | Contribution Score |
|---|---|---|
| 1 | Player A | 8.3 |
| 2 | Player B | 7.1 |
| 3 | Player C | 5.0 |
| 4 | Player D | 4.7 |

*Illustrative example. Actual scores depend on match statistics.*

## Compatibility

- League of Legends Client
- Pengu Loader
- JavaScript plugin environment

Compatibility with every League Client version is not guaranteed. Riot Games may change internal APIs.

## Credits

**Authors:** Elaina & BerNNas & SnoozeFest

**Performance Scoring:** Inspired by SnoozeFest's Contribution Score system.

**Acknowledgments:** Pengu Loader and the League of Legends plugin development community.

## Disclaimer

AutoHonorV3 is an unofficial community-developed plugin.

It is not affiliated with, endorsed by, or sponsored by Riot Games.

League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc.

Use at your own discretion.
