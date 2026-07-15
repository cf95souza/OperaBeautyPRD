import express from 'express';
import multer from 'multer';

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/api/clients/:id/timeline', upload.single('image'), (req, res) => {
  console.log('Headers:', req.headers['content-type']);
  console.log('Body:', req.body);
  console.log('File:', req.file);

  const { content } = req.body;
  const image_path = req.file ? req.file.path : null;

  if (!content && !image_path) {
    return res.status(400).json({ error: 'Conteúdo da nota ou imagem são obrigatórios.' });
  }

  res.json({ success: true, content, image_path });
});

app.listen(3333, () => console.log('Listening on 3333'));
