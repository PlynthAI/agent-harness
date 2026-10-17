---
type: "pattern"
title: "Pydantic"
description: "Apply when a diff adds or changes Pydantic models, fields, constraints, validators, discriminated unions or the parsing of external data with Pydantic."
applies_to: ["diff"]
dependency: ["pydantic"]
source: "https://github.com/pydantic/pydantic/tree/29933d1c8cfc882a7640f4d831b09381b39aa311/.agents/skills/pydantic"
reviewed: "2026-10-02"
---
# Pydantic

Pydantic's own guidance on modelling, restated as review rules. Each finding
cites its heading. Most are stated upstream as preferences ("prefer", "if
possible", "generally"), so a diff may depart from one for a reason. The type
checker catches ordinary mismatches in code that uses the models; no tool the
harness has checked covers the rules below.

## Where models belong

- **Models suit untrusted external data,** such as request bodies and API
  responses. For objects the program builds itself, plain classes or
  dataclasses are usually better: the type checker already covers them, and a
  model limits which types they can hold and makes post-init changes harder.

## Fields and constraints

- **Prefer the `Annotated` form for metadata.** `age: Annotated[int, Field(gt=0)]`
  can carry any number of metadata items, and `x: int = Field(description="...")`
  reads as if `x` had a default when it is required.
- **But `alias`, `default` and `default_factory` use the assignment form,**
  because type checkers read them there: `name: str = Field(alias="fullName")`.
- **Field-specific metadata wraps the whole type.** Metadata about the field,
  such as `deprecated`, goes around the full annotation:
  `Annotated[int | None, Field(deprecated=True)] = None` applies to the field;
  `Annotated[int, Field(deprecated=True)] | None` buries it inside one arm of
  the union. A constraint on one arm, such as `Annotated[int, Field(gt=0)] | None`,
  is correct.
- **Built-in constraints over validators.** `gt`, `max_length`,
  `annotated_types` and `StringConstraints(strip_whitespace=True, to_lower=True)`
  replace a validator that compares or strips by hand.

## Validators

- **After validators over before validators.** An after validator receives the
  parsed field type; a before validator receives anything the caller sent, and
  a model before validator may not even get a dict.
- **Prefer validators beside the field.**
  `even: Annotated[int, AfterValidator(is_even)]` over a decorator elsewhere
  in the class, whose running order is hard to follow, especially on
  subclasses. A `@field_validator` should be a `@classmethod`.

## Coercion and unions

- **No union to feed a coercion.** Outside strict mode Pydantic already turns
  `"123"` into an `int`, so `int | str` plus a converting validator is
  redundant.
- **No abstract collection only to accept tuples.** Outside strict mode
  `list[str]` already accepts tuples and sets; `Sequence[str]` for that
  purpose is less efficient.
- **Where one type will do, prefer it to a union.** Every reader of a union
  field must check which type it holds. `X | None` and a discriminated union
  are not findings.

## Annotations

- **Avoid `from __future__ import annotations` in model modules where
  possible.** Quote only a name not yet defined (`parent: "Node"`), and on
  Python 3.14 or later quote nothing.
- **Recursive aliases use a real alias.** `type Json = list[Json] | dict[str,
  Json] | str | int | float | bool | None` (or `TypeAliasType` before 3.12);
  Pydantic generally cannot resolve a quoted `TypeAlias`.

## Subclasses

- **A field typed as a base model drops subclass data.** Pydantic validates
  and serialises by the declared type, so a `Sub` stored in a `Base` field
  dumps only the base fields, and input for `Sub` validates as `Base`. Use a
  discriminated union or a generic model:

  ```python
  from typing import Annotated, Literal
  from pydantic import BaseModel, Field

  class Pet(BaseModel):
      name: str

  class Cat(Pet):
      kind: Literal["cat"]

  class Dog(Pet):
      kind: Literal["dog"]

  class Owner(BaseModel):
      pet: Annotated[Cat | Dog, Field(discriminator="kind")]
  ```

  Polymorphic serialisation (Pydantic 2.13 or later) or `SerializeAsAny` is the
  last resort when neither fits.
