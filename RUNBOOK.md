# Concierge runbook

One page. How to get the coupon amount for a guaranteed-price order.

> **Not ready for live orders yet.** Two assumptions in this tool have not been checked against a real booking, and the tool says so in an orange banner at the top. Until that banner is gone, use this for practice and for building the ticket, and confirm the figure with your lead before issuing anything. The team lead closes this out via `VERIFY.md`.

## Open it

Double-click `open-calculator.command` on a Mac, or `open-calculator.bat` on Windows. A black terminal window opens and your browser follows. Leave the terminal window open while you work. Closing it shuts the tool down.

Opening `coupon-calculator.html` directly by double-clicking looks like it works, but the Pro search will fail. Always use the launcher.

## 1. Paste the Teams card

Copy all the text from the post in the Teams channel and paste it into the first box.

The tool fills in the service, the dates, the ZIP, the pet count, and the quoted total in one go. Green text under the box means it read everything. Red text lists what it could not read, and you fill those in by hand.

## 2. Check what it read

Look at the service, dates, and pet count against the card. The tool tells you when its own recomputed quote disagrees with the card's figure, and it always uses the card's figure, because that is the price the customer agreed to.

## 3. Find the Pro

Type the ZIP if it did not come through, then click **Find Pros in this ZIP**. Type part of the Pro's name in the filter box to narrow the list.

Each row shows the Pro's rate for this service and their additional-pet policy. Click the Pro the concierge matched.

If you already have the real booking open in the product, skip the search. Open **Overrides & assumptions** and paste the pre-coupon total, meaning subtotal plus service fee, before taxes. That figure beats anything the tool reconstructs.

## 4. Read the number

The dark box gives the coupon to issue.

A **green box** means the Pro came in cheaper than the quote. Issue nothing. Tell the customer we found a Pro below the quoted price and honored it. They are charged the lower amount.

For daycare and dog walking, the number is **per booking** and the box shows how many times to issue it. A five-walk order is five separate bookings and five coupons.

## 5. Copy it into the ticket

**Copy summary for the ticket** puts the whole reconciliation on your clipboard: the order, the Pro, both sides of the math, and the coupon. Paste it into the ticket so the next person can see how the figure was reached.

## When the tool stops you

It refuses to guess rather than produce a wrong number. Each of these is a real stop.

| What it says | What to do |
|---|---|
| Additional-pet discount could not be read | Open the Pro's profile, find their additional-pet policy, and type the percentage under Overrides. Do not leave it blank on a multi-pet order. Guessing zero overcharges Yourgi on every extra pet. |
| This result is a center, not a Yourgi Pro | The tool cannot price centers. Build the booking in the product and paste the real pre-coupon total under Overrides. |
| Pet count exceeds this Pro's stated capacity | Their listing does not allow that many pets per booking, so the rate may not apply. Check with the Pro before issuing. |
| This Pro charges a holiday fee | Check whether any date in the order is a holiday. If so, work the extra out by hand and add it. The tool cannot see holiday dates. |
| The card and this tool disagree | The live page's prices may have changed. The customer's quoted figure is still honored. Tell your lead so the tool gets updated. |
| The quote does not divide evenly across N bookings | Issue the shown amount on every booking, then adjust one booking by the leftover cents so the order total lands exactly on the quote. |
| Search failed: Failed to fetch | The page was opened without the launcher. Close it and use `open-calculator.command` or `open-calculator.bat`. |

## When to escalate

- The pre-coupon total in the product does not match what the tool reconstructed.
- The customer has already been charged and the total is not the price they were quoted.
- A Pro's rate looks wrong, for example $0.
- Any add-on was attached to the order. Add-ons are not covered by the flat-rate promise and there is no ruling yet on whether they bill on top.
