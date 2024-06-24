# dnd-tts-discord-bot
Work ongoing.

TODO
- Every request should be fed into a queue on the same server
- Servers and voice channels should be programatically determined rather than in an env var
- Investigate if some kind of multithreading is necessary if on multiple different servers and being used simultaneously
- Add more dnd specific commands
- Improve TTS to offer more flexibility
- Potential memory leak due to listeners not properly closing after audio plays... oops
- Add cap to text size so someone doesn't waste and entire budget
