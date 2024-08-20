import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";

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
            name: "Albertinand",
            value: "Yo20RdqMMwUUnwNTV5FD",
          },
          {
            name: "Joby (kind of)",
            value: "ymsKIfampZ0Cerj1eruj",
          },
          {
            name: "Andy (kind of)",
            value: "QBreCkJkNorI5ZUlmmhJ",
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
        .setDescription("Variability in the voice, default is 'normal'")
        .addChoices(
          { name: "High", value: ".8" },
          { name: "Normal", value: ".5" },
          {
            name: "Low",
            value: ".1",
          }
        )
    )

    .addStringOption((option) =>
      option
        .setName("style")
        .setRequired(false)
        .setDescription("How emotional the voice is, default is 'kinda wild'")
        .addChoices(
          { name: "Wild", value: "1.0" },
          { name: "Medium Wild", value: ".75" },
          { name: "Kinda Wild", value: ".5" },
          { name: "Weird", value: ".25" },
          {
            name: "Normal",
            value: "0.0",
          }
        )
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
