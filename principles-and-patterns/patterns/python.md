---
type: "pattern"
title: "Python patterns"
description: "Apply when a diff adds or changes Python type hints: Any and object, argument and return types, narrowing functions and exhaustive matches."
applies_to: ["diff"]
source: "https://github.com/python/typing/tree/dc0a8a924c99c6d6ab70f5dc4708e8e4017386ae/docs"
reviewed: "2026-10-02"
---
# Python patterns

The Python typing documentation's guidance ("Typing Best Practices", "Type
Narrowing", "Unreachable Code and Exhaustiveness Checking"), restated as review
rules. Each finding cites its heading. The best practices are defaults: a diff
may depart from one for a specific reason.

Versions: `TypeIs` is in `typing` from Python 3.13 (before that,
`typing_extensions` 4.10); `Never` and `assert_never` from 3.11 (before that,
`typing_extensions` 4.1).

## Any and object

- **`object` for a parameter that accepts any value.** Keep `Any` for a type
  the type system cannot express, or whose correct form is unergonomic.
- **A callback whose return value is ignored returns `object`,** not `Any` or
  `None`: `Callable[[int], object]`.

## Arguments and return types

- **Abstract arguments, concrete returns.** Parameters take protocols or
  abstract types (`Iterable`, `Sequence`, `Mapping`); a concrete
  implementation returns concrete types (`list`, `dict`). Return types on a
  protocol or abstract class are judged case by case.

  ```python
  def lengths(names: Iterable[str]) -> list[int]: ...  # not names: list[str]
  ```

- **Avoid union return types.** They require `isinstance()` checks; use `Any`
  or `X | Any` if necessary. The guide's own examples return `int | None`, so
  do not flag `X | None`.

## Narrowing

- **Use checks the type checker already understands:** `is not None`,
  truthiness, `isinstance`, `callable`. A `TypeIs` or `TypeGuard` function
  earns its place when it reuses a complicated check or covers one the
  checker does not understand.
- **A `TypeIs[T]` function returns `True` if and only if its argument is a
  `T`.** `isinstance(x, int) and x > 0` typed `TypeIs[int]` is wrong: the
  false branch then treats a negative int as not an int. The checker cannot see the
  mistake, so every `TypeIs` and `TypeGuard` function needs review and a test.
- **`TypeIs` by default; `TypeGuard` when** narrowing to a type not
  assignable to the input (`list[object]` to `list[int]`), or when the check
  accepts only part of the type (positive ints). A `TypeGuard` across
  incompatible mutable types is unsound; `Sequence` or `Iterable` parameters
  make `TypeIs` more likely to work instead.
- **No narrowing on objects other code mutates.** A check holds only until
  something else runs: a called function, another thread, or another
  coroutine across an `await`.
- **`isinstance` does not match the type system** for a runtime-checkable
  protocol (method signatures are not checked) or a class added to an ABC with
  `.register()` (checkers usually miss it).

## Exhaustiveness

- **Where every member of an enum or union must be handled, the `match` or
  `if` chain ends in `assert_never`,** so a new member is a type error where
  it is unhandled.

  ```python
  match status:
      case Status.OPEN: ...
      case Status.CLOSED: ...
      case _:
          assert_never(status)
  ```

- **`assert False`, or a raise, only where the checker cannot prove the code
  unreachable,** such as after an infinite loop. In place of `assert_never` it
  gives no check, and a missed case fails at runtime.

## Left to tools

Where the repository enables them, a fault these report is not review work:
pyright's `reportMatchNotExhaustive` (on in strict mode) or mypy's
`exhaustive-match` for every `match`, and mypy's `--warn-unreachable` for code
that can never run. Ruff `ANN401` flags every explicit `Any`; one the rules
above allow stays allowed.
