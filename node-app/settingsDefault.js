
module.exports = {
  chromePaths: [
    '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome',
    '/Applications/Internet/Google\ Chrome.app/Contents/MacOS/Google\ Chrome',
    '/usr/bin/google-chrome'
  ],
  chromeFlags: '--kiosk --incognito',
  backupDir: '../db-backups/',
  port: '8888',
  autoSuggest: {
    maxWords: 35,
    minWords: 25
  },
  remoteDB: 'https://drive.google.com/uc?export=download&id=0BwzIpvfIbVWOZlRxb3hrbWJyX0U'
};