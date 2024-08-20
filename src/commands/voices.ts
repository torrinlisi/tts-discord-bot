import { SlashCommandBuilder } from "@discordjs/builders";
import axios from "axios";

export const Voices = {
  data: new SlashCommandBuilder()
    .setName("voices")
    .setDescription("Gives a list of available voices"),
  execute: async (interaction: any) => {
    const elevenLabsURL = "https://api.elevenlabs.io/v1/voices";

    let voices = await axios.get(elevenLabsURL, {
      headers: {
        Accept: "application/json",
        "xi-api-key": process.env.ELEVEN_LABS_API_KEY || "",
        "Content-Type": "application/json",
      },
    });

    interaction.reply({
      content: JSON.stringify({
        voice_id: voices.data.voices[1].voice_id,
        name: voices.data.voices[1].name,
      }),
    });
  },
};
