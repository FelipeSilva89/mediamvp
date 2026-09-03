# MediaMVP

PWA de sinalização digital para exibição contínua em tablet ou TV. O player alterna notícias regionais do G1, previsão do tempo de Itapetininga e um espaço de publicidade. O uso principal é em tela cheia, sem interação depois que o operador inicia o player.

## Visão geral

O projeto é um frontend estático, sem framework e sem etapa de build. O frontend chama um Cloudflare Worker público, que:

- lê o RSS de `G1 Itapetininga e Região`;
- normaliza os cinco primeiros itens de notícia;
- encontra imagens no RSS ou na página da notícia;
- entrega imagens por proxy com allowlist de domínios;
- consulta a API Meteoblue `basic-day` para sete dias em Itapetininga.

Fluxo da tela:

1. Ao abrir, o operador toca em **INICIAR PLAYER**.
2. O navegador tenta entrar em fullscreen e adquirir Wake Lock para manter a tela ligada.
3. Os slides são exibidos por 10 segundos cada, com barra de progresso.
4. A playlist contém, na ordem, notícias 1 e 2, clima, notícias 3 e 4, publicidade e notícia 5.

## Arquivos

- `index.html`: tela inicial, contêiner do player e registro do service worker.
- `app.js`: estado do player, carregamento de notícias e clima, geração dos slides, fullscreen, Wake Lock e agendadores.
- `style.css`: layout dos slides, estilos da tela inicial, notícias, clima, publicidade e responsividade.
- `worker.js`: backend Cloudflare Worker e proxy das fontes externas.
- `sw.js`: cache offline dos arquivos estáticos e fallback de rede.
- `manifest.json`: metadados para instalação como PWA; ainda não há ícones configurados.

## Contratos externos

### Worker

URL usada pelo frontend em `app.js`:

`https://billowing-thunder-176amediamvp.drigo-felipe.workers.dev`

Rotas:

- `GET /`: busca o RSS e retorna `{ success, source, updatedAt, count, news }`.
- `GET /weather`: consulta Meteoblue e retorna `{ success, location, updatedAt, forecast }`.
- `GET /image?url=...`: faz proxy de imagens somente de `g1.globo.com` e subdomínios de `glbimg.com`.
- `OPTIONS`: responde ao preflight CORS.

Cada item de `news` possui `title`, `description`, `link`, `pubDate` e `image`. Cada item de `forecast` possui `date`, `max`, `min` e `conditionCode`.

### Variáveis do Worker

O deploy precisa fornecer o secret `METEOBLUE_API_KEY`. A chave não deve ser colocada no `app.js`, no HTML ou neste README. O Worker usa as coordenadas de Itapetininga (`-23.5917`, `-48.0531`), timezone `America/Sao_Paulo` e `forecastDays=7`.

## Atualização e cache

### Notícias

- Limite: cinco notícias.
- Intervalo no frontend: três horas.
- Em erro, as notícias já carregadas permanecem na tela.
- O Worker define cache HTTP de três horas para respostas e imagens.

### Clima

- Primeira abertura sem dados locais: busca imediatamente.
- Atualiza às segundas e quintas após 05:30.
- Se o tablet estava desligado no horário, atualiza na primeira abertura daquele dia.
- Nos demais dias, usa a previsão salva em `localStorage`.
- Chaves locais: `mediaMvpWeather` e `mediaMvpWeatherLastUpdate`.
- A última atualização é exibida no slide; não há temperatura atual, somente máximas e mínimas diárias.
- O cache do Worker para clima dura 70 horas, suficiente para cobrir o intervalo entre atualizações programadas.

O horário do agendamento é o horário local do dispositivo. A API Meteoblue é consultada explicitamente no timezone de Sao Paulo.

## Execução local

Não abra `index.html` diretamente com `file://`: o service worker exige um contexto seguro. Sirva a pasta por HTTP, por exemplo:

```powershell
py -m http.server 8000
```

Depois acesse `http://localhost:8000`. Não existe `package.json`, portanto não há `npm install`, build ou suíte de testes configurada. Para testar o fluxo completo, o dispositivo precisa ter acesso à URL do Worker e o navegador deve suportar fullscreen e, idealmente, Wake Lock.

## Deploy

### Frontend

Publique os arquivos estáticos `index.html`, `app.js`, `style.css`, `manifest.json` e `sw.js` em hospedagem HTTPS. O service worker usa cache-first; ao publicar alterações, incremente `CACHE_NAME` em `sw.js` para forçar uma nova versão dos arquivos.

### Worker

Publique `worker.js` em Cloudflare Workers e configure `METEOBLUE_API_KEY` como secret. A URL publicada precisa ser atualizada em `NEWS_API_URL` caso o Worker seja renomeado ou trocado.

## Pontos de manutenção

- Ao alterar o formato de `forecast`, atualize simultaneamente `handleWeather()` no Worker, `loadWeather()` e `createWeatherSlide()` no frontend.
- Ao alterar a quantidade ou ordem dos slides, revise `renderPlaylist()` e o contador das notícias.
- Ao trocar fontes de imagem, atualize `ALLOWED_IMAGE_HOSTS`; a allowlist existe para impedir que o proxy busque qualquer URL arbitrária.
- O parser do RSS e os extratores de imagem são baseados em expressões regulares. Mudanças no markup do G1 podem exigir ajuste em `parseRSS()`, `findArticleImage()` e seus helpers.
- O cache local de clima pode ser limpo pelo DevTools em Application/Storage, removendo `mediaMvpWeather` e `mediaMvpWeatherLastUpdate`.
- A publicidade atual é apenas um placeholder. Não existe cadastro, agendamento ou carregamento de anúncios.

## Checklist de diagnóstico

1. Verifique o Console do navegador: o app registra carregamento de notícias, clima, playlist e Wake Lock.
2. Teste `GET /` e `GET /weather` na URL do Worker e confirme respostas `success: true`.
3. Se notícias aparecem sem imagem, verifique o retorno de `GET /image?url=...` e o `Content-Type` da imagem.
4. Se arquivos antigos continuam carregados, incremente `CACHE_NAME` e recarregue o PWA.
5. Se o clima não atualiza, confira a chave `METEOBLUE_API_KEY`, o horário local do tablet e o valor salvo em `mediaMvpWeatherLastUpdate`.

## Próximos passos naturais

- Adicionar ícones reais ao `manifest.json`.
- Criar uma configuração de deploy do Worker (por exemplo, `wrangler.toml`) sem incluir secrets.
- Separar configurações editáveis, como URL do Worker, duração dos slides e publicidade, do código principal.
- Adicionar testes para parsing do RSS, normalização do clima e regras de atualização.
