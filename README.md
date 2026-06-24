# Freemework

[Freemework](https://docs.freemework.org) is a general purposes framework with goal to provide cross language API. Learn API once - develop for any programming language.

## Sources Worktree Branch Naming Convention

src-<LIBRARY>-<LANGUAGE>-<BRANCH>

## Libraries

| Library name        | Description     |
| ------------------- | --------------- |
| common              | All langs       |
| decimal_bignumberjs | TypeScript only |
| hosting             | All langs       |
| sql_misc_migration  | All langs       |
| sql_postgres        | All langs       |
| workflow            | All langs       |

## Freemework Common Library

This is `workspace` branch of **Freemework Common Library** multi project repository based on [orphan](https://git-scm.com/docs/git-checkout#Documentation/git-checkout.txt---orphanltnew-branchgt) branches.

The branch contains [VSCode's workspace](https://code.visualstudio.com/docs/editor/workspaces).

## Get Started

```shell
git clone git@github.com:freemework/freemework.git ~/w-freemework
cd ~/w-freemework

# Obsolete
git worktree add src-common-typescript                "src-common-typescript#dev"
git worktree add src-decimal_bignumberjs-typescript   "src-decimal_bignumberjs-typescript#dev"
git worktree add src-hosting-typescript               "src-hosting-typescript#dev"
git worktree add src-sql_misc_migration-typescript    "src-sql_misc_migration-typescript#dev"
git worktree add src-sql_postgres-typescript          "src-sql_postgres-typescript#dev"
git worktree add src-workflow-typescript              "src-workflow-typescript#dev"

# New layout
git worktree add src-python                           "src-python#dev"
git worktree add src-rust                             "src-rust#dev"
git worktree add src-typescript                       "src-typescript#dev"



code "Freemework.code-workspace"
```

## Notes

### Checking out orphan branch in new work-tree

```shell
NEW_LANG=...
git worktree add --orphan -b "src-${NEW_LANG}#dev" "./src-${NEW_LANG}"
cd "./src-${NEW_LANG}"
git commit --allow-empty --message "Initial Commit"
git push origin "src-${NEW_LANG}#dev"
```

See at [StackOverflow](https://stackoverflow.com/questions/53005845/checking-out-orphan-branch-in-new-work-tree)

### Remove all Git worktree

```shell
for SRC in src-*; do git worktree remove "${SRC}"; done
```
