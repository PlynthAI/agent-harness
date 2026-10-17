---
name: ai-chat-interface
description: Design or refine a conversational surface - turns, streaming, interruption, scrollback, failure, source references and composer states - under the project's own design and API authority. Use for chat, streaming or composer surfaces.
---

# Chat interface

Design the conversation the product actually needs. A dense analyst thread and a
consumer messenger share mechanics, not density, and the project's design
authority and API contracts win over generic chat convention.

## Bind the authority

Read the nearest `AGENTS.md`, the project's design authority, and the real
streaming and message API - including what the API cannot do. Resolve components
and libraries from the project's catalogue, such as `COMPONENTS.md`, rather than
from generic chat convention. Do not invent capabilities such as cancel, edit,
regenerate or attachments; expose only what the contract supports, and say which
states are unavailable.

## Decisions

| Concern | Decision to make |
| --- | --- |
| Turns | Group each user prompt with its response. Distinguish roles by alignment, label, weight and restrained tone rather than heavy bubble chrome or colour alone. |
| Rhythm | Compact, repeatable spacing with a clear turn break. Keep long scrollback scannable, and do not card-wrap every paragraph. |
| Streaming | Show an explicit in-progress state and progressive flow. Reserve stable space for status and actions, grow the response predictably, and never remount the thread or jump the surrounding layout. Announce the state changes - started, complete, failed - to assistive technology as one status update; never make each streamed token a live-region event. |
| Sources and citations | Render references through the project's existing attribution grammar, with full labels and detail reachable by pointer, keyboard or touch - never hover-only. |
| Suggestions | Offer a short contextual set near the composer, collapsible after use, with real focus states and adequate hit areas. |
| Input | A multiline composer with a clear submit action, keyboard semantics and a disabled state. Reflect the same ready, working and retry states as the rest of the surface, and expose cancel only when generation supports it. |
| Scrollback | Follow the live edge only while the user is already there. Anchor the initiating turn, and when history is prepended restore the item being read rather than a raw scroll offset. Offer a jump to the latest. |
| Failure | Keep the prompt and any safe partial response, and show an inline failed state with retry at that turn. A retry reuses the failed turn rather than duplicating the prompt in scrollback. Do not replace the pane with a generic error. |
| Density | Render markdown through the project's shared typography with a chat-density override rather than local element styling. Keep code, tables and references readable without widening the pane. |
| Coexistence | Chat shares space with other surfaces. Keep the composer, failure recovery, references and latest-turn access reachable while the neighbouring panes resize. |

## Checks

- User and agent roles are obvious without heavy chrome or colour alone.
- Streaming preserves the pane, header, composer and turn geometry; no flicker and
  no forced scroll while history is being read.
- Source references reuse the shared component, never truncate their own label,
  and open by keyboard and touch as well as pointer.
- Suggestions are contextual, collapsible and not repeated after use.
- The composer exposes exactly the states the contract supports - disabled, and
  cancel only where generation supports it - with adequate hit areas.
- A failed generation retains context and retries at the failed turn.
- Production, keyboard, narrow, long-thread, streaming and error states are
  reviewed in the real surface before readiness.
