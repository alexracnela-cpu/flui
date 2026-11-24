# Flui · Encaminhamentos, ofícios e ouvidorias

Acompanhamento dos pedidos: Cadastro → Avaliação (equipe) → Levantamento → Execução (equipe) → Resposta → Concluído.

- Site: GitHub Pages deste repositório.
- Banco, login e arquivos: Supabase (o mesmo projeto do Rondaluz; tudo do Flui tem o prefixo `flui_` e os arquivos ficam no bucket `flui`).
- `assets/config.js`: URL e chave pública do Supabase.
- `sql/1-flui-esquema.sql`: tabelas, regras de acesso e funções. Pode rodar de novo para atualizar.
- `sql/2-flui-carga-planilha.sql`: os 410 pedidos da planilha de 2026 (a equipe foi deduzida pelo serviço; o responsável original fica na observação).
- `supabase/functions/flui-convidar`: cria acessos (cole no editor de Edge Functions do Supabase com o nome `flui-convidar`).
- `.github/workflows/manter-acordado.yml`: consulta diária para o plano gratuito do Supabase não pausar o projeto.

## Setores
Cadastro de pedidos · Manutenção · Obras leves · Obras pesadas · Cadastro · Levantamento · Gerência (só consulta).
Cada pessoa só vê as abas do próprio setor; "Todos" aparece para todo mundo. O administrador também vê "Usuários".
