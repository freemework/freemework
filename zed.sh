#!/bin/sh
#

exec zed $(jq --raw-output '.folders[] | select(.path != ".") | .path' Freemework.code-workspace)
