// eslint-disable-next-line no-unused-vars
const { MessageEmbed, MessageActionRow, MessageButton, ButtonInteraction, CategoryChannel } = require('discord.js');
const { Carrinho } = require('../models/vendas');
const { gerarEmbedCarrinhoDetalhes } = require('./gerarEmbedCarrinhoDetalhes');

/**
 * Cria um novo canal de carrinho de compras para o usuário
 * @param {CategoryChannel} categoriaCarrinho - A categoria onde o canal do carrinho será criado
 * @param {ButtonInteraction} interaction - A interação do botão que disparou a criação do carrinho
 * @returns {Promise<import('discord.js').TextChannel>} - O canal de texto criado para o carrinho
 */
const criarCarrinho = async (categoriaCarrinho, interaction) => {

    const filtroCarrinho = {
        user_id: interaction.user.id,
        server_id: interaction.guildId,
    };

    const carrinhoCanal = await interaction.guild.channels.create({
        name: `🛒• carrinho-${interaction.user.tag}`,
        parent: categoriaCarrinho.id,
        topic: interaction.user.id,
        permissionOverwrites: [
            {
                id: interaction.guildId,
                deny: ['VIEW_CHANNEL'],
            },
            {
                id: interaction.user.id,
                allow: ['VIEW_CHANNEL', 'SEND_MESSAGES']
            },
        ],
    });

    const msgCarrinhoStatus = await carrinhoCanal.send({
        embeds: [
            gerarEmbedCarrinhoDetalhes(null, interaction)
        ],
        components: [
            new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setLabel('Finalizar')
                        .setStyle('PRIMARY')
                        .setCustomId('finalizar-compra'),
                    new MessageButton()
                        .setLabel('Cancelar compra')
                        .setStyle('DANGER')
                        .setCustomId('cancelar-compra'),
                )
        ]
    });

    await Carrinho.updateOne(
        { ...filtroCarrinho },
        {
            ...filtroCarrinho,
            msg_carrinho_status: msgCarrinhoStatus.id,
            produtos: []
        },
        {
            upsert: true
        }
    );

    return carrinhoCanal;
};

module.exports = { criarCarrinho };
