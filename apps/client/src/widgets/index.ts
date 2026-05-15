/**
 * Widget Library - Standalone broadcast overlay widgets
 * 
 * Each widget is self-contained with all sub-components.
 * Overlay pages just position/compose these widgets on a canvas.
 * 
 * Structure:
 * - shared/       - FontStyles and common utilities
 * - scoreboard/   - Match scoreboard with animations
 * - lineups/      - Team lineup formations
 * - standings/    - Live league standings table
 * - stats/        - Match statistics comparison
 * - ticker/       - Rotating match ticker carousel
 * - tipee/        - Donation/subscription alerts
 */

// Shared
export { FontStyles } from "./shared/FontStyles";

// Scoreboard
export { ScoreboardWidget, type ScoreboardWidgetProps } from "./scoreboard";

// Lineups
export { LineupsWidget, type LineupsWidgetProps } from "./lineups";

// Standings
export { LiveStandingsWidget, type LiveStandingsWidgetProps } from "./standings";

// Stats
export { StatsWidget, type StatsWidgetProps } from "./stats";

// Ticker
export { LiveTickerWidget, type LiveTickerWidgetProps, type GoalAlert } from "./ticker";

// Tipee alerts
export {
  TikTokIcon,
  Particles,
  SocialCapsule,
  BrandPopup,
  TipeeAlertTier1And2,
  TipeeAlertTier3,
  type TipeeAlertTier1And2Props,
  type TipeeAlertTier3Props,
} from "./tipee";
