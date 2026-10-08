# Integração MCP — contrato da instalação existente

Atualização: 2026-10-06. API: `https://api.authenchain.com`. Painel e login: `https://forgetechindustrial.cloud`. O domínio antigo continua aceito durante a transição. A candidata MCP é `0.1.1-rc.2`, ainda não publicada em npm/Registry. A atualização do VPS não publica automaticamente os pacotes.

## Transporte e credenciais

O transporte disponível nesta rodada é stdio com chamadas HTTPS à mesma aplicação em produção. O gateway remoto/OAuth, cadastro público, DCR e escrita MCP de produção permanecem desligados. Metadados de Registry não anunciam o hostname remoto enquanto DNS, TLS, identidade e aprovação não forem validados. Os provedores atuais de login são preservados; a retirada exige flag explícita, prazo e migração próprios.

A chave MCP tem finalidade persistida `mcp_headless` e somente leitura, inclusive em sandbox e no acesso HTTP direto. Chaves legadas que contêm `mcp:connect` recebem a mesma restrição no backend. Escopos permitidos: `mcp:connect`, escopos `:read`, `provenance:verify`, `provenance:events` e `audit:export`. O default sandbox contém apenas esses acessos. Uma integração geral com finalidade `integration`, sem `mcp:connect`, conserva a escrita explicitamente autorizada; não use essa chave como credencial MCP.

O perfil default `read-only` anuncia nove tools: connection_status, list/get_use_cases, list/get_ai_systems, get_readiness, list_pending_governance, lookup_evidence e verify_provenance. Os nomes exatos de consulta individual são `get_use_case` e `get_ai_system`. `full` exige OAuth interativo configurado. Registrar caso/sistema, classificar e assinar não ficam disponíveis para headless. A tool `capture_sign_hash` permanece como alias obsoleto de `sign_provenance_hash` até a próxima versão major, com o mesmo binding canônico de aprovação.

Para ensaio a partir do checkout revisado: `npm ci`, `npm run build:mcp`, depois `node packages/mcp/dist/cli.js`, com `AUTHENCHAIN_API_KEY` e `AUTHENCHAIN_MCP_ENVIRONMENT` no ambiente. Nunca passe segredo em argv. Use `AUTHENCHAIN_BASE_URL` apenas para uma origem HTTPS explicitamente permitida; `AUTHENCHAIN_DASHBOARD_URL` identifica o painel, não a API.

## Escrita interativa preparada para ativação futura

Preview não altera domínio. Sandbox usa confirmação de cinco minutos; produção usa aprovação em sessão humana separada no painel com MFA recente (cinco minutos). A mesma pessoa pode aprovar quando seu RBAC permite; não há regra universal de duas pessoas. O vínculo cobre usuário, organização, cliente, tool, ambiente, motivo de 3–1.000 caracteres, payload e Idempotency-Key. A API revalida a autorização atual, consome a aprovação e grava domínio, histórico, auditoria e resultado na mesma transação. Cliente aprovado não promove OWNER/editor/viewer.

A flag central `AUTHENCHAIN_MCP_ALLOW_PRODUCTION_WRITES` precisa ser exatamente `true`; nesta implantação permanece `false`. O ID de aprovação sozinho e SensitiveAction/428 não provam aprovação humana. Token com consentimento reduzido não herda escopos de grants anteriores; resources e prompts também verificam a permissão atual antes de HTTP. O token atual é repassado ao backend para nova validação, sem chave interna com escopos acumulados.

## Idempotência e limites

As quatro mutações MCP exigem Idempotency-Key (428 ausente, 400 formato inválido), 8–128 caracteres `[A-Za-z0-9._:-]`. Integrações humanas/gerais mantêm a chave opcional; fornecê-la é recomendado. As três mutações regulatórias exigem Content-Length: 411 ausente, 413 acima de 1 MiB, 400 inválido/divergente/JSON inválido. Assinatura tem teto 256 KiB; MCP exige tamanho, integrações legadas podem enviar streaming limitado. Clientes Node/Python enviam o tamanho efetivo dos bytes UTF-8.

O lease dura cinco minutos e a resposta 24 horas. Recuperação troca geração por CAS; execução antiga não pode commitar efeito. Falhas 4xx finais são cifradas e repetidas, exceto 408/429; 408/429/5xx são retryable. Após 503/429 siga Retry-After e retry exponencial com jitter (1, 2, 4, 8 segundos, teto 30 segundos), preservando payload e chave. Crash permite recuperação após lease. Conflito de serialização é transitório e não deixa efeito parcial. Replay conserva corpo, status, trace original, warnings e headers públicos; acrescenta Idempotency-Replayed e correlação da nova tentativa. Cookies e Authorization não são armazenados. Resultados legados de assinatura sem cache cifrado são reconstruídos do evento já concluído; warnings/headers históricos ausentes não podem ser recuperados, e o efeito não é reexecutado.

APP_ENCRYPTION_KEY protege o ledger. Uma troca sem recifrar torna o replay indisponível e nunca autoriza reexecução de um resultado concluído. Planeje rotação com drenagem, backup e recifragem controlada ou aguarde a retenção de 24 horas, preservando as demais finalidades dessa chave.

## Assurance e verificação

O envelope 1.1 assina `metadata.assurance` com `authenchain.assurance.v1`. A0 = attest_submitted_hash, contentObserved=false: a plataforma recebeu o hash e não viu o conteúdo original. A1 = observe_submitted_content, contentObserved=true: a plataforma calculou o hash de bytes submetidos. Ambos não provam autoria, horário de criação, identidade do modelo, verdade ou conformidade jurídica. A atribuição ocorre no serviço de assinatura; o cliente não pode promover nível.

A2 reserva observação independente com origem autenticada; A3 reserva atestação de execução vinculada a conteúdo e identidade; A4 reserva cadeia independente completa e validada. São requisitos de fluxos futuros, não garantias emitidas nesta versão; nenhuma dessas três categorias pode ser atribuída hoje. Não há upgrade automático de envelope 1.0: assurance é legada/não declarada. Assinatura inválida, chave desconhecida/revogada e metadados adulterados tornam a assurance não autenticada.

verify_provenance aceita proveniência individual ou Evidence Pack completo limitado a 1 MiB. Reutiliza o verificador público e retorna resultados por camada/prova, assinatura, payload, auditoria, âncora, envelope, chave/trust, assurance e limitações (incluindo unknown/not_checked). Lookup é somente busca no registro público; `cryptographicEvidencePackVerified=false`. A tool recusa conteúdo bruto e credenciais.

## Webhook v1 e privacidade

HMAC v1 permanece `v1.timestamp.nonce.eventId.rawBody`. X-AuthenChain-Max-Age não é assinado: somente encurta aceitação, nunca amplia o teto local/300 segundos. O nonce permanece reservado até timestamp+300 segundos, independentemente desse header. Use store persistente com SET NX e TTL, namespace por integração/versão do segredo, sem o segredo em texto. Store indisponível nunca aceita mensagem. Verifique bytes originais antes de parsear JSON; aceite somente um vencedor concorrente.

IP/UA nos emissores Node/Edge usam HMAC-SHA256 com chave dedicada SECURITY_EVENTS_HMAC_KEY_CURRENT e identificador de versão, com separação por finalidade; não reutilizam segredo de autenticação/proveniência/criptografia. Pesquisa inclui no máximo chave atual e anterior. Preserve a anterior durante a retenção de AuditLog (AUDIT_LOG_RETENTION_DAYS, default 180 dias; legal hold é respeitado) e então remova-a. Com duas chaves de pesquisa, não rode nova rotação ordinária antes de esgotar essa janela; incidente de chave exige retirada imediata e registro da perda de correlação. O stdout/stderr local tem rotação por volume (default 3 arquivos de 50 MiB por serviço), sem promessa de retenção mínima em dias. Persistência opcional de security events em AuditLog grava apenas pseudônimos em metadata, sem IP/UA brutos. Registros FNV legados continuam legados. Na ausência da chave dedicada em produção os identificadores são omitidos; readiness bloqueia a release.

## Credenciais OAuth do CLI

Quando OAuth for ativado, macOS usa binding nativo Keychain sem segredo em argv; outros sistemas usam AES-256-GCM, scrypt e passphrase, arquivo 0600/diretório 0700 e troca atômica. A seleção do store é persistida; indisponibilidade não ressuscita cache antigo. Login/refresh/logout usam lock entre processos. Um lock órfão falha fechado: confirme que o PID proprietário morreu antes de remover somente oauth-operation.lock no diretório de credenciais. Logout distingue exclusão local de revogação HTTP confirmada. Os testes usam tokens sintéticos e não acessam o Keychain real.
