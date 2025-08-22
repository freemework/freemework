# Freemework
[![npm version badge](https://img.shields.io/npm/v/@freemework/common.svg)](https://www.npmjs.com/package/@freemework/common)
[![downloads badge](https://img.shields.io/npm/dm/@freemework/common.svg)](https://www.npmjs.org/package/@freemework/common)
[![commit activity badge](https://img.shields.io/github/commit-activity/y/freemework/freemework)](https://github.com/freemework/freemework/pulse)
[![last commit badge](https://img.shields.io/github/last-commit/freemework/freemework)](https://github.com/freemework/freemework/graphs/commit-activity)

## Directory Structure

```text
src-python/
├── pyproject.toml   # PDM workspace config
├── packages/
│   ├── lib_a/pyproject.toml
│   ├── lib_b/pyproject.toml
│   └── lib_c/pyproject.toml
```

## Developer Notes

### Run tests

```shell

pdm run --project packages/lib_a pytest
```

### Add dependencies

```shell
pdm add --dev --group test pytest
```

### Publish

```shell
pdm publish --project packages/lib_a
Username: __token__
Password: ...
```
