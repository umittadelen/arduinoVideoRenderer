# Arduino Video Renderer
This repository contains all the required files and resources for building a video renderer with arduino.

## Features

- Sends frames to arduino to display
- Has dithering options
- Adjustable size for display

## Folder Structure

- `receive/`
  - `receive.ino`: Arduino sketch for the project
- `index.html`: Just go to https://umittadelen.github.io/arduinoVideoRenderer/

## Getting Started

1. **Hardware Setup:**
   - Connect a Oled display to arduino from SCL, SDA

2. **Software Setup:**
   - Install the U8g2lib library
   - Change this lines based on your screen:
      - ```c++ 
            4 | U8G2_SSD1309_128X64_NONAME0_F_HW_I2C u8g2(U8G2_R0);
            5 | #define BAUD_RATE 1000000
            6 | const int frameSize = 128 * 64 / 8;
        ```
        **_Note:_** mega 2560 can handle 1M baud rate without issues. (adjust it based on your board)
   - Upload the code to your Arduino board.

3. **Usage:**
   - go to https://umittadelen.github.io/arduinoVideoRenderer/
   - upload the video
   - connect to arduino
   - change the width/height based on your screen
   - change dithering if needed
   - click to `Start Streaming`
   - it will start to send frames

## License
This project is licensed under the MIT License (see `LICENSE`).