# tyulkin

Интерактивное резюме в виде терминала: посетитель вводит команды (`help`, `about`, `experience`,
`settings` …) и получает ответы в консоли. React 18 + TypeScript 6, сборка webpack 5, без бэкенда.

## Запуск

Нужен Node из поля `engines` в `package.json` (`^22.22.2 || >=24.15.0`; CI работает на Node 22).

```bash
npm ci
npm run dev     # dev-сервер с HMR + пересборка типов SCSS-модулей в watch-режиме
npm run build   # прод-сборка в dist/
```

| Скрипт                      | Что делает                                                                                                           |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `npm start`                 | только `webpack-dev-server` (открывает браузер, HMR)                                                                 |
| `npm run typed-styles`      | `typed-scss-modules "src/**/*.module.scss" --watch` — генерация `*.module.scss.d.ts`                                 |
| `npm run dev`               | `start` и `typed-styles` параллельно (`concurrently`)                                                                |
| `npm run build`             | `webpack --mode production`                                                                                          |
| `npm test`                  | `vitest run` (jsdom, файлы `src/**/*.test.{ts,tsx}`)                                                                 |
| `npm run test:e2e`          | Playwright: прод-сборка под `/tyulkin/` в `dist-e2e/` + сценарии из `e2e/` (нужен `npx playwright install chromium`) |
| `npm run lint` / `lint:fix` | ESLint по всему репо, `--max-warnings 0`                                                                             |
| `npm run prettier`          | `prettier --write .`                                                                                                 |

### Проверки (как в CI)

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) запускается на каждый PR и push в
`master` и выполняет по порядку:

```bash
npx typed-scss-modules "src/**/*.module.scss" --listDifferent   # .d.ts актуальны
npx tsc --noEmit
npm run lint
npx prettier --check .
npm test
npm run build
```

Параллельно идёт job `e2e` (`npm run test:e2e`), а после зелёных `check` и `e2e` на `master` —
`deploy`.

## Деплой

Сайт публикуется на GitHub Pages job-ом `deploy` в [`ci.yml`](.github/workflows/ci.yml) на каждый
push в `master`, если прошли проверки и e2e. В настройках репозитория (Settings → Pages) источником
должен быть выбран **GitHub Actions**.

- Сайт проекта живёт в подкаталоге (`https://<user>.github.io/tyulkin/`), поэтому сборка принимает
  `--env basePath=/tyulkin/`: из него берутся `publicPath` ассетов и `basename` роутера
  (`__BASE_PATH__` через `DefinePlugin`). По умолчанию — `/`.
- SPA-фолбэк: Pages отвечает `404.html` на любой неизвестный путь, а прод-сборка кладёт туда копию
  `index.html` — прямой заход на `/tyulkin/settings` открывает приложение (со статусом 404).
- Публикуется ровно та сборка, которую проверили e2e: `npm run test:e2e` собирает `dist-e2e/` под
  `E2E_BASE_PATH` (по умолчанию `/tyulkin/`, в CI — `/<имя репо>/`), а
  [`e2e/server.mjs`](e2e/server.mjs) раздаёт её как Pages (подкаталог, `404.html`, редирект
  `/tyulkin` → `/tyulkin/`). Со своим доменом в `ci.yml` достаточно поставить `E2E_BASE_PATH: /`.

## Структура

```
src/
  main.tsx              точка входа: React root, шрифт, глобальные стили
  App.tsx               загрузка словаря, тема, <html lang>, провайдеры контекстов
  index.html            шаблон: мета-теги, <noscript> с текстом резюме
  router/               ROUTES (const.ts), routes.tsx — страницы-консоли и обычный вид /gui
  pages/                ConsolePage, GuiPage, ErrorPage, LoadingPage
  components/           Console, Input (+ хуки истории и подсказок), Logs, Char, CommandsHint
  commandHandlers/      реестр команд (commands/), разбор ввода (utils.ts), WithCommandHandler
  context/              React-контексты: app, console, handler, localization
  store/                useReducer-сторы приложения (тема, статус) и консоли (логи, история, каретка)
  localization/         словари dictionaries/{eng,ru}.json, типы ключей, подстановка аргументов
  domain/               общие доменные типы: темы, режимы каретки, oneOf
  storage/              localStorage с валидацией значений
  analytics/            события аналитики (Umami), без скрипта — no-op
  styles/themes.scss    CSS-переменные тем
```

## Как устроено

### Команды

Команды — данные, а не switch: каждая описана объектом `Command`
([`commandHandlers/interfaces.ts`](src/commandHandlers/interfaces.ts)) с полями `name`,
необязательными `aliases` и `params` (значения единственного аргумента, участвуют в
автодополнении), `descriptionKey` (строка в `help`) и `run(ctx, args)`. `ctx` даёт `log`, `t`,
`navigate`, диспатчеры сторов, `changeLanguage`, текущие язык, тему и каретку и список доступных
команд.

`log` принимает `LogNode` или их массив
([`store/console/interfaces.ts`](src/store/console/interfaces.ts)): строку (простой текст),
цветной текст, ссылку, имя команды, таблицу или `pre`-блок. Помощники — в
[`store/console/logNodes.ts`](src/store/console/logNodes.ts): ссылки из текстов владельца делает
`linkify`; ввод посетителя всегда остаётся простым текстом.

Реестр — [`src/commandHandlers/commands/`](src/commandHandlers/commands):

- `global.ts` — команды, доступные на любой странице (`help`, `ls`, `clear`, `back`, `menu`,
  `neofetch`, `gui`, `share`, `matrix`, `secrets`, `history`, `echo`, `whoami`, `pwd`, `date`);
- `main.ts`, `settings.ts` — команды страниц;
- `secrets.ts` — пасхалки (`sudo …`, `rm -rf /`, `vim`, `cowsay`, `fortune`, `sl`, `coffee`):
  `SecretCommand` без описания, их нет в `help`, `ls`, автодополнении и «did you mean»; они
  проверяются, только если не подошла ни одна обычная команда. Первый запуск отмечает секрет
  найденным (`storage`, список — `secretIds` в `src/domain`, туда же входит код Konami), прогресс
  показывает `secrets`. Deep link (`?cmd=`) пасхалки не запускает;
- `index.ts` — `commandsByRoute`: какие команды у какого маршрута.

Ввод регистронезависим; команды страницы имеют приоритет над глобальными.

Сводку в стиле neofetch (логотип, `ключ: значение`, полоска цветов темы) строит
[`commandHandlers/neofetch.ts`](src/commandHandlers/neofetch.ts): её выводит команда `neofetch`, ею
же приветствует главная страница.

`changelog` на главной — история сайта из его коммитов: `git log` читается при сборке
([`scripts/git-log.cjs`](scripts/git-log.cjs), `__GIT_LOG__` через `DefinePlugin`), в историю идут
коммиты формата `[add]|[fix]|[refactor] …`; без `--all` — последние 10. Сборке нужна полная история
(в CI — `fetch-depth: 0`, там ошибка git роняет сборку); локально без git команда сообщает, что истории нет.

**Привычки шелла** ([`commandHandlers/shell.ts`](src/commandHandlers/shell.ts)). `!!` в строке
заменяется предыдущей командой (`sudo !!`), в историю попадает развёрнутая строка. `<команда> | grep
[-i] <слово>` (можно несколько `| grep` подряд) выполняет команду и оставляет в её выводе только строки
со словом, подсвечивая его: строка таблицы из однострочных ячеек (как в `help`) — одна строка,
многострочные ячейки и `pre` фильтруются построчно; после `|` поддерживается только `grep`. `Ctrl+R` в
поле ввода — обратный поиск по истории, как в bash: `Ctrl+R` ещё раз — более старое совпадение, Enter —
выполнить, стрелки/Tab/Home/End — вставить в строку, Esc/`Ctrl+G` — отменить
([`Input/hooks/useReverseSearch.ts`](src/components/Input/hooks/useReverseSearch.ts)). `pwd` пока
выводит каталог страницы (`/home/visitor`, `/home/visitor/settings`) — `getWorkingDirectory`, её
заменит виртуальная ФС (TASK-60). `echo` помечен `linkable: false`: deep link его не выполняет.

**Добавить команду:**

1. Добавить объект в массив нужного файла реестра (или в `global.ts`).
2. Завести ключ описания `helpXxx` в `CommandDescriptionDictionary`
   ([`localization/interfaces.ts`](src/localization/interfaces.ts)) и в **оба** словаря —
   `eng.json` и `ru.json`. Если команда выводит новый текст — добавить и его ключ туда же
   (`CommonDictionary` или, для текста с `$аргументами`, `DictionaryWithArgs` + тип в
   `LocaleWithArgs`).

Тест [`dictionaries.test.ts`](src/localization/dictionaries/dictionaries.test.ts) проверяет, что
словари совпадают по ключам, у каждой команды есть непустое описание и нет лишних `help*`-ключей.

**Deep links.** `?cmd=<команда>` на странице терминала (`/?cmd=projects`,
`/settings?cmd=show+themes`) выполняет команду при загрузке, как будто её ввели, после приветствия
([`components/DeepLinkCommand`](src/components/DeepLinkCommand/index.tsx)); параметр сразу
убирается из адреса, чтобы перезагрузка и «назад» не запускали команду повторно. Команда `share`
копирует такую ссылку на последнюю из истории команду этой страницы, кроме помеченных
`shareable: false` (навигация, `clear`, сам `share`); если буфер обмена недоступен — просто выводит
ссылку.

### Локализация

Языки — `languages` в [`localization/interfaces.ts`](src/localization/interfaces.ts) (`ru`, `eng`).
Словарь грузится динамическим `import()` при старте и при `set language`. Компоненты получают
перевод через `useT()` (или `useLocalization()` для языка и `changeLanguage`) из
[`context/localizationContext.ts`](src/context/localizationContext.ts); команды — через `ctx.t`.
Аргументы подставляются вместо `$name`: `t({ key: "changeTheme", args: { themeName } })`.

**Добавить язык:** код в `languages`, файл `dictionaries/<код>.json` со всеми ключами,
BCP 47-тег в `htmlLangByLanguage` ([`localization/utils.ts`](src/localization/utils.ts)), словарь в
список `dictionaries` теста словарей.

### Темы и каретка

Допустимые значения — в [`src/domain`](src/domain/index.ts): `themeModes`, `CaretMode`/`caretModes`
и `oneOf` для сужения произвольного значения до допустимого. Тема применяется атрибутом
`data-theme` на `<html>`, цвета — CSS-переменные в
[`styles/themes.scss`](src/styles/themes.scss).

**Добавить тему:** имя в `themeModes` и блок `[data-theme="<Имя>"]` с теми же переменными в
`themes.scss`.

Секретная тема `SECRET_THEME` (Amber) не входит в `themeModes`: её нет в `show themes` и `set theme`,
включает её только код Konami ↑↑↓↓←→←→BA на странице терминала
([`hooks/useKonamiCode.ts`](src/hooks/useKonamiCode.ts)); сохраняется как обычная тема. Команда
`matrix` закрывает страницу «цифровым дождём» на canvas в цветах темы
([`components/MatrixRain`](src/components/MatrixRain/index.tsx)), выход — любая клавиша или тап.

`set crt on|off` (по умолчанию выкл., `crtModes` в `src/domain`, хранится в storage) включает
CRT-эффект терминала: свечение текста и слой поверх страницы со scanlines, виньеткой и мерцанием
([`pages/ConsolePage`](src/pages/ConsolePage/styles.module.scss)); при `prefers-reduced-motion` —
без мерцания. На обычный вид резюме (`/gui`) и печать не влияет.

### Хранилище

[`src/storage`](src/storage/index.ts) сохраняет тему, каретку, язык, время прошлого визита, найденные
секреты и историю команд (не больше `HISTORY_LIMIT`, `history -c` очищает) в `localStorage`, а флаг
начатой сессии (boot-анимация — раз за вкладку) — в `sessionStorage`. Прочитанное
значение проходит через `oneOf` — мусор или устаревшее значение заменяется дефолтом; ошибки доступа к
`localStorage` (приватный режим, квота) молча игнорируются.

### Маршруты

Маршруты — `ROUTES` в [`router/const.ts`](src/router/const.ts): страницы терминала (`CONSOLE_ROUTES`)
и `/gui`. [`router/routes.tsx`](src/router/routes.tsx) строит по `ConsolePage` на каждый маршрут
терминала, все страницы — внутри `ConsoleSessionLayout`, который держит состояние консоли (логи,
история), чтобы оно переживало переход в `/gui` и обратно. Новый маршрут терминала требует записи в `commandsByRoute` и в `welcomeLocaleByRoute`
([`pages/ConsolePage`](src/pages/ConsolePage/index.tsx)) — оба типизированы как `Record` по
маршрутам, так что `tsc` не даст забыть.

### Обычный вид (`/gui`)

[`pages/GuiPage`](src/pages/GuiPage/index.tsx) — резюме обычной страницей из тех же словарей
(`about`, `contacts`, `experience`, `skills`, `projects`, `education`; абзацы разделены пустой
строкой). Открывается командой `gui` и переключателем terminal ⇄ gui вверху страницы; посетителю,
который ~15 с ничего не нажимал на главной, обычный вид предлагается в консоли (раз за сессию).
PDF-версия — это печать страницы: кнопка «Download PDF» и `cv --download` открывают диалог печати,
print-стили убирают управление и красят всё чёрным по белому.

### Стили и типизация SCSS-модулей

Стили компонентов — CSS-модули `*.module.scss`. Типы классов дают **только** сгенерированные рядом
файлы `*.module.scss.d.ts` ([typed-scss-modules](https://github.com/skovy/typed-scss-modules)):
после правки `.module.scss` запустите `npx typed-scss-modules "src/**/*.module.scss"` (или держите `npm run dev`; один `npm start` типы не обновляет) и
закоммитьте `.d.ts` — CI падает на устаревших и отсутствующих (`--listDifferent`). Настройки
генератора — в [`typed-scss-modules.config.ts`](typed-scss-modules.config.ts): `exportType: "default"`,
потому что `css-loader` отдаёт классы только экспортом по умолчанию (`namedExport: false`), и
`import { foo } from "./styles.module.scss"` должен быть ошибкой `tsc`.

Глобальные стили — `src/main.scss` (не модуль, импортируется ради side-effect). В
[`src/global.d.ts`](src/global.d.ts) объявлен только он, без шаблона `*.scss`: модуль без
сгенерированного `.d.ts` даёт `Cannot find module`, а не молча типизируется.

### Сборка

[`webpack.config.js`](webpack.config.js):

- `ts-loader` для TS; `sass-loader` → `css-loader` (CSS-модули только для `*.module.*`, экспорт по
  умолчанию) → `MiniCssExtractPlugin` в проде / `style-loader` в dev;
- `[contenthash]` в именах JS, CSS и шрифтов в проде;
- шрифт IBM Plex Mono самохостится из `@fontsource/ibm-plex-mono`; собственный `FontPreloadPlugin`
  добавляет `<link rel="preload">` для латинского подмножества и роняет сборку, если файл не найден;
- `<noscript>` в `index.html` заполняется текстами разделов резюме из `eng.json` (`about`,
  `experience`, `skills`, `projects`, `education`, `contacts`).
- картинка превью ссылки `og-image.png` (1200×630) рисуется при продакшен-сборке
  ([`scripts/og-image.cjs`](scripts/og-image.cjs)): терминал с `neofetch` — тексты из `eng.json`,
  логотип из `src/commandHandlers/neofetchLogo.json`, SVG → PNG через `@resvg/resvg-js` шрифтом сайта.
  Сборка падает, если строка не влезает в карточку или выходит за латинское подмножество шрифта.
  Абсолютные `og:image`, `og:url` и `canonical` добавляются, только если задан `SITE_URL` (полный
  адрес сайта, его путь должен совпадать с `basePath`); `og:url` и `canonical` — только в
  `index.html`, не в `404.html`, которым отвечают глубокие ссылки. В CI `SITE_URL` — адрес GitHub
  Pages; при своём домене поменяйте его вместе с `E2E_BASE_PATH`.
- аналитика без cookies ([Umami](https://umami.is)) включается переменной `UMAMI_WEBSITE_ID` при
  продакшен-сборке (`UMAMI_SCRIPT_URL` — адрес скрипта своего Umami, по умолчанию Umami Cloud); без
  неё скрипта нет. В CI обе берутся из переменных репозитория (Settings → Secrets and variables →
  Actions → Variables). Нужен и `SITE_URL`: `AnalyticsPlugin` добавляет скрипт с `data-domains` (его
  хост; локальные запуски сборки не считаются) и `data-do-not-track`; e2e-тесты блокируют сторонние
  запросы. Кроме визитов [`src/analytics`](src/analytics/index.ts) шлёт события `command`
  (каноническое имя введённой команды) и `unknown-command` (два первых слова ненайденного ввода, без
  email и цифр, до 40 символов); события до загрузки скрипта (глубокая ссылка) ждут его.

### Тулинг

- TypeScript 6 (`tsc` только проверяет, эмит делает webpack);
- ESLint 10, flat config [`eslint.config.mjs`](eslint.config.mjs): typescript-eslint,
  `@eslint-react`, `react-hooks`, `eslint-plugin-prettier` последним;
- Prettier 3 ([`.prettierrc`](.prettierrc)), `BACKLOG.md` и `.claude` исключены;
- Vitest + Testing Library ([`vitest.config.mts`](vitest.config.mts)), тесты лежат рядом с кодом;
  таймауты `findBy*`/`waitFor` ([`src/setupTests.ts`](src/setupTests.ts)) и теста подняты: первый
  рендер приложения вне `act` под нагрузкой полного прогона идёт дольше секунды;
- Playwright ([`playwright.config.ts`](playwright.config.ts)), e2e-сценарии в `e2e/`: десктопный
  Chromium и мобильный вьюпорт с тачем (только тесты с тегом `@mobile`);
- переводы строк — LF везде ([`.gitattributes`](.gitattributes)), Prettier требует `endOfLine: lf`.
