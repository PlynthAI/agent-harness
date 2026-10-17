# When to mock

The syntax below is one language's illustration of the boundary rule. The rule is
the content; translate the shape of the examples into the repository's own test
framework.

Mock at **system boundaries** only:

- External APIs (payment, email, etc.)
- Databases (sometimes - prefer test DB)
- Time/randomness
- File system (sometimes)

Keep internal behavior real when exercising the outcome. Ownership alone does
not decide the boundary: an adapter you own can represent an external system.
Replace that dependency at its actual contract, rather than mocking the internal
logic whose behavior the test claims to prove.

Check both what the double excludes and what the assertion establishes. A call
count or argument can protect a contracted effect, such as charging once for the
agreed amount. It cannot prove the real provider accepts the request. A test that
only asserts its own stub setup provides no evidence of production behavior.

## Designing for mockability

At system boundaries, design interfaces that are easy to mock:

**1. Use dependency injection**

Pass external dependencies in rather than creating them internally:

```typescript
// Easy to mock
function processPayment(order, paymentClient) {
  return paymentClient.charge(order.total);
}

// Hard to mock
function processPayment(order) {
  const client = new StripeClient(process.env.STRIPE_KEY);
  return client.charge(order.total);
}
```

**2. Prefer SDK-style interfaces over generic fetchers**

Use the existing boundary's contract. Specific operations can simplify repeated
test setup; a generic fetch interface is also valid when it is the real boundary.
Do not add an adapter solely to make a test imitate private calls.

```typescript
// GOOD: Each function is independently mockable
const api = {
  getUser: (id) => fetch(`/users/${id}`),
  getOrders: (userId) => fetch(`/users/${userId}/orders`),
  createOrder: (data) => fetch('/orders', { method: 'POST', body: data }),
};

// A generic boundary may need request-specific setup
const api = {
  fetch: (endpoint, options) => fetch(endpoint, options),
};
```

The SDK approach means:
- Each mock returns one specific shape
- No conditional logic in test setup
- Easier to see which endpoints a test exercises
- Type safety per endpoint
