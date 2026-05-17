---
description: Python style and safety rules for application code.
applyTo: '**/*.py'
---

# Python

- Type hints on every function signature and class attribute.
- `Any` requires an inline `# type: ignore[reason] — <why>` or a comment justifying the use.
- Prefer `dataclasses` (frozen=True where possible) or `pydantic` over dict-as-record.
- Imports order: stdlib, third-party, local. Group with blank lines.
- Use `pathlib.Path` over `os.path` for filesystem work.
- Async: `async def` with `await`. Use `asyncio.gather` for independent concurrent work. Never `time.sleep` in an async function.
- Errors: never bare `except:`. Catch specific exception types. Re-raise with `from e` to preserve the cause.

## Modern Python idioms (3.11+)

- `match`/`case` for tagged unions; not for `if`/`else` replacements.
- `Self` from `typing` over `TypeVar` for fluent builders.
- `StrEnum` / `IntEnum` from stdlib for typed enums.
- Use `TypeAlias` for non-trivial aliases; readers thank you.

## Testing (when files match `**/test_*.py` or `**/*_test.py`)

- `pytest`, not `unittest`.
- One logical assertion per test. Test name reads as a sentence: `test_returns_none_when_user_not_found`.
- Fixtures over `setUp` / `tearDown`.
- `pytest.mark.parametrize` to collapse identical tests with different inputs.
- Mock only what you don't own (network, filesystem, time). Use `freezegun` for time, `responses`/`respx` for HTTP.

## Common mistakes to avoid

- Don't catch `Exception` to "make tests pass". Narrow it.
- Don't silence `mypy` with `# type: ignore` without a reason comment.
- Don't `pip install` a 500KB library when a 5-line helper suffices.
- Don't reach for `__init__.py` magic when an explicit import works.
