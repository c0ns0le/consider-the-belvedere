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
AUTOSTART=$HOME/.config/autostart/NightTimes.desktop


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

read -p "Install autostart script? (y/n)" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
  echo "Skipping autostart script. You can run using ./startup.sh"
else
echo "Installing autostart script..."
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

fi


if [ $LINUX == true ]; then

read -p "Install autostart script? (y/n)" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
  echo "Skipping autostart script. You can run using ./startup.sh"
else
echo "Installing autostart script..."

mkdir -p "$(dirname "$AUTOSTART")"

cat <<EOM >$AUTOSTART
#!/usr/bin/env xdg-open 
[Desktop Entry] 
Version=1.0 
Name=Night Times startup 
Comment=Remember the Belvedere 
Exec=$STARTUP
Type=Application 
Categories=Startup 
EOM
chmod 755 $AUTOSTART
fi



fi

echo "Installing node dependencies..."
cd node-app
npm install
cd ..
echo "Ready!"

