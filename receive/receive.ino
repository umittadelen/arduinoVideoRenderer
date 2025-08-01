#include <U8g2lib.h>
#include <Wire.h>

U8G2_SSD1306_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);

#define BAUD_RATE 1000000
const int frameSize = 128 * 64 / 8;
byte frameBuffer[frameSize];

const byte HEADER[] = {0xAA, 0x55, 0xAA, 0x55};
const int HEADER_LEN = 4;

byte headerIndex = 0;
int frameIndex = 0;
bool receivingFrame = false;

unsigned long frameStartTime = 0;
const unsigned long FRAME_TIMEOUT_MS = 500;  // Increased for safety

void resetReceiver() {
  receivingFrame = false;
  frameIndex = 0;
  headerIndex = 0;
  // Do NOT clear Serial buffer here!
}

void setup() {
  Serial.begin(BAUD_RATE);
  u8g2.begin();
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_ncenR08_tr);
  u8g2.drawStr(0, 30, "waiting for connection...");
  u8g2.sendBuffer();
}

void loop() {
  while (Serial.available()) {
    byte b = Serial.read();

    if (!receivingFrame) {
      if (b == HEADER[headerIndex]) {
        headerIndex++;
        if (headerIndex == HEADER_LEN) {
          receivingFrame = true;
          frameIndex = 0;
          frameStartTime = millis();
        }
      } else {
        headerIndex = 0;
      }
    } else {
      frameBuffer[frameIndex++] = b;

      if (frameIndex >= frameSize) {
        // Complete frame received
        memcpy(u8g2.getBufferPtr(), frameBuffer, frameSize);
        u8g2.sendBuffer();
        Serial.write(0xAC); // ACK
        resetReceiver();
      }
    }
  }

  // Timeout check outside serial loop too
  if (receivingFrame && millis() - frameStartTime > FRAME_TIMEOUT_MS) {
    resetReceiver();
    Serial.write(0xEE); // Frame timeout
  }
}
