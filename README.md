# MediaMVP

PWA de sinalização digital (Digital Signage) para reprodução contínua em tablet ou TV. O player exibe notícias regionais do G1, previsão do tempo de Itapetininga e anúncios em imagem. A operação prevista é simples: o operador abre o player, toca em **INICIAR PLAYER** e a aplicação alterna os slides automaticamente.

## 1. Visão geral

A aplicação é composta por um frontend estático, sem framework e sem etapa de build, e um backend serverless executado em Cloudflare Workers. A tela inicial exibe a identidade MediaMVP, data, relógio e botão para iniciar o player.

O frontend carrega notícias e previsão do tempo, monta e controla a playlist, exibe imagens publicitárias locais, tenta ativar tela cheia e Wake Lock após a interação do operador e armazena a previsão do tempo no `localStorage`.

O Cloudflare Worker consulta o RSS regional do G1, extrai e normaliza notícias e imagens, disponibiliza um proxy de imagens com allowlist de domínios e consulta a API Meteoblue para previsão diária de sete dias.

## 2. Fluxo atual da playlist

A duração padrão dos slides é de **10 segundos**. A publicidade em imagem e o slide final “Anuncie Aqui” também usam 10 segundos.

Com cinco notícias e dois anúncios comerciais cadastrados, a ordem atual em `renderPlaylist()` é:

1. Notícia 1 — 10 s
2. Notícia 2 — 10 s
3. Publicidade 1 — 10 s
4. Clima — 10 s
5. Notícia 3 — 10 s
6. Notícia 4 — 10 s
7. Publicidade 2 — 10 s
8. Notícia 5 — 10 s
9. Imagem “Anuncie Aqui” — 10 s
10. Reinicia na Notícia 1.

A playlist é montada dinamicamente. Notícias ausentes não geram slides. O slide “Anuncie Aqui” é acrescentado ao final de cada rodada.

### Arquivos de publicidade

Os caminhos atualmente configurados em `app.js` são:

- `assets/ads/midia-indoor-Lucas-Franca(slide).png`
- `assets/ads/midia-indoor-Lucas-Franca(slide2).png`
- `assets/ads/anuncie-aqui.png`

Para adicionar, remover ou trocar anúncios, atualize os caminhos no array `ADVERTISEMENTS` ou a constante `ANNOUNCE_HERE_IMAGE`, conforme o tipo de slide. Colocar um arquivo na pasta, por si só, não o inclui na playlist.

As artes principais são exibidas inteiras, sem distorção. Uma cópia ampliada e desfocada da própria arte preenche o espaço restante da tela, evitando bordas pretas sem cortar textos ou QR codes. Para melhor resultado em telas horizontais, use imagens de **1920 × 1080 px (16:9)**.

### Tela inicial

A tela inicial usa `assets/images/media-mvp-background.png` como imagem de fundo, com ajuste `cover`. Logo, data, relógio, localização e botão **Iniciar** aparecem sobre a imagem; o relógio e a data usam o horário local do dispositivo. O botão inicia a playlist e solicita tela cheia e Wake Lock quando disponíveis no navegador.

## 3. Arquivos do projeto

- `index.html`: estrutura da tela inicial, contêiner do player, barra de progresso e registro do service worker.
- `app.js`: configurações, estado do player, carregamento de notícias e clima, montagem da playlist, renderização dos slides, timers, fullscreen e Wake Lock.
- `style.css`: estilos da tela inicial, notícias, clima, publicidade e responsividade.
- `worker.js`: backend Cloudflare Worker, integração com RSS/Meteoblue e proxy de imagens.
- `sw.js`: service worker da PWA e estratégia de cache Network First para arquivos da própria origem.
- `manifest.json`: metadados da PWA. Atualmente não há ícones configurados.

Não foi identificado `package.json`, processo de build ou suíte de testes automatizados nos arquivos analisados.

## 4. Contratos do Cloudflare Worker

URL configurada no frontend:

`https://billowing-thunder-176amediamvp.drigo-felipe.workers.dev`

Rotas:

- `GET /`: consulta o RSS e retorna `{ success, source, updatedAt, count, news }`.
- `GET /weather`: consulta a Meteoblue e retorna `{ success, location, updatedAt, forecast }`.
- `GET /image?url=...`: obtém imagens externas somente dos domínios permitidos.
- `OPTIONS`: responde às requisições de preflight CORS.

Cada notícia possui `title`, `description`, `link`, `pubDate` e `image`. Cada item da previsão possui `date`, `max`, `min` e `conditionCode`.

### Notícias

Fonte RSS configurada em `worker.js`:

`https://g1.globo.com/rss/g1/sp/itapetininga-regiao`

O Worker limita o retorno a cinco notícias e tenta obter imagem do RSS; caso ausente, procura metadados/imagens na página da notícia. O frontend identifica a fonte como **G1 Itapetininga e Região** e atualiza as notícias a cada três horas.

### Proxy de imagens

A rota `/image` valida a URL recebida e permite somente `g1.globo.com` e `glbimg.com` (incluindo subdomínios). Não remover essa validação nem transformar o proxy em um buscador de URLs arbitrárias: a allowlist protege contra acesso indevido a destinos externos.

## 5. Clima e consumo da Meteoblue

O Worker consulta o pacote **`basic-day`** da Meteoblue, para Itapetininga, com timezone `America/Sao_Paulo` e previsão de sete dias.

Coordenadas:
- Latitude: `-23.5917`
- Longitude: `-48.0531`

A resposta usada pelo frontend contém `date`, `max`, `min` e `conditionCode` para cada dia. O slide apresenta máximas, mínimas, condição meteorológica e data/hora da última atualização. Não há temperatura atual por hora.

### Política de atualização no frontend

Configuração atual em `app.js`:

- Atualização programada: segunda e quinta-feira, às **05:30**, no horário local do dispositivo.
- Limite de validade: após **4 dias** sem atualização, uma nova consulta fica elegível.
- Proteção de frequência: não realizar outra consulta se a última chamada bem-sucedida ocorreu há menos de **24 horas**.
- Primeira execução sem previsão local válida: consulta imediatamente.
- Ao iniciar, o player carrega primeiro a previsão salva e verifica se uma atualização é necessária.
- Se o dispositivo ficou desligado e for ligado em um dia fora da agenda, a verificação de inicialização pode realizar a atualização emergencial quando o intervalo máximo tiver sido ultrapassado.
- A previsão é persistida nas chaves `mediaMvpWeather` e `mediaMvpWeatherLastUpdate`.
- O horário da última atualização é armazenado como timestamp ISO (`toISOString()`).

**Importante sobre o limite de quatro dias:** no código analisado, a verificação emergencial é feita na inicialização do player. Enquanto o player permanece aberto, o timer agenda as verificações para os próximos horários programados (segunda/quinta às 05:30); não existe um timer diário separado para disparar exatamente no instante em que se completam quatro dias. Portanto, a regra deve ser entendida como uma verificação de validade ao iniciar e nos horários programados, e não como um alarme exato de 96 horas.

A trava de 24 horas e a regra de quatro dias são controles do frontend. O Worker não implementa, no código analisado, um controle global de chamadas por dispositivo. O cache HTTP do endpoint `/weather` está configurado para **70 horas** (`WEATHER_CACHE_SECONDS = 70 * 60 * 60`). Uma requisição ao Worker pode ser atendida por uma resposta em cache; não se deve assumir que cada acesso ao endpoint necessariamente representa uma nova chamada faturável à Meteoblue.

### Secret

O deploy do Worker exige o secret `METEOBLUE_API_KEY`. A chave deve ser configurada como secret no Cloudflare e nunca deve ser colocada no frontend, no HTML, no repositório ou neste README.

## 6. Execução local

Não abra `index.html` diretamente por `file://`, pois o service worker exige contexto seguro. Sirva a pasta por HTTP, por exemplo:

```powershell
py -m http.server 8000
```

Acesse `http://localhost:8000`.

Para testar notícias e clima, o navegador precisa ter acesso à URL pública do Worker. Fullscreen e Wake Lock dependem do suporte do navegador e da interação do usuário.

## 7. Service Worker, cache e publicação

O `sw.js` analisado utiliza estratégia **Network First** para arquivos da mesma origem:

1. Durante a instalação, abre o cache identificado por `media-player-2026-11-10-1` e pré-carrega `./`, `index.html`, `style.css`, `app.js`, `manifest.json` e `assets/images/media-mvp-background.png`.
2. Durante a ativação, remove os caches cujo nome seja diferente do cache atual e assume o controle das páginas abertas.
3. Para requisições `GET` da própria origem, tenta buscar a versão da rede primeiro.
4. Quando a busca de rede funciona, inicia a gravação de uma cópia no cache e devolve a resposta.
5. Se a rede falhar, tenta responder com uma cópia existente no cache.
6. Para requisições externas, incluindo Worker e APIs, encaminha diretamente para `fetch()`; essas respostas não são armazenadas por esse Service Worker.
7. Requisições que não sejam `GET` não são interceptadas.

### Atualização da versão em cache

A versão atual está definida em `APP_VERSION` como `2026-11-10-1`. Ao publicar uma nova versão do frontend, altere esse valor para um identificador novo. Isso cria um novo nome de cache; na ativação, os caches antigos são removidos.

O `sw.js` chama `skipWaiting()` na instalação e `clients.claim()` na ativação. Ainda assim, uma página que já esteja aberta pode continuar executando o JavaScript carregado anteriormente até ser recarregada ou reaberta.

### Observações técnicas do código atual

- A resposta da rede é gravada no cache sem verificar `response.ok`; portanto, respostas HTTP de erro também podem ser armazenadas.
- A gravação via `cache.put()` é iniciada, mas não é aguardada antes de devolver a resposta ao navegador.
- No fallback offline, `caches.match(request)` procura a requisição nos caches disponíveis. Como a ativação apaga caches antigos, o fallback depende principalmente do cache da versão ativa.
- O cache inicial contém os arquivos listados acima. Outros assets locais, como imagens de publicidade, podem entrar no cache quando forem solicitados pela rede, mas não são pré-carregados nessa lista.

O fundo da tela inicial foi incluído no pré-carregamento para que também possa ser exibido após uma visita anterior, inclusive quando o dispositivo estiver offline.

### Frontend

Publique por HTTPS os arquivos estáticos do frontend e os assets referenciados. Inclua `sw.js` na publicação, mantendo o caminho esperado pelo registro em `index.html` (`./sw.js`). Depois de publicar, valide no dispositivo se o Service Worker ativo está usando a nova versão.

### Worker

Publique `worker.js` no Cloudflare Workers e configure `METEOBLUE_API_KEY` como secret. Se a URL do Worker mudar, atualize `NEWS_API_URL` em `app.js`.

## 8. Regras de manutenção

- Alterações no contrato `forecast` devem ser refletidas no Worker (`handleWeather()`), no frontend (`loadWeather()` e `createWeatherSlide()`) e nesta documentação.
- Alterações na ordem ou quantidade de slides devem ser feitas em `renderPlaylist()` e validadas junto com a duração por slide.
- Alterações nas imagens de publicidade devem respeitar os caminhos configurados em `ADVERTISEMENTS` e `ANNOUNCE_HERE_IMAGE`.
- Ao publicar uma nova versão do frontend, atualize `APP_VERSION` em `sw.js` para invalidar o cache anterior. Se o nome ou caminho do fundo da tela inicial mudar, atualize também a lista `FILES_TO_CACHE`.
- Alterações nas fontes de imagem devem ser acompanhadas de revisão de `ALLOWED_IMAGE_HOSTS`; preservar a validação de domínio.
- O parser RSS e os extratores de imagem usam expressões regulares. Mudanças no markup do G1 podem exigir ajustes em `parseRSS()`, `findArticleImage()` e helpers relacionados.
- Não reduzir a proteção de frequência nem aumentar a frequência da Meteoblue sem avaliar o orçamento de créditos.
- Não incluir a chave da Meteoblue em arquivos públicos.
- Se alterar o formato do timestamp de `WEATHER_LAST_UPDATE_KEY`, considerar a compatibilidade com valores já gravados no `localStorage`.

## 9. Diagnóstico

1. No Console do navegador, verifique os logs de carregamento de notícias, clima, criação da playlist e Wake Lock.
2. Teste `GET /` e `GET /weather` diretamente e confirme `success: true`.
3. Se notícias não exibirem imagem, verifique a URL de `/image`, o status HTTP e o `Content-Type`.
4. Se o clima não atualizar, confira `METEOBLUE_API_KEY`, o horário local do tablet, as chaves `mediaMvpWeather` e `mediaMvpWeatherLastUpdate` e a regra `shouldUpdateWeather()`.
5. Se o player mantiver arquivos antigos, inspecione o service worker ativo e o cache do navegador antes de alterar a estratégia.
6. Se a previsão estiver antiga, diferencie uma chamada ao Worker de uma chamada efetiva à API Meteoblue; verifique também o cache HTTP de 70 horas.

## 10. Pendências e evoluções possíveis

- Adicionar ícones reais ao `manifest.json`.
- Avaliar se o `sw.js` deve armazenar somente respostas HTTP bem-sucedidas e aguardar a gravação no cache (`cache.put`) antes de concluir a resposta.
- Considerar centralizar configurações editáveis (URL do Worker, durações e assets) em um arquivo de configuração.
- Criar testes para parser RSS, normalização dos dados meteorológicos, montagem da playlist e regras de atualização.
- Evoluir a gestão de anúncios para cadastro, períodos de veiculação e relatórios, quando houver necessidade de produto.
