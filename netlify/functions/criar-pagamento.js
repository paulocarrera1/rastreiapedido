// netlify/functions/criar-pagamento.js
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
  }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: JSON.stringify({ error: 'Body inválido' }) }; }

  const { slug, nomeLoja } = body;
  if (!slug) return { statusCode: 400, body: JSON.stringify({ error: 'slug obrigatório' }) };

  const baseUrl = 'https://rastreiapedido.com.br';

  const preference = {
    items: [{
      id: `plano-sem-ads-${slug}`,
      title: `RastreiaJá Premium — ${nomeLoja || slug}`,
      description: 'Painel de entregas sem anúncios por 30 dias',
      quantity: 1,
      currency_id: 'BRL',
      unit_price: 9.90
    }],
    back_urls: {
      success: `${baseUrl}/sucesso.html?loja=${slug}&status=approved`,
      failure: `${baseUrl}/loja.html?loja=${slug}&status=failure`,
      pending: `${baseUrl}/loja.html?loja=${slug}&status=pending`
    },
    auto_return: 'approved',
    external_reference: slug,
    statement_descriptor: 'RastreiaJa',
    metadata: { slug, nomeLoja }
  };

  try {
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${slug}-${Date.now()}`
      },
      body: JSON.stringify(preference)
    });
    const data = await response.json();
    if (!response.ok) return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Erro MP', details: data }) };
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ id: data.id, init_point: data.init_point })
    };
  } catch (err) {
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: err.message }) };
  }
};
