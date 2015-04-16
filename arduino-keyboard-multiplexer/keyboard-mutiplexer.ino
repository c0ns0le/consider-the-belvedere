// PROTOCOL is
// addrbyte (0 - 16) . valuebyte . checksum


unsigned char parseAddr = 0;
unsigned char parseByte = 0;
unsigned char parsePosition = 0;

int keyboardEnabled = 0;

// the setup function runs once when you press reset or power the board
void setup() {
  // initialize digital pin 13 as an output.
  pinMode(13, OUTPUT);
  pinMode(12, INPUT_PULLUP);
  
  Serial.begin(115200);
  Serial1.begin(115200);
  Keyboard.begin();
}

void parseInput(unsigned char b) {
 if (parsePosition == 0) {
   if (b > 0 && b <= 16) {
     parseAddr = b;
     parsePosition = 1; 
   }
 } else if (parsePosition == 1) {
   parseByte = b;
   parsePosition = 2; 
 } else if (parsePosition == 2) {
   if (b == (parseAddr + parseByte) & 0xFF) {
      unsigned char* parseByteAddr = &parseByte;
      writeFromAddr(parseAddr, (char *)parseByteAddr, 1);
   }
   parsePosition = 0;
 }
}


void writeFromAddr(int addr, char* buffer, int bufferSize) {
  if (keyboardEnabled) {
    int addrKey = KEY_F1 + addr - 1; // addr is 1 based
    
    Keyboard.press(addrKey);
    
    for (int i = 0; i < bufferSize; ++i) {
      // TODO: need to check if its a shift or not based on the character
      int key = buffer[i];
      
      switch (key) {
        case 13: 
          key = KEY_RETURN;
          break;
        case 8:
        case 127:
          key = KEY_BACKSPACE;
          break;
        case 9:
          key = KEY_TAB;
          break;
        case 27:
          key = KEY_ESC;
          break;
      }
      
      Keyboard.press(key);
      Keyboard.release(key);
    }
    
    Keyboard.release(addrKey);
  } else {
    Serial.print(addr);
    Serial.print(':');
    for (int i = 0; i < bufferSize; ++i) {
     Serial.print((int)buffer[i]); 
    }
    Serial.print('(');
    Serial.write(buffer, bufferSize);
    Serial.print(')');
    Serial.print(' ');
  }
  
}


// the loop function runs over and over again forever
void loop() {
  int val = digitalRead(12);
  
  if (val == HIGH) {
    keyboardEnabled = 0;
  } else {
    keyboardEnabled = 1;
  }
  
  if (Serial1.available()) {
    unsigned char b = Serial1.read();
    parseInput(b);
  }
  /*
  	0xC1	193
KEY_F1	0xC2	194
KEY_F2	0xC3	195
KEY_F3	0xC4	196
KEY_F4	0xC5	197
KEY_F5	0xC6	198
KEY_F6	0xC7	199
KEY_F7	0xC8	200
KEY_F8	0xC9	201
KEY_F9	0xCA	202
KEY_F10	0xCB	203
KEY_F11	0xCC	204
KEY_F12	0xCD	205
  */
}
