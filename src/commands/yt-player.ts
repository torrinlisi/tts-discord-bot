import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";

// ONLY WORKS WHEN RUNNING LOCALLY
export const YTPlayer = {
  data: new SlashCommandBuilder()
    .setName("ytplayer")
    .setDescription("Give a url and I'll try and play the video in voice chat")
    .addStringOption((option) =>
      option.setName("url").setRequired(true).setDescription("The YT URL")
    ),

  execute: async (interaction: CommandInteraction) => {
    const url = interaction.options.getString("url");
    if (url && url?.length > 10) {
      (global as any).queue.push(interaction);

      interaction.reply({
        content: "Added to queue",
      });
    } else {
      interaction.reply({
        content: "Something is wrong with your url, try again",
        ephemeral: true,
      });
    }
  },
};
