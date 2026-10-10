# Mesa Financeira — versão com planos (etapa inicial)

## Conteúdo
- `index.html`: interface atual com a seção **Meu plano**, seleção de plano e envio de solicitação.
- `style.css`, `config.js`: arquivos base da aplicação.
- `supabase-planos.sql`: migração incremental de planos e solicitações.

## Publicação
1. Faça backup dos arquivos atuais do repositório GitHub.
2. No Supabase > SQL Editor, revise e execute `supabase-planos.sql`.
3. No GitHub, substitua `index.html` pela versão deste pacote. Mantenha/substitua `style.css` e `config.js` pelos arquivos correspondentes.
4. Não publique chave `service_role`. O `config.js` contém a chave pública anon; a segurança depende de RLS.
5. Aguarde o GitHub Pages publicar e teste com uma conta de teste.

## Ativar manualmente um plano
A solicitação de plano é criada pelo cliente, mas a ativação é deliberadamente manual. No Supabase SQL Editor, confirme a solicitação e atualize a assinatura usando o UUID do usuário obtido em Authentication > Users. Exemplo:

```sql
update public.mf_assinaturas
set plano = 'essencial',
    status = 'ativo',
    inicio = current_date,
    fim = null,
    pagamento_status = 'pago',
    atualizado_em = now()
where user_id = 'UUID-DO-USUARIO';
```

Para um piloto de 14 dias:
```sql
insert into public.mf_assinaturas(user_id, plano, status, inicio, fim, pagamento_status)
values ('UUID-DO-USUARIO','piloto','piloto',current_date,current_date+13,'pendente')
on conflict(user_id) do update set
 plano='piloto', status='piloto', inicio=current_date,
 fim=current_date+13, pagamento_status='pendente', atualizado_em=now();
```

## Limitações importantes desta entrega
- A interface exibe plano e solicitações, mas **não inclui ainda um painel administrativo completo para operar clientes**. A gestão de planos está, nesta etapa, no SQL Editor.
- O bloqueio por data nesta versão é de interface e não substitui autorização no banco/API. Para cobrança real e proteção efetiva das funções, a autorização precisa ser aplicada também em RLS/Edge Functions.
- O app atual criptografa o conteúdo financeiro no navegador com uma senha de ambiente exclusiva do cliente. Isso impede que um operador BPO veja esses dados sem uma arquitetura de acesso delegado explícita. Não contorne isso compartilhando senhas. A próxima etapa deve migrar para um modelo multi-tenant com organizações, membros e permissões de operador, revisando RLS e o modelo criptográfico antes de liberar acesso a dados reais.
- O script cria assinaturas para usuários já existentes. Novos cadastros precisam receber assinatura por trigger seguro ou Edge Function; não conceda permissão de escrita de plano ao usuário final.
- Teste isolamento entre duas contas, expiração, recuperação de dados e políticas RLS antes de usar com clientes reais.
