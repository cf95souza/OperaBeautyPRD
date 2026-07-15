import fetch from 'node-fetch';
import FormData from 'form-data';

const formData = new FormData();
formData.append('content', 'Teste de comentario');

fetch('http://localhost:3333/api/clients/123/timeline', {
  method: 'POST',
  body: formData
}).then(res => res.json()).then(console.log).catch(console.error);
