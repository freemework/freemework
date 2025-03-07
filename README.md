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

git worktree add src-common-typescript                "src-common-typescript#dev"
git worktree add src-decimal_bignumberjs-typescript   "src-decimal_bignumberjs-typescript#dev"
git worktree add src-hosting-typescript               "src-hosting-typescript#dev"
git worktree add src-sql_misc_migration-typescript    "src-sql_misc_migration-typescript#dev"
git worktree add src-sql_postgres-typescript          "src-sql_postgres-typescript#dev"
git worktree add src-workflow-typescript              "src-workflow-typescript#dev"



code "Freemework.code-workspace"
```

## Notes

### Checking out orphan branch in new work-tree

```shell
NEW_PROJ=...
git worktree add --detach "./${NEW_PROJ}"
cd "./${NEW_PROJ}"
git checkout --orphan "${NEW_PROJ}#work"
git reset --hard
git commit --allow-empty -m "Initial Commit"
git push origin "${NEW_PROJ}#master":"${NEW_PROJ}#master"
```

See at [StackOverflow](https://stackoverflow.com/questions/53005845/checking-out-orphan-branch-in-new-work-tree)

### Remove all Git worktrees

```shell
for SRC in src-*; do git worktree remove "${SRC}"; done
```
