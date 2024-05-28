/* eslint-disable no-useless-escape */
const {
    Message, MessageEmbed, MessageActionRow, MessageSelectMenu, ButtonInteraction,
    MessageButton, Modal, TextInputComponent
} = require('discord.js');
const { Produto, ProdutoEstoque, MsgProduto, ProdutoVendido } = require('../../models/vendas');

/**
 * @typedef {Object} Produto
 * @property {Number} _id
 * @property {String} nome
 * @property {String} server_id
 * @property {Number} valor
 * @property {Number} quantidade
 */

/**
 * @typedef {Object} MsgProduto
 * @property {String} canal_id
 * @property {String} msg_id
 * @property {String} server_id
 * @property {Number} produtoId
 */

/**
 * @typedef {Object} ProdutoEstoque
 * @property {Number} produtoId
 * @property {String} server_id
 * @property {String} conteudo
 * @property {Number} data_adicao
 */

/**
 * @param {Message} message
 * @param {string[]} args
 */
const run = async (client, message) => {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
        return message.channel.send(`${message.member}, você não tem permissão de usar esse comando`);
    }

    await message.delete().catch(() => {});

    const itens = await Produto.find({ server_id: message.guildId });
    let itemAtual = itens.find(() => {});

    if (itens.length < 1) {
        return message.channel.send('Sem itens cadastrados para adicionar, use `cadastrarproduto`');
    }

    const rowMenu = new MessageActionRow().addComponents(
        new MessageSelectMenu()
            .setCustomId('edicao_produtos_menu')
            .setPlaceholder('Selecione algum item para editar')
            .addOptions(itens.map(item => ({
                label: `${item.nome} (R$ ${item.valor})`,
                value: `${item._id}`
            })))
    );

    const botaoAdd = new MessageButton()
        .setLabel('Adicionar estoque')
        .setCustomId('btn_add')
        .setStyle('SUCCESS');

    const botaoEdit = new MessageButton()
        .setLabel('Editar produto')
        .setCustomId('btn_edit')
        .setStyle('PRIMARY');

    const botaoGerenciarEstoque = new MessageButton()
        .setLabel('Gerenciar estoque')
        .setCustomId('gerenciar_estoque')
        .setStyle('SECONDARY');

    const rowBotoes = new MessageActionRow().addComponents(
        botaoAdd,
        botaoEdit,
        botaoGerenciarEstoque
    );

    const msgMenu = await message.channel.send({
        embeds: [gerarEmbedEditando()],
        components: [rowMenu, rowBotoes]
    });

    const coletor = message.channel.createMessageComponentCollector({
        filter: i => ['edicao_produtos_menu', 'btn_add', 'btn_del', 'btn_edit', 'gerenciar_estoque'].includes(i.customId),
        idle: 5 * 60 * 1000
    });

    coletor.on('collect', async interaction => {
        if (interaction.user.id !== message.member.id) return interaction.deferUpdate();

        if (interaction.isSelectMenu()) {
            const [itemId] = interaction.values;
            const itemEscolhido = itens.find(i => `${i._id}` === itemId);
            itemEscolhido.quantidade = await ProdutoEstoque.countDocuments({
                server_id: message.guildId,
                produtoId: itemEscolhido._id,
            });

            itemAtual = itemEscolhido;

            const embed = gerarEmbedEditando(
                itemEscolhido.nome,
                formatarValor(itemEscolhido.valor),
                itemEscolhido.quantidade
            );

            interaction.update({ embeds: [embed] });
        } else if (interaction.isButton()) {
            if (!itemAtual) {
                return interaction.reply('Selecione um item do menu antes').then(() => {
                    setTimeout(() => interaction.deleteReply().catch(() => {}), 15000);
                });
            }

            if (interaction.customId === 'btn_add') {
                try {
                    const modalInteraction = await criarModal(interaction, message);

                    const conteudo = modalInteraction.fields.getTextInputValue('conteudo');
                    await modalInteraction.reply({ content: 'Processando...', ephemeral: true });

                    const filtroBusca = {
                        produtoId: itemAtual._id,
                        server_id: message.guildId,
                    };

                    await ProdutoEstoque.create({
                        ...filtroBusca,
                        conteudo,
                        data_adicao: Date.now(),
                    });

                    const quantidadeItens = await ProdutoEstoque.countDocuments(filtroBusca);
                    itemAtual.quantidade = quantidadeItens;

                    await Produto.updateOne({ _id: itemAtual._id }, { quantidade: itemAtual.quantidade });

                    await modalInteraction.editReply({ content: 'Salvo com sucesso ✅', ephemeral: true });

                    interaction.message.edit({
                        embeds: [
                            gerarEmbedEditando(
                                itemAtual.nome,
                                formatarValor(itemAtual.valor),
                                itemAtual.quantidade
                            )
                        ]
                    });

                    await atualizarBannerProduto(interaction, message, itemAtual);
                } catch (err) {
                    console.log(err);
                }
            } else if (interaction.customId === 'btn_edit') {
                try {
                    const modalInteraction = await criarModal(interaction, message);

                    const nome = modalInteraction.fields.getTextInputValue('nome');
                    const valor = modalInteraction.fields.getTextInputValue('valor');

                    if (!nome && !valor) {
                        return modalInteraction.reply('Nenhum campo foi preenchido, nada foi alterado').then(() => {
                            setTimeout(() => modalInteraction.deleteReply().catch(() => {}), 20000);
                        });
                    }

                    const dadosAtualizar = {};

                    const valorFmt = Number(valor?.replace(',', '.'));

                    if (valor && !valorFmt) {
                        return modalInteraction.reply('Valor no formato inválido, tente usar algo no formato `5`, ou `2,50`').then(() => {
                            setTimeout(() => modalInteraction.deleteReply().catch(() => {}), 20000);
                        });
                    }

                    if (nome) dadosAtualizar.nome = nome;
                    if (valor) dadosAtualizar.valor = valorFmt;

                    const dadosAlterados = Object.keys(dadosAtualizar)
                        .map(k => `${k} alterado para \`${dadosAtualizar[k]}\``)
                        .join('\n');

                    await modalInteraction.reply(dadosAlterados).then(() => {
                        setTimeout(() => modalInteraction.deleteReply().catch(() => {}), 15000);
                    });

                    const produtoAtualizado = await Produto.findOneAndUpdate(
                        { _id: itemAtual._id, server_id: itemAtual.server_id },
                        { ...dadosAtualizar },
                        { returnDocument: 'after' }
                    );

                    itemAtual = produtoAtualizado;

                    interaction.message.edit({
                        embeds: [
                            gerarEmbedEditando(
                                itemAtual.nome,
                                formatarValor(itemAtual.valor),
                                itemAtual.quantidade
                            )
                        ]
                    });

                    await atualizarBannerProduto(interaction, message, itemAtual);

                    if (nome) {
                        await ProdutoVendido.updateMany(
                            { server_id: itemAtual.server_id, id: itemAtual._id },
                            { nome }
                        );
                    }
                } catch (err) {
                    console.log(err);
                }
            } else if (interaction.customId === 'gerenciar_estoque') {
                await gerenciarEstoque(interaction, itemAtual);
            }
        }
    });

    coletor.on('end', () => {
        msgMenu.delete().catch(() => {});
    });
};

/** @param {ButtonInteraction} interaction */
const criarModal = async (interaction, message) => {
    let modal;
    const inputs = [];

    if (interaction.customId === 'btn_add') {
        modal = new Modal().setCustomId('novo_item').setTitle('Adicionando estoque');

        const conteudoInput = new TextInputComponent()
            .setCustomId('conteudo')
            .setLabel('O que será entregue à quem comprar?')
            .setRequired(true)
            .setStyle('PARAGRAPH');

        inputs.push(new MessageActionRow().addComponents(conteudoInput));
    } else {
        modal = new Modal().setCustomId('editar_item').setTitle('Editando dados do produto');

        const nomeInput = new TextInputComponent()
            .setCustomId('nome')
            .setLabel('Novo nome do produto (opcional)')
            .setStyle('SHORT');

        const valorInput = new TextInputComponent()
            .setCustomId('valor')
            .setLabel('Novo valor do produto (opcional)')
            .setStyle('SHORT');

        inputs.push(new MessageActionRow().addComponents(nomeInput));
        inputs.push(new MessageActionRow().addComponents(valorInput));
    }

    modal.addComponents(inputs);

    await interaction.showModal(modal);

    return await interaction.awaitModalSubmit({
        filter: i => i.user.id === message.author.id,
        time: 120000
    });
};

const atualizarBannerProduto