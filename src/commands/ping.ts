import { SlashCommandBuilder } from "@discordjs/builders";

export const Ping = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Will consider responding"),
  execute: (interaction: any) => interaction.reply({ content: "pong I guess" }),
};
