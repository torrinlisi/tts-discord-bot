import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  DiscordGatewayAdapterCreator,
  joinVoiceChannel,
  VoiceConnection,
  VoiceConnectionStatus,
} from "@discordjs/voice";
import axios from "axios";
import { randomUUID } from "crypto";
import { CommandInteraction, Guild, GuildBasedChannel } from "discord.js";
import { createWriteStream, unlink } from "fs";

let voiceConnection: VoiceConnection;

export const queueRunner = async () => {
  while (true) {
    if ((global as any).queue.length > 0) {
      const interaction: CommandInteraction = (global as any).queue.shift();

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
          style: Number(interaction.options.getString("style")) || ".5",
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
            process.env.TEST_GUILD_ID as string
          );
          const channel = guild.channels.cache.get(
            process.env.VOICE_CHANNEL_ID as string
          );

          if (channel && channel.isVoice()) {
            // Join the voice channel
            const connection = joinVoiceChannelIfNeeded(
              channel,
              guild,
              interaction.client
            );

            connection.on("error", (error: any) => {
              console.error("Error with the connection:", error);
            });

            const player = createAudioPlayer();
            const audio = createAudioResource(outputPath);

            player.on(AudioPlayerStatus.Idle, () => {
              console.log("The audio player is idle.");
              unlink(outputPath, () => {});
              player.removeAllListeners();
            });

            player.on("error", (error) => {
              console.error("Error with the audio player:", error);
            });

            connection.subscribe(player);
            player.play(audio);
            await timeout(2000);
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
      await timeout(1000);
    }
  }
};

const timeout = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const joinVoiceChannelIfNeeded = (
  channel: GuildBasedChannel,
  guild: Guild,
  client: any
) => {
  if (voiceConnection) {
    console.log("Already connected to a voice channel.");
    return voiceConnection;
  }

  // Create a new connection if none exists
  voiceConnection = joinVoiceChannel({
    channelId: channel.id,
    guildId: guild.id,
    adapterCreator: channel.guild
      .voiceAdapterCreator as DiscordGatewayAdapterCreator,
    selfDeaf: false,
  });

  voiceConnection.on(VoiceConnectionStatus.Disconnected, () => {
    console.log("Voice connection disconnected.");
    // Clean up and remove the connection from the cache
    client.voice.connections.delete(channel.guildId);
  });

  return voiceConnection;
};
