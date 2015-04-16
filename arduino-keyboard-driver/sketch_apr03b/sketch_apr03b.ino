 /*  PS2Keyboard library example
  
  PS2Keyboard now requries both pins specified for begin()

  keyboard.begin(data_pin, irq_pin);
  
  Valid irq pins:
     Arduino Uno:  2, 3
     Arduino Due:  All pins, except 13 (LED)
     Arduino Mega: 2, 3, 18, 19, 20, 21
     Teensy 2.0:   All pins, except 13 (LED)
     Teensy 2.0:   5, 6, 7, 8
     Teensy 1.0:   0, 1, 2, 3, 4, 6, 7, 16
     Teensy++ 2.0: 0, 1, 2, 3, 18, 19, 36, 37
     Teensy++ 1.0: 0, 1, 2, 3, 18, 19, 36, 37
     Sanguino:     2, 10, 11
  
  for more information you can read the original wiki in arduino.cc
  at http://www.arduino.cc/playground/Main/PS2Keyboard
  or http://www.pjrc.com/teensy/td_libs_PS2Keyboard.html
  
  Like the Original library and example this is under LGPL license.
  
  Modified by Cuninganreset@gmail.com on 2010-03-22
  Modified by Paul Stoffregen <paul@pjrc.com> June 2010
*/
   
#include <PS2Keyboard.h>


// 1 - 15
const unsigned char addrId = 1;



const int DataPin = 5;
const int IRQpin =  3;
int led = 13;

unsigned char parseAddr = 0;
unsigned char parseByte = 0;
unsigned char parsePosition = 0;


PS2Keyboard keyboard;

void setup() {
  delay(1000);
  keyboard.begin(DataPin, IRQpin);
  Serial.begin(115200);
   // initialize the digital pin as an output.
  pinMode(led, OUTPUT);     
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
    /*
    digitalWrite(led, HIGH);   // turn the LED on (HIGH is the voltage level)
    delay(100);               // wait for a second
    digitalWrite(led, LOW);    // turn the LED off by making the voltage LOW
    delay(100);               // wait for a second
    */
    // read the next key
    char c = keyboard.read();
    
    // check for some of the special keys
    /*
    if (c == PS2_ENTER) {
      Serial.println();
    } else if (c == PS2_TAB) {
      Serial.print("[Tab]");
    } else if (c == PS2_ESC) {
      Serial.print("[ESC]");
    } else if (c == PS2_PAGEDOWN) {
      Serial.print("[PgDn]");
    } else if (c == PS2_PAGEUP) {
      Serial.print("[PgUp]");
    } else if (c == PS2_LEFTARROW) {
      Serial.print("[Left]");
    } else if (c == PS2_RIGHTARROW) {
      Serial.print("[Right]");
    } else if (c == PS2_UPARROW) {
      Serial.print("[Up]");
    } else if (c == PS2_DOWNARROW) {
      Serial.print("[Down]");
    } else if (c == PS2_DELETE) {
      Serial.print("[Del]");
    } else {
      */
      // otherwise, just print all normal characters
      writeFromAddr(addrId, c);
    //}
  }
}
