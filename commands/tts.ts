import { SlashCommandBuilder } from "@discordjs/builders";
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
} from "@discordjs/voice";
import axios from "axios";
import { randomUUID } from "crypto";
import { createWriteStream, unlink } from "fs";

// hacky but works for now
let isProcessing = false;

export const TTS = {
  data: new SlashCommandBuilder()
    .setName("tts")
    .setDescription(
      "Provide your desired voice and text to get a tts message in the vc"
    )
    .addStringOption((option) =>
      option
        .setName("voice")
        .setRequired(true)
        .setDescription("The voice to use")
        .addChoices(
          { name: "Default Female Voice", value: "21m00Tcm4TlvDq8ikWAM" },
          { name: "Default Male Voice", value: "29vD33N1CtxCmqQRPOHJ" },
          {
            name: "Female Radio/Stream Voice (I guess)",
            value: "z9fAnlkpzviPz146aGWa",
          }
        )
    )
    .addStringOption((option) =>
      option
        .setName("text")
        .setRequired(true)
        .setDescription("The text to send to tts")
    )

    .addStringOption((option) =>
      option
        .setName("stability")
        .setRequired(false)
        .setDescription("How emotional the voice is")
        .addChoices(
          { name: "Low", value: ".8" },
          { name: "Normal", value: ".5" },
          {
            name: "High",
            value: ".1",
          }
        )
    ),

  execute: async (interaction: any) => {
    // TODO make this better, ideally with a queue
    if (isProcessing) {
      interaction.reply({
        content:
          "Command already running, please wait until the previous one has completed",
      });
    } else {
      isProcessing = true;

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
          style: 0.0,
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
          interaction.reply({
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
          } else {
            console.error("Channel not found or not a voice channel");
          }
        });

        writer.on("error", (err) => {
          console.log("Error writing to file:", err);
          interaction.reply({
            content: "Something went wrong when creating mp3",
          });
          writer.close();
        });

        isProcessing = false;
      } catch (e) {
        console.log(e);
        interaction.reply({
          content: "Something went wrong",
        });

        isProcessing = false;
      }
    }
  },
};
