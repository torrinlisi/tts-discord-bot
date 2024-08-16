import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
} from "@discordjs/voice";
import axios from "axios";
import { randomUUID } from "crypto";
import { createWriteStream, unlink } from "fs";

export const queueRunner = async () => {
  while (true) {
    if ((global as any).queue.length > 0) {
      const interaction = (global as any).queue.shift();

      const elevenLabsURL = `https://api.elevenlabs.io/v1/text-to-speech/${interaction.options.getString(
        "voice"
      )}/stream`;
      const outputPath = `./audio/${randomUUID()}.mp3`;

      const headers: any = {
        Accept: "application/json",
        "xi-api-key": process.env.ELEVEN_LABS_API_KEY,
      };

      const data = {
        text: interaction.options.getString("text"),
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: interaction.options.getString("stability") || ".5",
          similarity_boost: 0.8,
          style: Number(interaction.options.getString("style")) || 0.0,
          use_speaker_boost: false,
        },
      };

      const writer = createWriteStream(outputPath);

      try {
        const stream = (
          await axios.post(elevenLabsURL, data, {
            headers: headers,
            responseType: "stream",
          })
        ).data;

        stream.pipe(writer);

        writer.on("finish", async () => {
          console.log("Write completed.");
          interaction.followUp({
            content: "Text succesfully processed",
          });

          const guild = await interaction.client.guilds.fetch(
            process.env.TEST_GUILD_ID
          );
          const channel: any = guild.channels.cache.get(
            process.env.VOICE_CHANNEL_ID
          );

          if (channel && channel.isVoice()) {
            // Join the voice channel
            const connection = joinVoiceChannel({
              channelId: channel.id,
              guildId: guild.id,
              adapterCreator: channel.guild.voiceAdapterCreator,
              selfDeaf: false,
            });

            connection.on("error", (error) => {
              console.error("Error with the connection:", error);
            });

            const player = createAudioPlayer();
            const audio = createAudioResource(outputPath);

            player.on(AudioPlayerStatus.Idle, () => {
              console.log("The audio player is idle.");
              unlink(outputPath, () => {});
              // connection.destroy(); // Disconnect the bot after the audio finishes
            });

            player.on("error", (error) => {
              console.error("Error with the audio player:", error);
            });

            connection.subscribe(player);
            player.play(audio);

            // TODO: figure this out
            // connection.destroy();
            // connection.destroy()
          } else {
            console.error("Channel not found or not a voice channel");
          }
        });

        writer.on("error", (err) => {
          console.log("Error writing to file:", err);
          interaction.followUp({
            content: "Something went wrong when creating mp3",
          });
          writer.close();
        });
      } catch (e) {
        console.log(e);
        interaction.followUp({
          content: "Something went wrong",
        });
      }
    } else {
      await timeout(2000);
    }
  }
};

const timeout = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
