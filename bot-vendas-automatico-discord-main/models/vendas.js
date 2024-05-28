const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const pagamentoSchema = new mongoose.Schema({
    server_id: String,
    user_id: String,
    pagamento_confirmado: Boolean,
    data: String,
    quantidade_produtos_vendidos: Number,
    valor: Number,
});

pagamentoSchema.plugin(AutoIncrement, { inc_field: '_id' });

const produtoSchema = new mongoose.Schema({
    server_id: String,
    nome: String,
    valor: Number,
    quantidade: { type: Number, default: 0 }
});

produtoSchema.plugin(AutoIncrement, { inc_field: '_id' });

const produtoEstoqueSchema = new mongoose.Schema({
    produtoId: Number,
    server_id: String,
    conteudo: String,
    data_adicao: Number,
});

const msgProdutoSchema = new mongoose.Schema({
    canal_id: String,
    msg_id: String,
    server_id: String,
    produtoId: Number,
});

const carrinhoSchema = new mongoose.Schema({
    server_id: String,
    user_id: String,
    msg_carrinho_status: String,
    produtos: [
        {
            msg_produto_id: String,
            produto_id: Number,
            produto_nome: String,
            produto_conteudo: String,
            produto_valor: Number,
            produto_data_adicao: Number,
        }
    ]
});

const produtoVendidoSchema = new mongoose.Schema({
    server_id: String,
    quantidade: { type: Number, default: 0 },
    data: Number,
    id: Number,
    nome: String,
});

module.exports.Pagamento = mongoose.model('Pagamento', pagamentoSchema);
module.exports.Produto = mongoose.model('Produto', produtoSchema);
module.exports.ProdutoEstoque = mongoose.model('ProdutoEstoque', produtoEstoqueSchema);
module.exports.MsgProduto = mongoose.model('MsgProduto', msgProdutoSchema);
module.exports.Carrinho = mongoose.model('Carrinho', carrinhoSchema);
module.exports.ProdutoVendido = mongoose.model('ProdutoVendido', produtoVendidoSchema);
