#!/bin/bash
#

set -e

echo
echo "Workspace Configuration starting..."
echo

jq --help | head -n 1
sponge -h

#brew install jq sponge

# Parse args
echo "Parsing arguments..."
echo
USE_LIBS=()
USE_DOC="no"
USE_BRANCH="work"
while [ "${1}" != "" ]; do
	case "${1}" in
		--lib=*)
			L=$(echo -n "${1}" | sed 's/--lib=//g')
			USE_LIBS+=("${L}")
			;;
		--branch=*)
			USE_BRANCH=$(echo -n "${1}" | sed 's/--branch=//g')
			;;
		--docs)
			USE_DOC="yes"
			;;
		*)
			echo "Error: Unexpected argument '$1'" >&2
			exit 1
			;;
	esac
	shift
done

echo "USE_LANGS: ${USE_LANGS[@]}"
echo "USE_LIBS: ${USE_LIBS[@]}"
echo "USE_DOC: ${USE_DOC}"
echo "USE_BRANCH: ${USE_BRANCH}"
echo


# Detect workspace directory
SOURCE=${BASH_SOURCE[0]}
while [ -L "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a symlink
  DIR=$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )
  SOURCE=$(readlink "$SOURCE")
  [[ $SOURCE != /* ]] && SOURCE=$DIR/$SOURCE # if $SOURCE was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done
DIR=$( cd -P "$( dirname "$SOURCE" )" >/dev/null 2>&1 && pwd )
echo "Workspace directory:  ${DIR}"
echo 


# 
WORKSPACE_TMP_FILE="$(mktemp)"
trap 'rm -f "${WORKSPACE_TMP_FILE}"' EXIT

cat Freemework.code-workspace.base >> "${WORKSPACE_TMP_FILE}"

if [ "${USE_DOC}" == "yes" ]; then
	jq '.folders += [{"path": "docs"}]' "${WORKSPACE_TMP_FILE}" | sponge "${WORKSPACE_TMP_FILE}"

	if [ -d "${DIR}/docs" ]; then
		echo "WARNING: Skip docs configuration due directory '${DIR}/docs' already presented." >&2
	else
		set -x
		(cd "${DIR}" && git worktree add docs docs-work)
		set +x
	fi
fi

for LIB_IDX in ${!USE_LIBS[*]}; do
	LIB_ITEM="${USE_LIBS[${LIB_IDX}]}"
	LIB=$(echo "${LIB_ITEM}" | cut -d: -f1)
	PL=$(echo "${LIB_ITEM}" | cut -d: -f2)
	REMOTE_BRANCH="src-${LIB}-${PL}-${USE_BRANCH}"
	WORKTREE_DIRECTORY="src-${LIB}-${PL}"

	echo "Configuring library '${LIB_ITEM}' ..."
	#echo "	Remote branch: ${REMOTE_BRANCH}"
	#echo "	Working tree directory: ${WORKTREE_DIRECTORY}"

	jq --arg path "${WORKTREE_DIRECTORY}" '.folders += [{"path": $path}]' "${WORKSPACE_TMP_FILE}" | sponge "${WORKSPACE_TMP_FILE}"

	if [ -d "${DIR}/${WORKTREE_DIRECTORY}" ]; then
		echo "WARNING: Skip library configuration due directory '${DIR}/${WORKTREE_DIRECTORY}' already presented." >&2
	else
		set -x
		(cd "${DIR}" && git worktree add "${WORKTREE_DIRECTORY}" "${REMOTE_BRANCH}")
		set +x
	fi
	echo
done

cat "${WORKSPACE_TMP_FILE}" > "${DIR}/Freemework.code-workspace"

echo "Your Git worktree is:"
git worktree list
