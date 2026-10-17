# Worked examples

Two worked pairs, each showing a test worth keeping beside the shape that looks
similar and is not. The syntax below is one language's; the distinction is the
point, not the syntax, so rewrite the pair in the repository's own conventions.

## Worked example: behaviour against mirrored internals

A **behaviour test** states an outcome a caller can observe through the public
interface. Code can change entirely and the test still holds.

```typescript
// GOOD: Tests observable behavior
test("user can checkout with valid cart", async () => {
  const cart = createCart();
  cart.add(product);
  const result = await checkout(cart, paymentMethod);
  expect(result.status).toBe("confirmed");
});
```

Characteristics:

- Tests behavior users/callers care about
- Uses public API only
- Survives internal refactors
- Describes WHAT, not HOW
- Uses the assertions needed to prove one required outcome

A **mirrored-internals test** asserts a private collaboration that is not part of
the requirement. It can break when that collaboration changes without changing
the caller's outcome.

```typescript
// BAD: Tests implementation details
test("checkout calls internal total helper", async () => {
  const mockTotal = jest.spyOn(cartHelpers, "calculateTotal");
  await checkout(cart, payment);
  expect(mockTotal).toHaveBeenCalledWith(cart);
});
```

Red flags:

- Mocking internal collaborators
- Testing private methods
- Asserting on private call counts/order without a required interaction
- Test breaks when refactoring without behavior change
- Test name describes HOW not WHAT
- Reaching around the contract to assert incidental state

### Verifying through the interface, not a side channel

For a retrieval contract, exercise retrieval. A database assertion alone may
miss a broken public read path:

```typescript
// BAD: Claims retrieval coverage but only checks storage
test("createUser makes user retrievable", async () => {
  await createUser({ name: "Alice" });
  const row = await db.query("SELECT * FROM users WHERE name = ?", ["Alice"]);
  expect(row).toBeDefined();
});

// GOOD: Verifies through interface
test("createUser makes user retrievable", async () => {
  const user = await createUser({ name: "Alice" });
  const retrieved = await getUser(user.id);
  expect(retrieved.name).toBe("Alice");
});
```

Direct storage inspection can be useful when durable storage is itself the
required contract. Judge the observation against that contract, rather than
treating every database assertion as implementation coupling.

## Worked example: the tautological assertion

A production call used as its own oracle cannot expose its own wrong result.
Copying production logic into an expectation also risks reproducing its defect:

```typescript
// BAD: This reducer is copied from the production implementation
test("calculateTotal sums line items", () => {
  const items = [{ price: 10 }, { price: 5 }];
  const expected = items.reduce((sum, i) => sum + i.price, 0);
  expect(calculateTotal(items)).toBe(expected);
});

// GOOD: Expected value is an independent, known literal
test("calculateTotal sums line items", () => {
  expect(calculateTotal([{ price: 10 }, { price: 5 }])).toBe(15);
});
```

The copied reducer may catch a defect elsewhere in the function, but it supplies
no independent evidence that the shared calculation is correct. A calculation
derived independently from the specification can be a valid reference oracle.
For example, a simple reference model can check an optimized implementation;
round-trip or conservation properties can expose wrong outputs. Establish that
the reference or property can fail for a credible regression and shares no
production helper that would conceal it. Similar arithmetic alone is not proof
of tautology.

## Doubles at the edges

An external charge is an observable effect when the contract requires the right
amount to be charged once. A boundary double can check that promise alongside the
returned outcome:

```typescript
// GOOD: Checks the contracted external effect and caller's outcome
test("checkout charges the agreed amount once", async () => {
  const paymentClient = { charge: jest.fn().mockResolvedValue({ id: "charge-1" }) };
  const result = await checkout(cartWithTotal(15), paymentClient);
  expect(paymentClient.charge).toHaveBeenCalledTimes(1);
  expect(paymentClient.charge).toHaveBeenCalledWith(15);
  expect(result.status).toBe("confirmed");
});
```

This does not prove the real provider integration. See [mocking.md](mocking.md)
for the boundary decision and the evidence a double leaves out.
