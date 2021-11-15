cd edgedb-deno
git config user.name edgedb-ci
git config user.email releases@edgedb.com
git add . -f

if ! git diff --cached --exit-code > /dev/null;
then
  git commit -m "Build from edgedb-js $GITHUB_SHA"
  git push
else
  echo 'No changes to release'
fi
