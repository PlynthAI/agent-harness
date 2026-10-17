---
type: "pattern"
title: "React composition"
description: "Apply when a plan or diff adds or changes a React component's API: its props, variants, compound parts, context providers or shared state."
applies_to: ["plan", "diff"]
dependency: ["react"]
source: "https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278/skills/composition-patterns"
reviewed: "2026-10-02"
---
# React composition

How a component's API should grow. Plan review checks a planned shared
component, library piece or context provider against Component shape and
State, where a boolean-prop design is cheapest to change. Diff review checks a
new mode-switching boolean prop, `renderX` prop or variant of an existing
component. Each finding cites its heading. These rules are for complex,
shared components; a simple component with one job is not a finding. No tool
the harness has checked covers them.

## Component shape

- **Avoid piling up boolean props that switch behaviour.** `isThread`,
  `isEditing` and `isForwarding` each double the states the component must
  handle and fill it with nested conditionals. Build each case from shared
  parts instead. A plain state prop such as `disabled`, `open` or `checked` is
  not a mode.
- **For a complex component, compound parts over one configurable
  component.** Expose the parts (`Composer.Frame`, `Composer.Input`,
  `Composer.Submit`) sharing state through context, and let each caller
  compose the parts it needs, rather than one component steered by `showX`
  and `renderX` props.

  ```tsx
  <Composer.Frame>
    <Composer.Input />
    <AlsoSendToChannel channelId={id} />
    <Composer.Footer><Composer.Submit /></Composer.Footer>
  </Composer.Frame>
  ```
- **Explicit variants over modes.** `<ThreadComposer channelId="a" />` and
  `<EditComposer messageId="b" />` say what they render;
  `<Composer isThread isEditing={false} />` does not. Each variant picks its
  provider, parts and actions from the shared set.
- **`children` over `renderX` for structure.** Static layout composes as
  children. A render prop stays right where the parent hands data back to the
  child, as in `renderItem={({ item }) => ...}`.

## State

- **Only the provider knows how state is managed.** UI parts read a context
  interface and never call the store, sync hook or `useState` behind it, so
  swapping local state for synced state leaves the UI untouched.
- **A context of state, actions and meta, where several providers drive the
  same parts.** Type the context as `{ state, actions, meta }` (meta for refs
  and the like). Any provider that fills that shape can drive the parts: local
  state for a dialog, a synced store for a channel.
- **Lift shared state into a provider.** When something outside the visual
  component needs its state, such as a preview or a submit button in a dialog
  footer, move the state into a provider wrapping both. The tells are an
  effect that copies state up to a parent on every change, and a ref read at
  submit time. The provider boundary matters, not visual nesting.

## React 19

Only where the repository's `react` is 19 or later and the component need not
also support React 18.

- **`ref` is a prop.** Accept `ref` in props instead of wrapping the component
  in `forwardRef`. A lint rule that bans `forwardRef` takes this over where a
  repository enables one.
- **`use(Context)` over `useContext`.** It reads the same value and may be
  called conditionally.
