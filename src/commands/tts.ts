import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { voices } from "../common/const";

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
          {
            name: "Albertinand",
            value: voices.Albertinand.id,
          },
          {
            name: "Ka-Reetz",
            value: voices["Ka-Reetz"].id,
          }
        )
    )
    .addStringOption((option) =>
      option
        .setName("text")
        .setRequired(true)
        .setDescription("The text to send to tts")
    ),

  execute: async (interaction: CommandInteraction) => {
    const text = interaction.options.getString("text");
    if (!!text && text.length <= 100) {
      (global as any).queue.push(interaction);

      interaction.reply({
        content: "Added to queue",
      });
    } else {
      interaction.reply({
        content: "Message is too long, please keep it under 100 characters",
        ephemeral: true,
      });
    }
  },
};
