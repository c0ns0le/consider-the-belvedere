
module.exports = {
  chromePaths: [
    '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome',
    '/Applications/Internet/Google\ Chrome.app/Contents/MacOS/Google\ Chrome'
  ],
  chromeFlags: '--kiosk --incognito',
  backupDir: '~/documents/',
  port: '8888',
  autoSuggest: {
    maxWords: 35,
    minWords: 25
  }
};