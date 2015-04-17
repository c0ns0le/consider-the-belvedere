#!/bin/sh

STARTUP=$(pwd)/startup.sh
APP=$(pwd)/node-app

cat <<EOM >startup.sh
#!/bin/sh

cd $APP
node app.js
EOM

cat <<EOM >~/Library/LaunchAgents/considerthebelvedere.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.considerthebelvedere</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/sh</string>
    <string>$STARTUP</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>
EOM

chmod 755 $STARTUP