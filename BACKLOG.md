# Бэклог: CV-терминал (React + TS + webpack)

## Контекст
Проект — резюме в виде веб-терминала: страницы `/` и `/settings`, команды (`help`, `ls`, `about`, `set theme` …), автодополнение по Tab, история по ↑/↓, темы/курсоры/языки в localStorage. Код прочитан полностью; дополнительно прогнаны `tsc --noEmit` (чисто), `eslint` (2 warning `any`), `prettier --check` (3 файла не отформатированы — конфликт правил, см. TASK-39).
Нумерация продолжает существующие TASK-N, начиная с **TASK-21**.

Приоритеты: **P0** — баг, ломающий сценарий; **P1** — заметный баг/долг; **P2** — улучшение; **P3** — nice to have. Оценка: S (≤1ч) / M (полдня) / L (день+).

---

## 🐞 Баги

| ID | Pri | Est | Задача | Где / суть |
|---|---|---|---|---|
| ✅ TASK-21 | P0 | M | **Терминал не работает на мобильных** | Нативный input скрыт (`opacity:0; width:0`), фокус ставится только по `keydown` на document. На телефоне нет клавиатуры → нечем ввести команду. Нужен фокус по click/touch на консоль; для резюме это критично (рекрутеры часто с телефона). [Input/index.tsx](src/components/Input/index.tsx), [Input/styles.module.scss](src/components/Input/styles.module.scss) |
| ✅ TASK-22 | P0 | S | **TypeError при Enter до первого ввода** | `userCommands` изначально `[]`, в обработчике Enter — `userCommands[0].trim()`. [useHistoryCommands.ts:52](src/components/Input/hooks/useHistoryCommands.ts#L52) |
| ✅ TASK-23 | P1 | M | **История команд записывает не то** | ↑ меняет input через `setInputValue`, но `userCommands[0]` (черновик) остаётся прежним; на Enter в историю идёт черновик, а не выполненная команда. Ветка `if (historyPosition.current !== 0)` — мёртвая (позиция обнулена строкой выше). Переписать модель истории: отдельно `history[]` + `draft`, запись по факту выполнения. [useHistoryCommands.ts:50-60](src/components/Input/hooks/useHistoryCommands.ts#L50-L60) |
| ✅ TASK-24 | P1 | S | **Сообщение о смене языка выводится на старом языке** | `localization.changeDictionary()` асинхронный и не `await`-ится; `setLanguage` в app-store не диспатчится, `appState.language` нигде не обновляется. [WithSettingsHandler.tsx:110-111](src/commandHandlers/WithSettingsHandler.tsx#L110-L111) |
| ✅ TASK-25 | P1 | S | **Парсер команд без границы слова** | `separateCommand` использует `startsWith`: `set themeblack` → параметр `lack`; двойной пробел даёт пустой параметр; лишние аргументы у `show themes foo` молча игнорируются. Сплитить по пробелам/регэкспу, проверять границу. [commandHandlers/utils.ts:10-26](src/commandHandlers/utils.ts#L10-L26) |
| ✅ TASK-26 | P1 | M | **Рассинхрон каретки с реальной позицией** | Home/End/Delete, клик мышью, вставка — не обновляют `caretPosition`; в `onChange` и `onKeyUp` разные соглашения (`selectionStart` vs `selectionStart-1`). Перевести на единый источник: `selectionchange`/чтение `selectionStart` после каждого события. [Input/index.tsx:37-88](src/components/Input/index.tsx#L37-L88) |
| ✅ TASK-27 | P1 | S | **Английский словарь сломан** | `eng.json`: `help`, `/Help`, `/settingsHelp` на русском, опечатка `/n` вместо `\n`, у `Help` нет `$`; `education` — заглушка («Idk kafedra»); грамматика («ur caret successful changed»). [eng.json](src/localization/dictionaries/eng.json) |
| TASK-28 | P1 | S | **`/settings/` (со слешем) падает в ErrorPage** | `handlerByRoute[pathname]` и `welcomeLocaleByRoute[pathname]` берутся по сырому pathname → `undefined`. Нормализовать путь или брать хендлер из route-конфига. [ConsolePage/index.tsx:36](src/pages/ConsolePage/index.tsx#L36) |
| TASK-29 | P1 | S | **Статус `error` при загрузке словаря не обрабатывается** | При ошибке `initDictionary` всё равно рендерится Router → `getLocale` кидает «dictionary is empty». Показывать fallback/ErrorPage. [App.tsx:34-40](src/App.tsx#L34-L40) |
| TASK-30 | P2 | S | **Невалидированные значения из localStorage** | `getLanguage`/`getCaretMode` кастят без проверки (в отличие от `getThemeMode`) → мусор в storage ломает загрузку словаря / класс каретки. Нет try/catch на доступ к storage (blocked storage кидает). [storage/index.ts](src/storage/index.ts) |
| ✅ TASK-31 | P2 | S | **Неверный тип у `/settingsHelp`** | `SettingsHelpLocale` параметризован `MainCommands` вместо `SettingsCommands`. [localization/interfaces.ts:51](src/localization/interfaces.ts#L51) |
| TASK-32 | P3 | S | Дубль welcome-сообщения в dev | `useEffect` + StrictMode → приветствие дважды. Некритично, но мешает отладке. [ConsolePage/index.tsx:32-34](src/pages/ConsolePage/index.tsx#L32-L34) |

## 🏗 Архитектура и рефакторинг

| ID | Pri | Est | Задача | Суть |
|---|---|---|---|---|
| ✅ TASK-33 | P1 | L | **Реестр команд вместо if-цепочек** | Сейчас команда описана в 4 местах: enum, if-ветка в хендлере, `commandsWithParams` для автодополнения, вручную написанный help в каждом словаре. Ввести декларативный реестр `{ name, aliases, params, descriptionKey, run(ctx, args) }`, из которого генерируются `help`, `ls`, автодополнение (включая алиасы `cd ..`, `exit`, `cd settings`). Закрывает часть TASK-25/27/31. |
| ✅ TASK-34 | P2 | M | **Локализация как часть React-состояния** | Синглтон `Localization` вне React — смена языка не вызывает ререндер, `appState.language` мёртвый. Вынести в контекст/хук `useT()`; обновлять `<html lang>`. Механизм `$arg` через `String.replace` заменяет только первое вхождение и для help по сути просто срезает `$` — упростить. |
| ✅ TASK-35 | P2 | S | **Разорвать циклические импорты** | `commandHandlers/utils` ↔ `WithMainHandler/WithSettingsHandler`; `localization/interfaces` → `WithGlobalHandler` → `localization`. Доменные типы (`CaretMode`, темы) живут в `components/Char` и импортируются в store/storage. Вынести в `src/domain` / `src/constants`. |
| ✅ TASK-36 | P2 | S | **Удалить мёртвый код** | `logWrapper`, `addLog`, `setLanguage` action, `UserConfig`/`getInitialUserConfig`/`isConsoleMode`, `InputProps.setLogs` + `SetState`, пустой миксин `spaceChar` и `mixins.scss`, классы `.fancyInput`, `.tag`. |
| TASK-37 | P3 | S | Типизация хуков | `any` в `useCommandsHint` (2 eslint-warning); логика «скрыть хинт при 1 варианте» спрятана в reducer — перенести в хук. |
| TASK-38 | P3 | S | Стабильность рендеров | Значения контекстов и `commandHandler`/`allCommands` пересоздаются каждый рендер → лишние ререндеры всех потребителей. `useMemo`/`useCallback` или вычисление `allCommands` на уровне модуля. |

## ⚙️ Сборка, тулинг, инфраструктура

| ID | Pri | Est | Задача | Суть |
|---|---|---|---|---|
| ✅ TASK-39 | P1 | S | **Конфликт ESLint ↔ Prettier** | Правило `indent` в eslint противоречит prettier (switch/case) → `prettier --check` падает на 3 файлах. Убрать стилевые правила из eslint, подключить `plugin:prettier/recommended`, добавить `eslint-plugin-react-hooks`, `settings.react.version`. |
| ✅ TASK-40 | P1 | M | **Нет тестов** | `npm test` — заглушка с `exit 1`. Добавить Vitest/Jest + RTL: юнит на `separateCommand`, `getAutocompleteCommands`, `getLocaleWithArgs`, reducers; интеграционные на ввод/историю/Tab (регрессы TASK-22/23/25). |
| TASK-41 | P2 | S | **Мёртвая конфигурация Babel** | babel-loader применяется только к `.jsx?` (таких файлов нет), TS идёт через ts-loader; `useBuiltIns: usage` + `corejs` без установленного `core-js`. Либо удалить babel, либо перейти на один пайплайн. |
| TASK-42 | P2 | S | **Чистка зависимостей** | `history` не используется; `@types/react-router-dom@5` для RR v6 не нужен; `react`/`react-dom` в devDependencies; `package.json`: `name: "gradeexam"`, пустые description/main. |
| TASK-43 | P2 | M | **Прод-сборка webpack** | Нет `[contenthash]` в именах (кеш-бастинг), CSS через `style-loader` в проде (FOUC) → `MiniCssExtractPlugin`; `devServer.static: ./dist` лишний; `tsconfig`: опечатка `"includes"` (должно быть `include`), лишние `allowJs/outDir/sourceMap`, `jsx: react` → `react-jsx`. |
| TASK-44 | P3 | M | Обновить стек | TS 4.9, ESLint 8 (EOL), Prettier 2, RR 6.8. Рассмотреть миграцию webpack → Vite (проще конфиг, быстрый dev). |
| TASK-45 | P2 | S | **CI** | GitHub Actions: `tsc --noEmit`, `eslint`, `prettier --check`, тесты, build на каждый PR. |
| TASK-46 | P3 | S | Документация | README (запуск, структура, как добавить команду/тему/язык), CLAUDE.md. Три параллельных механизма типизации SCSS-модулей (`global.d.ts`, `typed-scss-modules`, `typescript-plugin-css-modules`) — оставить один и описать. |

## 🎨 UX, доступность, контент

| ID | Pri | Est | Задача | Суть |
|---|---|---|---|---|
| ✅ TASK-47 | P1 | S | **Убрать искусственную задержку 1с** | `setTimeout(res, 1000)` в загрузке — чистая потеря времени до первого контента. Если анимация нужна — показывать её параллельно, а не блокировать. [App.tsx:25](src/App.tsx#L25) |
| TASK-48 | P1 | M | **Наполнить резюме** | Сейчас только `about` и `education`. Команды `experience`, `skills`, `projects`, `contacts` (GitHub/Telegram/email-ссылки кликабельны), `cv --download` (PDF). Возраст «23 y.o.» захардкожен — вычислять или убрать. |
| TASK-49 | P2 | M | **Доступность** | Логи без `aria-live`, у input нет label, мигание без `prefers-reduced-motion`, нет видимой подсказки «введите help» для новичка. |
| TASK-50 | P2 | S | **Метрики шрифта захардкожены** | Ширина пробела `9.6px`, смещение каретки `left: 9px` завязаны на IBM Plex Mono — до загрузки шрифта/при fallback каретка съезжает. Перейти на `1ch`. Шрифт с Google Fonts → self-host + `preload`. |
| TASK-51 | P2 | S | **SEO / мета** | Контент виден только после команд — краулер и превью в мессенджерах видят пустую страницу. `meta description`, Open Graph, favicon, статичный `<noscript>`/скрытый текст с ключевой инфой. |
| TASK-52 | P3 | S | Мелочи UX | Регистронезависимые команды (`Help`), `Ctrl+L` = clear, `Ctrl+C` = сброс строки, автодополнение алиасов, ограничение длины лога. |

---

## Рекомендуемый порядок
1. **Спринт 1 (стабилизация):** TASK-21, 22, 23, 24, 25, 27, 47, 39 — всё, что видит пользователь + починка тулинга.
2. **Спринт 2 (фундамент):** TASK-40 (тесты), 33 (реестр команд), 34, 35, 36 — после него новые команды добавляются в одном месте.
3. **Спринт 3 (продукт):** TASK-48, 49, 51, 26, 43, 45.
4. Остальное — по мере сил.

## Как воспроизвести ключевые баги
`npm start`, затем: Enter на пустой строке сразу после загрузки (TASK-22), `set themeblack` (TASK-25), `set language eng` (TASK-24), открыть `/settings/` (TASK-28), открыть сайт в мобильном эмуляторе DevTools (TASK-21).
