# Closing the three blockers

A worksheet. Three tests, all closable in one booking session. Until they are recorded, every figure the calculator produces is labeled provisional and says so in the summary that gets pasted into tickets.

Work these before the concierge team uses the tool on a live order.

Tests 1 and 2 have been open since the tool was written. Test 3 was added on 2026-08-10 after the quote side was checked against production and found exact, which left the Pro side as the only reconstruction nobody had compared to a real receipt. Run all three on the same booking if you can.

## What already checks out, so you do not retest it

Verified against live production data on 2026-08-10. None of this needs a booking, and none of it is what the three tests below are for.

- **The rate table and the quote formula.** The live widget's `qty()` and `totalOf()` on `yourgi.com/book/best-care-guarantee` are line-for-line identical to the tool's `qtyOf` and `quoteOf`, and all four `data-r` rates match `FLAT`. Re-check whenever `RATES_AS_OF` goes stale.
- **`serviceCost` is a per-unit rate, not a total for the date range.** Confirmed by querying the same Pros at 1, 3 and 10 nights and at 1 and 2 dogs. The value does not move. This is why `chargeOf` multiplies rate by units.
- **The coupon closes the loop arithmetically.** Across 7,840 combinations of service, quantity, pets, Pro rate and discount, issuing the computed coupon lands the customer on the quoted total with zero drift.
- **Split quotes always divide evenly.** Daycare and dog walking both produce whole per-unit figures, so the uneven-division warning only fires on a hand-typed quoted total.
- **The additional-pet discount parser.** 282 Pros across 8 ZIPs and 4 services produced only five distinct policy strings, all on a fixed 10/20/30/40/50% template, all parsed. The blocking path is rare in practice.

## What you need first

- A test consumer account with at least one pet record and a saved address. The booking flow will not produce an estimate without both.
- Access to whatever surface issues coupon codes.
- A known Pro whose rate differs from the flat rate, so the coupon is nonzero. The tool's Pro list shows each Pro's rate, so pick one from there. Note that roughly 4 in 10 Pros price below the flat rate, which produces no coupon at all, so check the rate before you commit to a Pro.
- For Test 3, a Pro with a nonzero additional-pet discount, and a second pet on the account. Without both, the test cannot tell you what the fee is charged on.
- Permission to create and then cancel real bookings in whatever environment you are testing. If that is production, agree the cleanup step with Kai before starting.

Record which environment you used. A result from stage does not close a blocker about production billing unless someone confirms the tax and appointment logic is identical in both.

---

## Test 1: where tax sits relative to the coupon

### Why it matters

The receipt renders the Coupon line above the Taxes line. Display order is not computation order. If tax is computed on the post-coupon base, the coupon that lands a customer on the quoted total is `base − Q ÷ (1 + t)`, which is division. The tool currently ships assuming there is no tax at all, where every candidate formula agrees.

If marketplace bookings do carry tax, every coupon issued so far is short by roughly the tax amount, and the customer pays more than the price they were guaranteed.

### Steps

1. Pick an order. Single pet, boarding, two nights keeps the arithmetic easy to follow.
2. Run it through the calculator. Record three numbers: the quoted total `Q`, the pre-coupon base, and the computed coupon `C`.
3. Build the same booking in the product against the same Pro and the same dates. Stop at the payment screen. **Do not apply a coupon yet.**
4. Write down every line on the receipt: service cost, additional pet discount, holiday fee, subtotal, service fee, coupon, taxes, total.
5. Compare the receipt's pre-coupon figure (subtotal plus service fee) against the calculator's. If they disagree, stop here and record it. That is a reconstruction bug and a separate problem from tax.
6. Apply coupon `C`. Record the new total.

### Reading the result

| What you see | What it means | What to do |
|---|---|---|
| Final total equals `Q`, and the Taxes line was `$0.00` | Marketplace bookings carry no tax. The shipped assumption holds. | Record the result. Leave the tax rate at 0%. |
| Final total equals `Q`, and Taxes was nonzero | Tax is computed on the post-coupon base, and the tool's default already lands correctly. | Record the result. Set the tool's tax rate to the observed rate and the mode to "after the coupon". |
| Final total exceeds `Q` | Tax is being applied on top. Divide the Taxes figure by the pre-coupon base, then by the post-coupon amount. Whichever gives a clean tax rate is the base tax is computed on. | Set the tool's tax rate and mode to match. Re-run the order and confirm the new coupon lands on `Q`. Only then record it. |
| Final total is off in some other way | Something outside this test. | Do not record. Write down what you saw and raise it. |

### Pass criterion

The final total equals the quoted total exactly, using a coupon the tool produced with the tax settings you are about to record.

---

## Test 2: whether a multi-day order becomes multiple appointments

### Why it matters

The tool treats multi-day daycare and dog walking as one appointment per day. Each day carries its own 5% service fee, and each needs its own coupon. Boarding and house sitting are treated as a single date-range booking.

Chris ruled this as intended product behavior on 2026-08-07. That settled what the product should do. Nobody has confirmed what it does.

If a three-day daycare order actually creates one appointment for the range, then the tool tells the agent to issue three coupons where one is needed, and the fee base is wrong as well. The customer is overcharged or the order fails, depending on how the coupon surface behaves.

### Steps

1. Build a daycare booking for three consecutive days, one pet, against a known Pro.
2. Count the appointments the booking created.
3. Count the service-fee lines. One per appointment, or one for the order.
4. Count the coupon fields. One per appointment, or one for the order.
5. If there are three, try issuing the same code on all three. Record whether the surface accepts a code more than once, or needs three distinct codes.

### Reading the result

| What you see | What it means | What to do |
|---|---|---|
| Three appointments, three service-fee lines, three coupon fields | The assumption holds. | Record the result. |
| One appointment for the whole range | `SPLITS_PER_DAY` is wrong for daycare. | Remove `daycare` from `SPLITS_PER_DAY` in the script, re-run `?selftest=1`, update the expectations that fail, and note the change in `README.md`. Then re-test dog walking separately, since the two are not guaranteed to behave the same. |
| Three appointments but one shared fee, or one shared coupon | The per-booking denomination is wrong even though the split is real. | Do not record. This needs a formula change rather than a flag change. Raise it with Chris. |

Step 5 also answers the first open question in `README.md`, the one about whether the coupon surface takes an arbitrary cent-level amount and whether a five-walk order needs five codes or one reusable code capped at five uses. Write down what you find either way.

### Pass criterion

Three appointments, three service-fee lines, three coupon fields, and a recorded answer on whether one code can be reused.

---

## Test 3: whether the Pro-side reconstruction matches a real receipt

### Why it matters

Everything the tool computes about the Pro is reconstructed from the search API, because the endpoint that returns the real figure, `app/v2/pro/booking/estimate`, needs a session the concierge order does not have. The reconstruction makes three claims that no one has checked against an actual receipt:

1. The subtotal is the Pro's `serviceCost` multiplied by units, with the additional-pet discount applied only to pets after the first.
2. The 5% service fee is charged on the **discounted** subtotal, not the undiscounted one.
3. Both the subtotal and the fee are rounded to cents independently, then added.

Claim 2 is the expensive one. On a two-pet booking with a 20% discount, charging the fee on the undiscounted subtotal instead moves the pre-coupon base, and the coupon moves with it. Every multi-pet coupon issued would be wrong in the same direction, quietly, with no symptom the agent could see.

This test is not about tax and not about splitting. It stops at the pre-coupon base. Test 1 step 5 already asks you to compare that figure; this worksheet is the fuller version, with a multi-pet order that actually exercises the discount.

### Steps

1. Pick a Pro with a nonzero additional-pet discount and a rate above the flat rate. Record the rate and the discount percentage from the tool's Pro list.
2. Run a two-pet, two-night boarding order through the calculator. Two nights avoids the rounding artifact noted below. Record the four Pro-side lines: first pet, additional pet, subtotal, service fee, and the pre-coupon base.
3. Build the same booking in the product: same Pro, same dates, same two pets. Stop at the payment screen before applying any coupon.
4. Write down every line the receipt shows on the Pro side: service cost, additional pet discount, subtotal, service fee, and the pre-coupon total.
5. Compare line by line, not just the total. Two errors in opposite directions can produce a matching total and still be wrong.
6. Repeat once with a single pet. If the two-pet case disagrees but the one-pet case matches, the fault is in the discount handling rather than the rate or the fee.

### Reading the result

| What you see | What it means | What to do |
|---|---|---|
| Every line matches, both runs | The reconstruction holds. | Record the result. |
| Subtotal matches, fee does not, and the fee equals 5% of the **undiscounted** subtotal | Claim 2 is wrong. The fee base is the pre-discount figure. | Change `chargeOf` to compute the fee on `first + (petCount - 1) * rate * unitsPer`, re-run `?selftest=1`, update the expectations that fail, and note it in `README.md`. Every multi-pet coupon issued before this is understated. |
| Subtotal does not equal rate times units, one pet | `serviceCost` is not the figure actually charged. Possibly a platform markup or a stale rate. | Do not record. This invalidates the reconstruction outright and needs raising before the tool is used again. |
| The discount is applied to every pet, not just the additional ones | The discount model is wrong. | Change `chargeOf` so the discount applies to all pets, re-run the self-test, update `README.md`. |
| Totals match but individual lines do not | Two offsetting errors. | Do not record. Write down every line and raise it. |
| The pre-coupon base is off by exactly $0.50 on an odd-night order | Expected, and not this test's problem. See the note below. | Re-run on an even number of nights and read the result from that. |

### A known artifact, so you do not chase it

The live widget computes the quote as `Math.round(rate * nights * pets * 1.05)`. When `rate * nights * pets` is odd, the exact figure ends in `.5` and rounds up. A one-night, one-pet boarding quote is $53.00 rather than $52.50.

The customer is quoted $0.50 above a true 5% fee, and the coupon is $0.50 smaller to match. The tool copies this deliberately, because the customer was shown the rounded figure and that is what has to be honored. It is a pricing-page artifact, not a calculator error, and it only ever falls in Yourgi's favor. Use an even number of nights for this test so it does not muddy the comparison.

### Pass criterion

Every Pro-side line on the receipt matches the calculator, on both the two-pet and the one-pet run, with the fee demonstrably charged on the discounted subtotal.

---

## Recording a result

Open `coupon-calculator.html` in any text editor. Near the top of the `<script>` block is a `VERIFICATION` object. Fill in all three fields for the assumption you closed:

```js
tax: {
  label: "Tax position relative to the coupon line",
  claim: "Marketplace bookings carry no tax, so coupon = pre-coupon base − quoted total.",
  how:   "Book a real order, apply the computed coupon, confirm the final total equals the quote.",
  date: "2026-08-14", by: "J. Winters", booking: "#40122"
},
```

An empty `date` means the assumption is still open. Filling all three closes it.

Test 3 has no entry in that object yet. `renderBanner` and `openAssumptions` name `tax` and `split` explicitly, so adding a third key on its own would record the result without ever showing it. Closing Test 3 in the banner needs a `charge` entry in `VERIFICATION` and both of those functions taught to read it. Until that is done, record the Test 3 outcome in the results table at the bottom of this file.

If the test changed what is true, edit the `claim` line to say what you actually found. It is displayed to whoever uses the tool, so a stale claim next to a verified date is worse than no record.

Save, reload the page, and check three things:

1. The banner has lost that item, or disappeared entirely if both are closed.
2. The verdict no longer says "provisional" for the assumptions you closed.
3. The provenance line appears under the coupon figure and at the bottom of the copied summary.

Then run `?selftest=1` once. It has checks that read the verification record.

## Results

Fill this in as you go, so the next person can see what was tested and where.

| Blocker | Tested on | By | Environment | Booking ref | Result |
|---|---|---|---|---|---|
| Tax position | | | | | |
| Per-day split | | | | | |
| Coupon code reuse (from Test 2, step 5) | | | | | |
| Pro-side reconstruction, one pet | | | | | |
| Pro-side reconstruction, two pets and the fee base | | | | | |
