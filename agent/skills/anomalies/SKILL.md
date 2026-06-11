---
name: anomalies
description: Defines what counts as an anomalous transaction and how to spot each kind
---
# What is an anomaly

An anomaly is a transaction that deviates from normal spending patterns in a way
that warrants review. Use the categories below as your detection criteria.

## categories

1. **Unusually large amount** — an amount far above the typical transaction
   size for the dataset (e.g. an order of magnitude larger than the median).
2. **Duplicate transaction** — the same merchant name and amount appearing on
   the same date (likely a double charge).
3. **Suspicious merchant name** — ALL CAPS names, crypto/investment lures, or
   urgency language in the name or description ("URGENT", "Act Now", "247").
4. **Round-number wire transfer** — large transfers ending in `.00` (e.g.
   `2000.00`), especially labeled as wires or international transfers.
5. **Statistical outlier** — an amount that sits well outside the normal range
   even if it doesn't match the categories above.

## how to decide

- Compare each transaction against the overall distribution, not in isolation.
- A transaction can match more than one category; cite the strongest reason.
- Everyday spend (groceries, coffee, subscriptions, fuel) is normal — do not
  flag it unless an amount is clearly out of range.
- When unsure, fetch the transaction's full details with `get_transaction`
  before flagging.
