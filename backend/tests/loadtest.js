import autocannon from 'autocannon';

const url = process.argv[2] || 'http://localhost:5000/api/tenants/by-slug/salaoteste';

console.log(`Iniciando teste de carga na URL: ${url}`);
console.log('Simulando 100 usuários simultâneos por 30 segundos...\n');

const instance = autocannon({
  url,
  connections: 100, // Número de requisições concorrentes
  duration: 30,     // Duração do teste em segundos
  pipelining: 1     // Requisições por conexão antes de esperar resposta
});

autocannon.track(instance, { renderProgressBar: true });

instance.on('done', (result) => {
  console.log('\n--- RESULTADOS DO TESTE DE CARGA ---');
  console.log(`Total de Requisições: ${result.requests.total}`);
  console.log(`Taxa de Requisições por Segundo (Req/Sec): ${result.requests.average.toFixed(2)}`);
  
  console.log('\n--- LATÊNCIA (ms) ---');
  console.log(`Média: ${result.latency.average} ms`);
  console.log(`P50 (Mediana): ${result.latency.p50} ms`);
  console.log(`P95: ${result.latency.p95} ms`);
  console.log(`P99: ${result.latency.p99} ms`);
  console.log(`Máxima: ${result.latency.max} ms`);

  console.log('\n--- ERROS ---');
  console.log(`Erros de rede (Timeouts/Broken): ${result.errors}`);
  console.log(`Respostas com erro HTTP (4xx, 5xx): ${result.non2xx}`);

  if (result.latency.p95 <= 200) {
    console.log('\n✅ SUCESSO: Latência P95 está abaixo de 200ms!');
  } else {
    console.log('\n⚠️ ALERTA: Latência P95 está acima de 200ms. Verifique a infraestrutura/cache.');
  }
});
