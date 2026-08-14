# Flat-Rate Coupon Calculator

Start here. This folder is the whole tool and everything needed to own it.

## What it does

The concierge flow at `/book/best-care-guarantee` quotes a customer a flat price before any Pro is matched. The matched Pro charges their own rate. Yourgi absorbs the difference by issuing the customer a coupon. This tool computes that coupon.

The coupon is not the difference between the two rates. Three things pull them apart:

1. The 5% service fee applies to Yourgi's flat rate on one side and the Pro's rate on the other. A $20 flat rate against a $25 Pro rate gives $21 and $26.25, so the coupon is $5.25 rather than $5.
2. Pros discount additional pets, commonly 10% to 50%. The flat quote charges full price for every pet. On multi-pet orders this often flips the sign and no coupon is needed at all.
3. Taxes render below the coupon line on the receipt. If tax is computed on the post-coupon base, solving for a target total is division rather than subtraction.

Getting it wrong is asymmetric. Under-covering breaks a stated price guarantee in front of a customer who already agreed to it. Over-covering costs Yourgi margin silently.

Design rationale and the API research behind it live in `Coupon Calculator Design.md`, one folder up.

## Status

The math works and is covered by tests. Two assumptions underneath it have never been checked against a real booking, so every figure the tool produces is labeled provisional. Closing those two is the next owner's first job. See `VERIFY.md`.

## Running it

**macOS.** Double-click `open-calculator.command`. A terminal window opens and your browser follows. Closing the terminal window stops it.

**Windows.** Double-click `open-calculator.bat`. Same behavior. Requires Python 3, which ships with most work images. If Windows shows a security prompt for an unrecognized script, choose "More info" then "Run anyway".

**Do not open `coupon-calculator.html` by double-clicking it.** The page loads, but the "Find Pros" button fails with `Failed to fetch`. Browsers refuse cross-origin requests from `file://` pages regardless of what the server permits, and this tool reads Pro rates from the Yourgi search API. The launchers exist to serve the page over `http://localhost`, which the browser accepts.

If the search still fails after using a launcher, check that you are on the corporate network and that `api.destpet.net` resolves.

## The two unverified assumptions

Both are named in the banner at the top of the tool, and both ride along in the summary you copy into a ticket.

**Where tax sits relative to the coupon.** The receipt shows Coupon above Taxes, but display order is not computation order. The tool ships with the tax rate set to 0%, where all the candidate formulas agree. If marketplace bookings do carry tax, the shipped figure is wrong.

**Whether a multi-day order becomes multiple appointments.** The tool treats multi-day daycare and dog walking as one appointment per day, each carrying its own 5% service fee and needing its own coupon code. Chris ruled that as the intended product behavior on 2026-08-07. Nobody has confirmed the system actually does it. If a multi-day order creates one appointment for the whole range, the coupon count is wrong by a factor of N and the fee base is wrong too.

Both close on one test each, written up as a worksheet in `VERIFY.md`. Recording a result is a three-field edit to the `VERIFICATION` block near the top of the script in `coupon-calculator.html`. The banner clears itself and the provenance shows in its place.

## Checking the math

Open the tool and add `?selftest=1` to the URL, or go straight to `http://localhost:8777/coupon-calculator.html?selftest=1` once a launcher is running. 57 checks covering the quote formula, the day-count rules, the Pro-side reconstruction, both tax modes, the per-day split, discount parsing, and the Teams message parser.

Expected values are hand-computed from the formulas in `Coupon Calculator Design.md`, not captured from the code's own output. A snapshot of current behavior would enshrine any bug it already has.

Run it after any edit to the rate table, to `SPLITS_PER_DAY`, or to anything under the "Pure core" heading in the script. A failure means either a formula changed or a rate did. Fix the code, or change the expectation and record why in this file.

## Maintaining the rate table

The tool holds its own copy of the flat rates that the live page charges: Boarding $50/night, Daycare $40/day, House Sitting $50/night, Dog Walking $20/walk. These come from `data-r` attributes in the footer custom code on `/book/best-care-guarantee` and can be changed there without anyone touching this folder.

Two safeguards, neither of which is a substitute for checking:

- Pasting a Teams message whose priced rate disagrees with the table raises a drift warning and uses the message's figure, because that is what the customer agreed to.
- The footer shows how old the rate table is. Past 90 days it says so in red.

`RATES_AS_OF` near the top of the script is the date the table was last compared against the live page. Update it whenever you check, whether or not anything changed.

## Getting off localhost

A launcher on each agent's machine is fine for a handful of orders a week and poor at any real volume. Four ways forward, with what each actually costs.

### The one fact that makes hosting possible

`POST api.destpet.net/center/v5/center/search` needs no credentials and returns `access-control-allow-origin: *`. Any page on any host can call it. That is why a static HTML file with no backend can price a Pro.

Re-check it in one line before committing to any hosted option:

```
curl -si -X OPTIONS https://api.destpet.net/center/v5/center/search \
  -H "Origin: https://example.com" -H "Access-Control-Request-Method: POST" | grep -i access-control-allow-origin
```

Confirmed `*` on 2026-08-10. If that header ever narrows to a domain allowlist, every hosted static copy stops working at the same moment and the tool needs a server-side proxy. It is the single dependency worth watching.

### Option 1: a static host

Upload the HTML and open a URL. The tool works unchanged, live Pro search included.

AWS S3 behind CloudFront is the path with in-house competency, since the DP4W web build settled on AWS hosting in July. Ask Carlos. A hidden `noindex` sub-page on the Webflow marketing site also works and has precedent in this project family, since the Webflow Search Widget used exactly that as a staging surface. The drawback is that it lives on the public marketing site.

**The decision this forces is authentication.** The page exposes Yourgi's flat-rate table and the coupon logic, which is margin math. Either put it behind whatever SSO the team already uses, or decide that an unlisted URL is acceptable exposure. That call belongs to Kai.

Also name one person who redeploys when the live page rates change. A hosted copy and this folder drift apart silently, and the 90-day staleness notice is the only thing that will say so.

### Option 2: a Claude artifact

Workable, with one regression that matters.

Published artifacts run under a content security policy that blocks network requests to any external host. The only sanctioned exception reaches claude.ai connectors, and no Yourgi search connector exists. Checked against the available capability set on 2026-08-10. **An artifact cannot call the search API.**

The tool still runs in that state, because the Overrides panel already accepts a Pro rate and an additional-pet discount typed by hand. What is lost is the lookup.

That loss is worse than it sounds. The design deliberately blocks rather than defaults when a Pro's additional-pet policy will not parse, because assuming 0% overstates the coupon and costs Yourgi money on every multi-pet order. Moving that field from "read off the Pro's profile" to "typed by an agent under time pressure" reintroduces the exact error the tool was built to prevent. Real policies vary from 10% to 50% between Pros.

It also requires the concierge team to hold claude.ai seats, which has not been confirmed.

### Option 3: build it into the product

The version that makes this folder obsolete, and the only one that removes error rather than relocating it.

Authenticated, `POST app/v2/pro/booking/estimate` returns the real pre-coupon total. Every reconstruction in this tool exists only because that endpoint returns 401 without a session and needs `globalPetId[]` and `addressId`, which are real pet records and a saved address that a concierge order does not have. Inside the product those exist. The Pro rate, the additional-pet discount, and the 5% fee stop being reconstructed and become a single read, and every reconstruction bug goes with them. The rate table stops drifting because the quote and the charge come from the same system. Hosting and authentication stop being questions.

The cost is engineering time, and it depends on the coupon-issuance question below being answered first.

The trigger to argue for it: concierge volume outgrowing manual coupon issuance, or the reconstruction being wrong once in front of a customer.

### Option 4: stay on localhost

Still legitimate at low volume. No infrastructure, no authentication question, no deploy owner.

The cost is that every agent needs Python 3 and the launcher, and a machine without Python fails with no useful message.

### What to decide

1. Which host, or none.
2. Whether the page needs authentication. Ask Kai.
3. Who redeploys when the rates change.
4. Whether the artifact path's hand-entry regression is acceptable, if that route is taken.

## Open questions this tool does not answer

Carried forward from `Coupon Calculator Design.md`. The first two gate whether the output is usable at all.

| Question | Owner | State |
|---|---|---|
| Who issues the coupon code, and does that surface accept an arbitrary cent-level amount? A five-walk order needs five identical codes, or one reusable code capped at five uses. | Kai | Open |
| Do add-ons count against the flat-rate promise, or bill on top of it? | Kai | Open |
| Is the flat quote meant to be tax-inclusive? The page shows a flat rate with no asterisk. | Kai | Open |
| Is tax computed before or after the coupon, and is it nonzero on marketplace bookings? | Chris | Open, and testable. See `VERIFY.md`. |

## Known limits

- **Centers are excluded from reconstruction.** For centers the search API returns a price floor rather than a rate, and it comes back as 0 on roughly half of all center service entries. The tool detects centers and tells you to use the pasted-estimate override instead.
- **Holiday fees are not priced.** `holidayFee` is policy prose with no dates attached. If any date in the order is a holiday, the tool warns and you add it by hand.
- **Add-ons are out of scope.** Anything the concierge attaches after the fact is not in the quote or the reconstruction.
- **A cheaper Pro produces no coupon by design.** Chris ruled on 2026-08-07 that the customer is charged the lower amount and told we found a Pro below the quoted price and honored it. The tool says so and gives the agent that line.
- **Nothing here writes to any Yourgi system.** The tool reads the public search API and does arithmetic. Issuing the coupon is a manual step elsewhere.

## Files

| File | What it is |
|---|---|
| `README.md` | This file. |
| `VERIFY.md` | The two blocker tests, as a worksheet. First job for the next owner. |
| `RUNBOOK.md` | One page for the concierge agent. Hand this over once the blockers close. |
| `coupon-calculator.html` | The tool. Self-contained, no dependencies, no build step. |
| `open-calculator.command` | macOS launcher. |
| `open-calculator.bat` | Windows launcher. |
| `make-handoff-zip.command` | Packages this folder as a zip for handing over. |
