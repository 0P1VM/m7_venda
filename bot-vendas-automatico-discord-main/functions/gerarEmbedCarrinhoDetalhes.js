// eslint-disable-next-line no-unused-vars
const { MessageEmbed, Collection, ButtonInteraction } = require('discord.js');

/**
 * Função que gera um embed com os detalhes do carrinho
 * @param {{ nome: String, valor: Number }[]} dados - Lista de produtos no carrinho
 * @param {ButtonInteraction} interaction - Interação do botão
 * @returns {MessageEmbed} - Embed com os detalhes do carrinho
 */
const gerarEmbedCarrinhoDetalhes = (dados, interaction) => {
    /**
     * Calcula o valor total de itens com base na quantidade e valor unitário
     * @param {Number} quantidade - Quantidade de itens
     * @param {Number} valorUnidade - Valor unitário do item
     * @returns {Number} - Valor total calculado
     */
    const calcularValor = (quantidade, valorUnidade) => (quantidade * (valorUnidade * 100)) / 100;

    const embed = new MessageEmbed()
        .setAuthor({ name: 'Seu carrinho', iconURL: interaction.member.displayAvatarURL({ dynamic: true }) });

    console.log(dados);

    if (!dados || dados.length === 0) return embed.setDescription('Seu carrinho está vazio.');

    const cont = {};

    dados.forEach(e => {
        cont[e.nome] = (cont[e.nome] || 0) + 1;
    });

    const dadosCollection = new Collection();
    dados.forEach(i => dadosCollection.set(i.nome, i));

    const total = dadosCollection.reduce((acc, item) => {
        const quantidade = cont[item.nome];
        return acc + calcularValor(quantidade, item.valor);
    }, 0);

    dadosCollection.forEach(item => {
        embed.addField(item.nome, `**Quantidade:** ${cont[item.nome]}`);
    });

    return embed.setDescription(`**Total:** R$ ${total.toFixed(2)}`);
};

module.exports = { gerarEmbedCarrinhoDetalhes };
