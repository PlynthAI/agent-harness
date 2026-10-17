#!/usr/bin/env bash
# Append a well-formed row to a hillclimb decision log (TSV).
# Usage: log.sh <logfile> <id> <hypothesis> <change> <before> <after> <delta> <tests> <verdict> <note>
set -euo pipefail

if [ "$#" -ne 10 ]; then
	printf 'usage: log.sh <logfile> <id> <hypothesis> <change> <before> <after> <delta> <tests> <verdict> <note>\n' >&2
	exit 1
fi

logfile="$1"
shift

logdir="$(dirname "$logfile")"
if [ -n "$logdir" ] && [ "$logdir" != "." ] && [ ! -d "$logdir" ]; then
	mkdir -p "$logdir"
fi

# Use `>>` here, never `>`. A network mount can fail this test for a log
# that exists. Then the cost is one stray header line, not the rows.
if [ ! -s "$logfile" ]; then
	printf 'id\thypothesis\tchange\tbefore\tafter\tdelta\ttests\tverdict\tnote\n' >> "$logfile"
fi

# Strip tabs/newlines/CR so cells stay on one line, and prefix any cell
# whose first char a spreadsheet would parse as a formula (=, +, -, @)
# with a single quote. The skill expects this log to be read in
# spreadsheets, so attacker-controlled evidence (PR titles, filenames,
# generated text) must not become formula execution when a reviewer
# opens the file. A negative delta such as -34% is the common case.
clean() {
	local v
	v=$(printf '%s' "$1" | tr '\t\n\r' '   ')
	case "$v" in
		=*|+*|-*|@*) printf "'%s" "$v" ;;
		*) printf '%s' "$v" ;;
	esac
}
printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
	"$(clean "$1")" "$(clean "$2")" "$(clean "$3")" "$(clean "$4")" "$(clean "$5")" \
	"$(clean "$6")" "$(clean "$7")" "$(clean "$8")" "$(clean "$9")" \
	>> "$logfile"
