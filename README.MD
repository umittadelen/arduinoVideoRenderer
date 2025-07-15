# Arduino Video Renderer
This repository contains all the required files and resources for building a video renderer with arduino.

## Features

- Sends frames to arduino to display
- Has dithering options
- Adjustable size for display

## Folder Structure

- `receive/`
  - `receive.ino`: Arduino sketch for the project
- `send.py`: Python code to send the frames if website doesnt work

## Getting Started

1. **Hardware Setup:**
   - Connect a Oled display to arduino from SCL, SDA

2. **Software Setup:**
   - Install the U8g2lib library
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