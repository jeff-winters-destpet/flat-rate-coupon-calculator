# Closing the two blockers

A worksheet. Two tests, each closable in one real booking. Until both are recorded, every figure the calculator produces is labeled provisional and says so in the summary that gets pasted into tickets.

Work these before the concierge team uses the tool on a live order.

## What you need first

- A test consumer account with at least one pet record and a saved address. The booking flow will not produce an estimate without both.
- Access to whatever surface issues coupon codes.
- A known Pro whose rate differs from the flat rate, so the coupon is nonzero. The tool's Pro list shows each Pro's rate, so pick one from there.
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
