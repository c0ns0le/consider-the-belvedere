#!/bin/sh

MAC=false
LINUX=false

case "$(uname -s)" in

   Darwin)
     echo 'Mac OS X'
     MAC=true
     ;;

   Linux)
     echo 'Linux'
     LINUX=true
     ;;

   # Add here more strings to compare
   # See correspondence table at the bottom of this answer

   *)
     echo 'Unknown OS, aborting install.'
     exit 
     ;;
esac


STARTUP=$(pwd)/startup.sh
APP=$(pwd)/node-app

cat <<EOM >startup.sh
#!/bin/sh

cd $APP
/usr/local/bin/node app.js
EOM

chmod 755 $STARTUP

mkdir -p 'db-backups'

echo 'Copying settings file for local customization...'
rsync -u -p node-app/settingsDefault.js node-app/settings.js

if [ $MAC == true ]; then

echo 'Installing startup script...'
echo 'Exiting because I don wanna install now, remove this later'
exit

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
fi

if [ $LINUX == true ]; then
  echo 'LINUX TRUE'
fi


cd node-app
npm install
cd ..

