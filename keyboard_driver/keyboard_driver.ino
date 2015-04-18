#include <PS2Keyboard.h>



// 1 - 15
const unsigned char addrId = 5;



const int DataPin = 5;
const int IRQpin =  3;
int led = 13;

unsigned char parseAddr = 0;
unsigned char parseByte = 0;
unsigned char parsePosition = 0;
long long lastReset = 0;


PS2Keyboard keyboard;

void setup() {
  delay(500 + 500 * addrId);
  
  pinMode(led, OUTPUT);
  digitalWrite(led, HIGH);
  delay(250);
  digitalWrite(led, LOW);  
  
  keyboard.begin(DataPin, IRQpin);
  Serial.begin(115200);
  
  keyboard.reset();
  
  lastReset = millis();
}

void parseInput(unsigned char b) {
 if (parsePosition == 0) {
   if (b > 0 && b <= 16) {
     parseAddr = b;
     parsePosition++; 
   }
 } else if (parsePosition == 1) {
   parseByte = b;
   parsePosition++; 
 } else if (parsePosition == 2) {
   if (b == (parseAddr + parseByte) & 0xFF) {
      writeFromAddr(parseAddr, parseByte);
   }
   parsePosition = 0;
 }
}

void writeFromAddr(unsigned char addr, unsigned char b) {
  Serial.write(addr);
  Serial.write(b);
  Serial.write((addr + b) & 0xFF); 
}

void loop() {
  if (Serial.available()) {
    parseInput(Serial.read()); 
  }

  if (keyboard.available()) {
#ifdef DEBUG
    digitalWrite(led, HIGH);
    delay(200);
    digitalWrite(led, LOW);
    delay(200);
#endif
    // read the next key
    char c = keyboard.read();
    writeFromAddr(addrId, c);
  } else if (millis() - lastReset > 3600000) {
     lastReset = millis();
     keyboard.reset(); 
  }
}
