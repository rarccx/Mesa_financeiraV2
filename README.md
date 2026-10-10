# Mesa Financeira — Etapa 1: controle de planos

## O que esta etapa inclui
- Planos: Piloto acompanhado (14 dias), Essencial (R$ 29,90/mês), BPO Essencial (R$ 350/mês) e BPO + sistema (R$ 399/mês).
- Registro de início, fim, status e situação do pagamento.
- Criação automática do piloto para novos usuários por trigger no Supabase; preenchimento de usuários existentes sem assinatura.
- Consulta individual da assinatura por RLS.
- Solicitação de plano pelo cliente, sem ativação ou cobrança automática.
- Tela de plano exibindo período e estado; a interface direciona para a tela de planos quando a assinatura está vencida, cancelada, pendente ou com pagamento não confirmado.

## Arquivos
- `index.html`: interface com ajustes de estado/expiração do plano.
- `style.css`: estilos existentes.
- `config.js`: configuração pública do Supabase do projeto.
- `supabase-planos.sql`: migração SQL da etapa 1.

## Instalação segura
1. Faça backup dos arquivos atuais no GitHub antes de substituir qualquer arquivo.
2. No Supabase, abra **SQL Editor**, revise o script `supabase-planos.sql` e execute-o uma vez.
3. Publique `index.html`, `style.css` e `config.js` no repositório do GitHub Pages.
4. Teste com uma conta de teste recém-criada e confirme em `public.mf_assinaturas` que ela recebeu piloto de 14 dias.
5. Teste com duas contas para confirmar que cada uma só consegue consultar a própria assinatura.

## Ativação manual
No Supabase SQL Editor, após confirmar o pagamento/contrato, use o exemplo comentado no final de `supabase-planos.sql` com o UUID correto. Para mensalidade, `fim=current_date + 30` é apenas um exemplo de período; ajuste ao ciclo de cobrança acordado.

## Limites desta etapa
- O bloqueio de interface é uma proteção de navegação, não uma barreira de segurança suficiente para dados ou operações. A autorização de cada ação e os dados protegidos precisam ser validados no servidor/RLS nas etapas seguintes.
- Ainda não há painel administrativo visual; a ativação é feita manualmente no SQL Editor nesta etapa.
- A migração não configura cobrança automática.
- A operação BPO com acesso delegado a dados de clientes não está incluída nesta etapa.
- Antes de usar com dados financeiros reais, teste a migração, os fluxos de autenticação, o isolamento RLS e o comportamento após expiração.
