import fetch, { FormData } from 'node-fetch';

async function test() {
  const fd = new FormData();
  fd.append('content', 'Teste de anotação');
  
  const res = await fetch('http://localhost:5000/api/clients/1/timeline', {
    method: 'POST',
    body: fd,
  });
  
  const data = await res.text();
  console.log(res.status, data);
}
test();
