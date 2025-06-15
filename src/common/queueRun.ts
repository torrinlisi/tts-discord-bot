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
import { Downloader } from "ytdl-mp3";
import ytdl from "@distube/ytdl-core";
import { s3Upload } from "./trigger-s3-upload";

let voiceConnection: VoiceConnection;
const maxSizeMB = 10;

export const queueRunner = async () => {
  while (true) {
    if ((global as any).queue.length > 0 && !(global as any).isPlaying) {
      const interaction: CommandInteraction = (global as any).queue.shift();

      if (interaction.commandName === "ytplayer") {
        // ONLY WORKS WHEN RUNNING LOCALLY
        try {
          const url = interaction.options.getString("url") || "";

          const info = await ytdl.getInfo(url);

          /* 
            TODO: use this title and channelID to see if the file already exists in S3
            if it does grab the music file in the s3 bucket rather than yt
            
            Then save the filename as `${title} - ${channelID}` rather than the default
          */
          console.log(info.videoDetails.title);
          console.log(info.videoDetails.channelId);

          const format = ytdl.chooseFormat(info.formats, {
            quality: "highestaudio",
          });

          if (format.contentLength) {
            const fileSizeMB = parseInt(format.contentLength) / (1024 * 1024);
            if (fileSizeMB > maxSizeMB) {
              throw new Error("File size too large, skipping download.");
            }
          }

          const downloader = new Downloader({
            getTags: false,
            outputDir: "./audio",
          });

          const song = await downloader.downloadSong(url);
          const outputName = song.outputFile.substring(
            song.outputFile.indexOf("\\") + 1
          );

          if (!!process.env.AWS_ACCESS_KEY_ID) {
            s3Upload(`./audio/${outputName}`, outputName);
          }

          await playAudio(interaction, `./audio/${outputName}`, 0.15, true);
        } catch (e) {
          console.log("e", e);
          interaction.followUp({
            content:
              "Something went wrong downloading the file, it's probably too large",
          });
        }
      } else if (interaction.commandName === "albertinand-got-back") {
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

const waitForAudioToFinish = (
  player: AudioPlayer,
  deleteAudio: boolean,
  audioPath: string
) =>
  new Promise<void>((resolve) => {
    const checkSkip = () => {
      if ((global as any).skip) {
        (global as any).skip = false;
        player.stop();
      }
    };

    const interval = setInterval(checkSkip, 100);

    player.once(AudioPlayerStatus.Idle, () => {
      clearInterval(interval);
      console.log("The audio player is idle.");
      if (deleteAudio) {
        setTimeout(() => {
          unlink(audioPath, (err) => {
            if (err) {
              console.error("Error deleting file:", err);
            } else {
              console.log("File deleted successfully.");
            }
          });
        }, 1000);
      }

      player.removeAllListeners();
      (global as any).isPlaying = false;
      resolve();
    });
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

    player.on("error", (error) => {
      console.error("Error with the audio player:", error);
    });

    connection.subscribe(player);
    player.play(audio);
    await waitForAudioToFinish(player, deleteAudio, audioPath);
  } else {
    console.error("Channel not found or not a voice channel");
  }
};
