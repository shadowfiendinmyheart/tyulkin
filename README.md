# tyulkin

Интерактивное резюме в виде терминала: посетитель вводит команды (`help`, `about`, `education`,
`settings` …) и получает ответы в консоли. React 18 + TypeScript 6, сборка webpack 5, без бэкенда.

## Запуск

Нужен Node из поля `engines` в `package.json` (`^22.22.2 || >=24.15.0`; CI работает на Node 22).

```bash
npm ci
npm run dev     # dev-сервер с HMR + пересборка типов SCSS-модулей в watch-режиме
npm run build   # прод-сборка в dist/
```

| Скрипт                      | Что делает                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------ |
| `npm start`                 | только `webpack-dev-server` (открывает браузер, HMR)                                 |
| `npm run typed-styles`      | `typed-scss-modules "src/**/*.module.scss" --watch` — генерация `*.module.scss.d.ts` |
| `npm run dev`               | `start` и `typed-styles` параллельно (`concurrently`)                                |
| `npm run build`             | `webpack --mode production`                                                          |
| `npm test`                  | `vitest run` (jsdom, файлы `src/**/*.test.{ts,tsx}`)                                 |
| `npm run lint` / `lint:fix` | ESLint по всему репо, `--max-warnings 0`                                             |
| `npm run prettier`          | `prettier --write .`                                                                 |

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

## Структура

```
src/
  main.tsx              точка входа: React root, шрифт, глобальные стили
  App.tsx               загрузка словаря, тема, <html lang>, провайдеры контекстов
  index.html            шаблон: мета-теги, <noscript> с текстом резюме
  router/               ROUTES (const.ts), routes.tsx — по странице-консоли на каждый маршрут
  pages/                ConsolePage, ErrorPage, LoadingPage
  components/           Console, Input (+ хуки истории и подсказок), Logs, Char, CommandsHint
  commandHandlers/      реестр команд (commands/), разбор ввода (utils.ts), WithCommandHandler
  context/              React-контексты: app, console, handler, localization
  store/                useReducer-сторы приложения (тема, статус) и консоли (логи, история, каретка)
  localization/         словари dictionaries/{eng,ru}.json, типы ключей, подстановка аргументов
  domain/               общие доменные типы: темы, режимы каретки, oneOf
  storage/              localStorage с валидацией значений
  styles/themes.scss    CSS-переменные тем
```

## Как устроено

### Команды

Команды — данные, а не switch: каждая описана объектом `Command`
([`commandHandlers/interfaces.ts`](src/commandHandlers/interfaces.ts)) с полями `name`,
необязательными `aliases` и `params` (значения единственного аргумента, участвуют в
автодополнении), `descriptionKey` (строка в `help`) и `run(ctx, args)`. `ctx` даёт `log`, `t`,
`navigate`, диспатчеры сторов, `changeLanguage` и список доступных команд.

Реестр — [`src/commandHandlers/commands/`](src/commandHandlers/commands):

- `global.ts` — команды, доступные на любой странице (`help`, `ls`, `clear`, `back`, `menu`);
- `main.ts`, `settings.ts` — команды страниц;
- `index.ts` — `commandsByRoute`: какие команды у какого маршрута.

Ввод регистронезависим; команды страницы имеют приоритет над глобальными.

**Добавить команду:**

1. Добавить объект в массив нужного файла реестра (или в `global.ts`).
2. Завести ключ описания `helpXxx` в `CommandDescriptionDictionary`
   ([`localization/interfaces.ts`](src/localization/interfaces.ts)) и в **оба** словаря —
   `eng.json` и `ru.json`. Если команда выводит новый текст — добавить и его ключ туда же
   (`CommonDictionary` или, для текста с `$аргументами`, `DictionaryWithArgs` + тип в
   `LocaleWithArgs`).

Тест [`dictionaries.test.ts`](src/localization/dictionaries/dictionaries.test.ts) проверяет, что
словари совпадают по ключам, у каждой команды есть непустое описание и нет лишних `help*`-ключей.

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

### Хранилище

[`src/storage`](src/storage/index.ts) сохраняет тему, каретку и язык в `localStorage`. Прочитанное
значение проходит через `oneOf` — мусор или устаревшее значение заменяется дефолтом; ошибки доступа к
`localStorage` (приватный режим, квота) молча игнорируются.

### Маршруты

Маршруты — `ROUTES` в [`router/const.ts`](src/router/const.ts);
[`router/routes.tsx`](src/router/routes.tsx) строит из них по `ConsolePage` на маршрут. Новый маршрут
требует записи в `commandsByRoute` и в `welcomeLocaleByRoute`
([`pages/ConsolePage`](src/pages/ConsolePage/index.tsx)) — оба типизированы как `Record` по
маршрутам, так что `tsc` не даст забыть.

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
- `<noscript>` в `index.html` заполняется текстами `about` и `education` из `eng.json`.

### Тулинг

- TypeScript 6 (`tsc` только проверяет, эмит делает webpack);
- ESLint 10, flat config [`eslint.config.mjs`](eslint.config.mjs): typescript-eslint,
  `@eslint-react`, `react-hooks`, `eslint-plugin-prettier` последним;
- Prettier 3 ([`.prettierrc`](.prettierrc)), `BACKLOG.md` и `.claude` исключены;
- Vitest + Testing Library ([`vitest.config.mts`](vitest.config.mts)), тесты лежат рядом с кодом;
- переводы строк — LF везде ([`.gitattributes`](.gitattributes)), Prettier требует `endOfLine: lf`.
