import {
  AudioPlayer,
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
import { reverseLookup, VOICES, voices } from "./const";

let voiceConnection: VoiceConnection;

export const queueRunner = async () => {
  while (true) {
    if ((global as any).queue.length > 0 && !(global as any).isPlaying) {
      const interaction: CommandInteraction = (global as any).queue.shift();

      if (interaction.commandName === "albertinand-got-back") {
        const song = interaction.options.getString("song");
        const audioPath = `./savedSounds/${song}`;

        await playAudio(interaction, audioPath, 0.4);
      } else {
        const voice = interaction.options.getString("voice") || "";

        if (!!voice) {
          const elevenLabsURL = `https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream`;
          const outputPath = `./audio/${randomUUID()}.mp3`;

          const headers: any = {
            Accept: "application/json",
            "xi-api-key": process.env.ELEVEN_LABS_API_KEY,
          };

          const name: VOICES = reverseLookup[voice];

          const data = {
            text: interaction.options.getString("text"),
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: voices[name].stability || ".5",
              similarity_boost: Number(voices[name].similarity) || 0.8,
              style: Number(voices[name].style) || ".5",
              speed: 0.8,
              use_speaker_boost: true,
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

              await playAudio(
                interaction,
                outputPath,
                voices[name].volume,
                true
              );
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
        }
      }
    } else {
      await timeout(1000);
    }
  }
};

const waitForAudioToFinish = (player: AudioPlayer) =>
  new Promise<void>((resolve) => {
    player.once(AudioPlayerStatus.Idle, () => resolve());
  });

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

const playAudio = async (
  interaction: CommandInteraction,
  audioPath: string,
  volume: number,
  deleteAudio: boolean = false
) => {
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
    const audio = createAudioResource(audioPath, { inlineVolume: true });
    audio.volume?.setVolume(volume);

    (global as any).isPlaying = true;

    player.on(AudioPlayerStatus.Idle, () => {
      console.log("The audio player is idle.");
      if (deleteAudio) {
        unlink(audioPath, () => {});
      }
      player.removeAllListeners();
    });

    player.on("error", (error) => {
      console.error("Error with the audio player:", error);
    });

    connection.subscribe(player);
    player.play(audio);
    await waitForAudioToFinish(player);
    (global as any).isPlaying = false;
  } else {
    console.error("Channel not found or not a voice channel");
  }
};
