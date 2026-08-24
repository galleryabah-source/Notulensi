# Golden Calculation Cases

These are specification vectors for the eventual decimal-backed test suite.

## Case 001 — direct cost only

Material:
- quantity 10
- coefficient 1
- unit price 100000

Labor:
- quantity 10
- coefficient 0.5
- unit price 80000

Equipment:
- quantity 10
- coefficient 0.1
- unit price 50000

Rates:
- overhead 0
- contingency 0
- tax 0
- profit 0
- discount 0

Expected:
- material = 1,000,000
- labor = 400,000
- equipment = 50,000
- direct = 1,450,000
- total = 1,450,000

## Case 002 — layered cost

Direct cost = 1,000,000

Rates:
- overhead = 10%
- contingency = 5%
- tax = 11%
- profit = 10%
- discount = 25,000

Expected calculation order:
1. overhead = 100,000
2. contingency base = 1,100,000
3. contingency = 55,000
4. taxable base = 1,155,000
5. tax = 127,050
6. profit base = 1,282,050
7. profit = 128,205
8. gross = 1,410,255
9. total = 1,385,255

The implementation must reproduce these values exactly under the configured decimal precision policy.

## Regression requirements

- No binary floating-point arithmetic in the production financial path.
- Rounding is not allowed between intermediate stages unless explicitly required by the configured policy.
- A change in formula order is a breaking calculation change and requires a new engine version plus updated golden evidence.
