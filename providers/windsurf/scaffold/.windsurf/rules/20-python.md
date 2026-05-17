---
trigger: glob
globs: **/*.py
---

# Python (auto-attached for .py)

- Type hints on every function signature and class attribute.
- `Any` requires inline `# type: ignore[reason] — <why>` or a justifying comment.
- Prefer `dataclasses` (`frozen=True` where possible) or `pydantic` over dict-as-record.
- Imports: stdlib, third-party, local — blank lines between groups.
- `pathlib.Path` over `os.path`.
- Async: `async def` with `await`. `asyncio.gather` for independent concurrent work. Never `time.sleep` in `async`.
- Errors: never bare `except:`. Catch specific types. Re-raise with `from e`.

## Modern Python (3.11+)

- `match`/`case` for tagged unions, not `if/else` chains.
- `Self` from `typing` over `TypeVar` for fluent builders.
- `StrEnum` / `IntEnum` for typed enums.

## Suppress these tendencies

- Don't catch `Exception` to make tests pass.
- Don't silence `mypy` without a reason comment.
- Don't `pip install` a 500KB library when a 5-line helper suffices.
