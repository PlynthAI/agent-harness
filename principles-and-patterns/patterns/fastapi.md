---
type: "pattern"
title: "FastAPI"
description: "Apply when a diff adds or changes FastAPI path operations, parameters, dependencies, routers, response types or the async and blocking work inside them."
applies_to: ["diff"]
dependency: ["fastapi"]
source: "https://github.com/fastapi/fastapi/tree/e6942531f53bc49b86ecf73f9500abd0e22eef0b/fastapi/.agents/skills/fastapi"
reviewed: "2026-10-02"
---
# FastAPI

The long-standing rules from FastAPI's official guidance, restated as review
rules. Each finding cites its heading. Rules tied to one release are left
out on purpose, so the page does not go stale.

## Parameters and dependencies

- **`Annotated` for every declaration:** `Path`, `Query`, `Header`, `Body`
  and `Depends`. Each `Depends` gets a type alias so it can be reused.

  ```python
  CurrentUser = Annotated[User, Depends(get_current_user)]

  @router.get("/me")
  def read_me(user: CurrentUser, q: Annotated[str | None, Query(max_length=50)] = None): ...
  ```

- **No `...` default.** `Query(...)`, `Field(..., gt=0)` and `name: str = ...`
  are unnecessary; a parameter or field with no default is already required.
- **Function dependencies over class dependencies, where possible.** A
  function that returns the instance, not `Depends()` on a class whose
  `__init__` takes the parameters.
- **Cleanup lives in a `yield` dependency** with `try`/`finally`.
- **Router settings on the router.** `prefix`, `tags` and shared
  `dependencies` go on `APIRouter(...)`, not `include_router(...)`; upstream
  allows exceptions.
- **One HTTP operation per function.** No `api_route(methods=[...])` that
  branches on `request.method`.

## Responses

- **Declare a return type** where possible. FastAPI validates, filters,
  documents and serialises the response by it, which keeps fields outside the
  type from leaking.
- **`response_model` when the returned value is not the public shape,** such
  as an internal model with a secret field; the function then returns `Any`.

## Async and blocking

- **Plain `def` unless the body awaits.** `async def` is for a path operation
  or dependency whose every call is async and non-blocking. A blocking call
  inside `async def` still works but stalls the event loop; plain `def` runs
  in a threadpool.

## Models

- **No `RootModel`.** Use an annotated type with its constraints instead:
  `items: Annotated[list[int], Field(min_length=1), Body()]`.

## Left to tools

Where the repository selects them, Ruff's FastAPI rules report dependencies
declared without `Annotated` (`FAST002`), and `ASYNC210` reports a blocking
HTTP call inside `async def`. What they enforced is not review work.
