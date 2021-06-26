const os = jest.requireActual('os');
const mock = jest.createMockFromModule('os');

let mocked_homedir = null;

mock.homedir = function () {
  if(mocked_homedir) {
    return mocked_homedir;
  } else {
    return os.homedir();
  }
}

mock.__setHomedir = function(dir) {
  mocked_homedir = dir;
}
mock.tmpdir = os.tmpdir;

module.exports = mock;
