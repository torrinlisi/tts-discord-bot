import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";

export const AlbertinandGotBack = {
  data: new SlashCommandBuilder()
    .setName("albertinand-got-back")
    .setDescription("He's got it")
    .addStringOption((option) =>
      option
        .setName("song")
        .setRequired(true)
        .setDescription("The song to play")
        .addChoices(
          {
            name: "Slam Poetry (full song)",
            value: "Albertinand-got-back-slam-poetry.mp3",
          },
          {
            name: "Fellas",
            value: "fellas-yeah.mp3",
          },
          {
            name: "It is so big",
            value: "it-is-so-big.mp3",
          }
        )
    ),

  execute: async (interaction: CommandInteraction) => {
    (global as any).queue.push(interaction);
    interaction.reply({
      content: "Added to queue",
    });
  },
};
