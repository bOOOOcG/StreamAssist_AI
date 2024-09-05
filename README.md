# Bilibili Live Auto Chat AI

This is an AI-powered script designed to automatically interact with live streamers on Bilibili. The project consists of a Tampermonkey client script. The AI listens to the live stream audio, processes it using OpenAI and Youdao's speech recognition, and sends relevant chat messages to engage with the streamer based on the speech-to-text results. Additionally, the script captures screenshots from the live stream to provide context for the AI.

## Features

- **Automatic Speech Recognition**: Uses OpenAI Whisper and Youdao for speech-to-text recognition.
- **Auto Chat**: Automatically sends chat messages based on the transcribed audio content.
- **Live Stream Interaction**: AI can mimic human-like interactions in live streams.
- **Tampermonkey Client**: A client script for capturing audio and sending chat messages automatically during live streams on Bilibili.
- **Screenshot Capture**: Captures live stream screenshots to enhance AI responses.

## Example

Here is an example of the Tampermonkey script's control panel for the Bilibili live stream:

![Auto Chat AI Control Panel](auto_chat_ai_panel_example.png)

## Project Structure

- **Client**: A Tampermonkey script that interacts with the live stream, captures audio and screenshots, and sends requests to the server.

## Future Platform Support

We plan to extend the platform support to other live-streaming services such as:

- **YouTube Live**
- **Twitch**
- **Facebook Live**
- **Other popular streaming platforms**

This will allow broader usage of the auto chat AI across multiple streaming ecosystems.

## Server Code

The server-side code is currently **not open-source**. The client-side Tampermonkey script is open-source and available for use and modification. The server-side implementation will be considered for future open-sourcing.

For more information on how the client interacts with the server, feel free to open an issue or ask questions.

## Prerequisites

Before starting, make sure you have the following installed:

- [Tampermonkey](https://www.tampermonkey.net/) for the Bilibili client script.

## Tampermonkey Script Setup

1. Install [Tampermonkey](https://www.tampermonkey.net/) in your browser.
2. Copy the Tampermonkey client script from the `client_script.js` file and create a new Tampermonkey script.
3. Replace the server URL in the script with your server’s address:

    ```javascript
    xhr.open('POST', 'https://your_server_address:8181/upload', true);
    ```

4. Save and activate the script in Tampermonkey.

## Running the Project

1. Open a Bilibili live stream. The Tampermonkey script will automatically start recording audio, capture screenshots, and send them to the server for processing.

2. The server (which is currently not open-sourced) will use OpenAI and Youdao to process the audio, generate a GPT-4 response, and send chat messages back to the live stream.

## Server Command-Line Arguments

- `--test`: Enable test mode to save received files for debugging.
- `--local`: Restrict server access to `127.0.0.1` (localhost only).
- `--check-system-tokens`: Check the token count of the system prompt.
- `--use-whisper`: Use OpenAI Whisper for speech recognition.
- `--compare-speech-recognition`: Compare speech recognition results from Youdao and Whisper.
- `--use-both`: Use both Youdao and Whisper for speech recognition.

## License

This project is licensed under the AGPL-3.0 License. For more details, see the [LICENSE](LICENSE) file.

## Chinese Version (中文版)

For the Chinese version of this README, click [here](README-zh.md).

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests for improvements or bug fixes.

## Support

For any questions or issues, please open an issue on the [GitHub repository](https://github.com/bOOOOcG/StreamAssist_AI).
