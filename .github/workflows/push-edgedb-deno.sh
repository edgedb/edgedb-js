cd edgedb-deno
git config user.name edgedb-ci
git config user.email releases@edgedb.com
git add . -f

if ! git diff --cached --exit-code > /dev/null;
echo $(git config --get remote.origin.url)
then
  git commit -m "Build from edgedb-js $GITHUB_SHA"
  git push origin HEAD
else
  echo 'No changes to release'
fi
