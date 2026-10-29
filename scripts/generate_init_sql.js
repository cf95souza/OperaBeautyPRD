import fs from 'fs';

function extractSql() {
  const md = fs.readFileSync('database.md', 'utf-8');
  const regex = /```sql\n([\s\S]*?)```/g;
  let sql = '-- Arquivo auto-gerado a partir do database.md para inicialização da VPS\n\n';
  
  let match;
  while ((match = regex.exec(md)) !== null) {
    sql += match[1] + '\n\n';
  }
  
  fs.writeFileSync('init.sql', sql);
  console.log('init.sql gerado com sucesso!');
}

extractSql();
