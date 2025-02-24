import { SlashCommandBuilder } from "@discordjs/builders";

export const Skip = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skips current audio track"),
  execute: async (interaction: any) => {
    (global as any).isPlaying = false;

    interaction.reply({
      content: "Skipped audio track",
    });
  },
};
