# Betting Links Status & Investigation

## Current State

The application uses The Odds API's `includeLinks=true` parameter to fetch deep links from sportsbooks. These links are properly:
- Requested from the API
- Passed through the data processing pipeline
- Rendered in the UI components

## The Issue

Users report that betting links previously auto-populated bets in sportsbooks, but this functionality appears to have stopped working.

## Technical Investigation

### What The Odds API Provides

The `includeLinks=true` parameter adds `link` fields at three levels:
1. **Outcome level** (`outcome.link`) - Most specific
2. **Market level** (`market.link`) - Market page
3. **Bookmaker level** (`bookmaker.link`) - Event page

Our code uses the most specific link available (outcome → market → bookmaker).

### Sportsbook Deep Link Capabilities

Different sportsbooks have different URL capabilities:

#### DraftKings
- Event pages: ✅ Supported via API links
- Bet slip population: ❓ Unknown if supported via URL parameters
- Notes: URL structure may have changed

#### FanDuel
- Event pages: ✅ Supported via API links  
- Bet slip population: ❓ Unknown if supported via URL parameters
- Notes: May require account-specific tokens

#### BetMGM
- Event pages: ✅ Supported via API links
- Bet slip population: ❓ Unknown if supported via URL parameters  
- Notes: Complex URL structure

#### Other Books
- Similar limitations likely apply to Caesars, PointsBet, BetRivers, etc.

## Possible Causes

1. **The Odds API Changed Link Format**
   - API may have reduced link specificity
   - Sportsbook integrations may have changed

2. **Sportsbooks Changed URL Structure**
   - Books frequently update their platforms
   - URL patterns change without notice
   - Bet slip population may have been disabled for security

3. **Browser Extension Was Being Used**
   - User may have had an extension that enhanced links
   - Extension may have stopped working or been removed

4. **Different API Tier**
   - Premium tiers of The Odds API may provide better links
   - Some features may require direct sportsbook partnerships

## Potential Solutions

### Short-term
- ✅ Provide clear user messaging about manual bet entry
- ✅ Continue using best available deep links from API
- ⏳ Add diagnostic logging to see what links we receive
- ⏳ Collect user feedback on which books worked before

### Long-term  
- Research sportsbook-specific URL construction
- Contact The Odds API about link capabilities
- Investigate sportsbook affiliate programs for better links
- Consider browser extension development for auto-population

## User Action Items

If you previously experienced automatic bet slip population:
1. Which sportsbook(s) did it work with?
2. What device/browser were you using?
3. Were you using any browser extensions?
4. Approximately when did it stop working?

This information will help us investigate and potentially restore the functionality.

## Code References

- `lib/odds-api.ts` - API requests with `includeLinks=true`
- `lib/odds-utils.ts` - `getDeepestBookmakerLink()` function
- `components/BookOpenLink.tsx` - Link rendering
- Commit `1b51abf` - Original deep link implementation (May 2026)
