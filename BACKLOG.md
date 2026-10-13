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
| ✅ TASK-28 | P1 | S | **`/settings/` (со слешем) падает в ErrorPage** | `handlerByRoute[pathname]` и `welcomeLocaleByRoute[pathname]` берутся по сырому pathname → `undefined`. Нормализовать путь или брать хендлер из route-конфига. [ConsolePage/index.tsx:36](src/pages/ConsolePage/index.tsx#L36) |
| ✅ TASK-29 | P1 | S | **Статус `error` при загрузке словаря не обрабатывается** | При ошибке `initDictionary` всё равно рендерится Router → `getLocale` кидает «dictionary is empty». Показывать fallback/ErrorPage. [App.tsx:34-40](src/App.tsx#L34-L40) |
| ✅ TASK-30 | P2 | S | **Невалидированные значения из localStorage** | `getLanguage`/`getCaretMode` кастят без проверки (в отличие от `getThemeMode`) → мусор в storage ломает загрузку словаря / класс каретки. Нет try/catch на доступ к storage (blocked storage кидает). [storage/index.ts](src/storage/index.ts) |
| ✅ TASK-31 | P2 | S | **Неверный тип у `/settingsHelp`** | `SettingsHelpLocale` параметризован `MainCommands` вместо `SettingsCommands`. [localization/interfaces.ts:51](src/localization/interfaces.ts#L51) |
| ✅ TASK-32 | P3 | S | Дубль welcome-сообщения в dev | `useEffect` + StrictMode → приветствие дважды. Некритично, но мешает отладке. [ConsolePage/index.tsx:32-34](src/pages/ConsolePage/index.tsx#L32-L34) |

## 🏗 Архитектура и рефакторинг

| ID | Pri | Est | Задача | Суть |
|---|---|---|---|---|
| ✅ TASK-33 | P1 | L | **Реестр команд вместо if-цепочек** | Сейчас команда описана в 4 местах: enum, if-ветка в хендлере, `commandsWithParams` для автодополнения, вручную написанный help в каждом словаре. Ввести декларативный реестр `{ name, aliases, params, descriptionKey, run(ctx, args) }`, из которого генерируются `help`, `ls`, автодополнение (включая алиасы `cd ..`, `exit`, `cd settings`). Закрывает часть TASK-25/27/31. |
| ✅ TASK-34 | P2 | M | **Локализация как часть React-состояния** | Синглтон `Localization` вне React — смена языка не вызывает ререндер, `appState.language` мёртвый. Вынести в контекст/хук `useT()`; обновлять `<html lang>`. Механизм `$arg` через `String.replace` заменяет только первое вхождение и для help по сути просто срезает `$` — упростить. |
| ✅ TASK-35 | P2 | S | **Разорвать циклические импорты** | `commandHandlers/utils` ↔ `WithMainHandler/WithSettingsHandler`; `localization/interfaces` → `WithGlobalHandler` → `localization`. Доменные типы (`CaretMode`, темы) живут в `components/Char` и импортируются в store/storage. Вынести в `src/domain` / `src/constants`. |
| ✅ TASK-36 | P2 | S | **Удалить мёртвый код** | `logWrapper`, `addLog`, `setLanguage` action, `UserConfig`/`getInitialUserConfig`/`isConsoleMode`, `InputProps.setLogs` + `SetState`, пустой миксин `spaceChar` и `mixins.scss`, классы `.fancyInput`, `.tag`. |
| ✅ TASK-37 | P3 | S | Типизация хуков | `any` в `useCommandsHint` (2 eslint-warning); логика «скрыть хинт при 1 варианте» спрятана в reducer — перенести в хук. _(`any` убран ещё в TASK-26)_ |
| ✅ TASK-38 | P3 | S | Стабильность рендеров | Значения контекстов и `commandHandler`/`allCommands` пересоздаются каждый рендер → лишние ререндеры всех потребителей. `useMemo`/`useCallback` или вычисление `allCommands` на уровне модуля. _(`allCommands` мемоизирован ещё в TASK-33)_ |

## ⚙️ Сборка, тулинг, инфраструктура

| ID | Pri | Est | Задача | Суть |
|---|---|---|---|---|
| ✅ TASK-39 | P1 | S | **Конфликт ESLint ↔ Prettier** | Правило `indent` в eslint противоречит prettier (switch/case) → `prettier --check` падает на 3 файлах. Убрать стилевые правила из eslint, подключить `plugin:prettier/recommended`, добавить `eslint-plugin-react-hooks`, `settings.react.version`. |
| ✅ TASK-40 | P1 | M | **Нет тестов** | `npm test` — заглушка с `exit 1`. Добавить Vitest/Jest + RTL: юнит на `separateCommand`, `getAutocompleteCommands`, `getLocaleWithArgs`, reducers; интеграционные на ввод/историю/Tab (регрессы TASK-22/23/25). |
| ✅ TASK-41 | P2 | S | **Мёртвая конфигурация Babel** | babel-loader применяется только к `.jsx?` (таких файлов нет), TS идёт через ts-loader; `useBuiltIns: usage` + `corejs` без установленного `core-js`. Либо удалить babel, либо перейти на один пайплайн. |
| ✅ TASK-42 | P2 | S | **Чистка зависимостей** | `history` не используется; `@types/react-router-dom@5` для RR v6 не нужен; `react`/`react-dom` в devDependencies; `package.json`: `name: "gradeexam"`, пустые description/main. |
| ✅ TASK-43 | P2 | M | **Прод-сборка webpack** | Нет `[contenthash]` в именах (кеш-бастинг), CSS через `style-loader` в проде (FOUC) → `MiniCssExtractPlugin`; `devServer.static: ./dist` лишний; `tsconfig`: опечатка `"includes"` (должно быть `include`), лишние `allowJs/outDir/sourceMap`, `jsx: react` → `react-jsx`. |
| ✅ TASK-44 | P3 | M | Обновить стек | TS 4.9, ESLint 8 (EOL), Prettier 2, RR 6.8. Рассмотреть миграцию webpack → Vite (проще конфиг, быстрый dev). |
| ✅ TASK-45 | P2 | S | **CI** | GitHub Actions: `tsc --noEmit`, `eslint`, `prettier --check`, тесты, build на каждый PR. |
| ✅ TASK-46 | P3 | S | Документация | README (запуск, структура, как добавить команду/тему/язык), CLAUDE.md. Три параллельных механизма типизации SCSS-модулей (`global.d.ts`, `typed-scss-modules`, `typescript-plugin-css-modules`) — оставить один и описать. |
| ✅ TASK-78 | P2 | M | **E2E-тесты** | Playwright: smoke-сценарии (ввод команды, Tab, история, навигация, тап по консоли на мобильном вьюпорте) в CI. Желательно до крупных фич TASK-53…77 — они в основном про анимации/фокус/ввод, что юнитами в jsdom не ловится. |
| ✅ TASK-79 | P1 | S | **Нестабильный юнит-тест смены языка** | «switches the language without a reload (TASK-34)» падает в полном прогоне `npm test` и проходит отдельно: ждёт приветствие стандартным `findByText` (1 с), а после посимвольного вывода (TASK-53) под нагрузкой не успевает. Может ронять CI и деплой. Сделать тест детерминированным (выключить анимацию/fake timers), проверить остальные тесты на ту же проблему. [App.test.tsx:23](src/App.test.tsx#L23) |

## 🎨 UX, доступность, контент

| ID | Pri | Est | Задача | Суть |
|---|---|---|---|---|
| ✅ TASK-47 | P1 | S | **Убрать искусственную задержку 1с** | `setTimeout(res, 1000)` в загрузке — чистая потеря времени до первого контента. Если анимация нужна — показывать её параллельно, а не блокировать. [App.tsx:25](src/App.tsx#L25) |
| ✅ TASK-48 | P1 | M | **Наполнить резюме** | Сейчас только `about` и `education`. Команды `experience`, `skills`, `projects`, `contacts` (GitHub/Telegram/email-ссылки кликабельны), `cv --download` (PDF). Возраст «23 y.o.» захардкожен — вычислять или убрать. |
| ✅ TASK-49 | P2 | M | **Доступность** | Логи без `aria-live`, у input нет label, мигание без `prefers-reduced-motion`, нет видимой подсказки «введите help» для новичка. |
| ✅ TASK-50 | P2 | S | **Метрики шрифта захардкожены** | Ширина пробела `9.6px`, смещение каретки `left: 9px` завязаны на IBM Plex Mono — до загрузки шрифта/при fallback каретка съезжает. Перейти на `1ch`. Шрифт с Google Fonts → self-host + `preload`. |
| ✅ TASK-51 | P2 | S | **SEO / мета** | Контент виден только после команд — краулер и превью в мессенджерах видят пустую страницу. `meta description`, Open Graph, favicon, статичный `<noscript>`/скрытый текст с ключевой инфой. _(остаток закрыт TASK-75: og:image, og:url, canonical — по адресу GitHub Pages из `SITE_URL` в CI)_ |
| ✅ TASK-52 | P3 | S | Мелочи UX | Регистронезависимые команды (`Help`), `Ctrl+L` = clear, `Ctrl+C` = сброс строки, автодополнение алиасов, ограничение длины лога. |

## 🚀 Персональный сайт: фичи

Цель — из резюме-терминала сделать персональный сайт, который запоминается. Две аудитории, и обеим нужно своё:
- **рекрутер / не-технарь** — часто с телефона, терминала не знает, у него ~30 секунд: ему нужны кликабельные команды, быстрые кнопки, обычный режим `gui`;
- **разработчик** — оценит глубину: настоящий шелл, ФС, пасхалки, вау-эффекты.

Контент (опыт, проекты, ASCII-арт, посты) — только от владельца, не выдумывать.

### Первое впечатление

| ID | Pri | Est | Задача | Суть |
|---|---|---|---|---|
| ✅ TASK-53 | P1 | M | **Boot-анимация** | Имитация загрузки/ssh-входа (`Last login: …`, строки инициализации, прогресс) перед приветствием; вывод команд «печатается» посимвольно. Пропуск по любой клавише/тапу; при `prefers-reduced-motion` — сразу результат; полная анимация только при первом визите за сессию (флаг через `src/storage`). Ввод не блокировать (урок TASK-47). [ConsolePage](src/pages/ConsolePage/index.tsx) |
| ✅ TASK-54 | P1 | M | **`neofetch`-приветствие** | ASCII-арт (инициалы/логотип) слева, справа `ключ: значение` в стиле neofetch: роль, город, стек, «uptime» = стаж, текущие тема/каретка, полоска цветов темы. Показывать как welcome на главной + отдельной командой. Нужен TASK-56; контент — из TASK-48. |
| ✅ TASK-55 | P1 | S | **Кликабельные команды в выводе** | Имена команд в `help`/`ls`/подсказке 404/приветствии — кнопки: клик выполняет команду так, будто её ввели (попадает в историю). Главное для не-технарей и мобильных. Нужен TASK-56. |
| ✅ TASK-56 | P1 | M | **Богатый вывод в логах** | Фундамент для 54/55/48: запись лога — не строка, а структура (`text` / `link` / `command` / цвет / таблица / pre-блок). Ссылки на GitHub/Telegram/email кликабельны, внешние — `rel="noopener"`. Сохранить `aria-live` (TASK-49). [Logs](src/components/Logs) |
| ✅ TASK-57 | P1 | S | **«Возможно, вы имели в виду…»** | При неизвестной команде — ближайшая по Левенштейну среди имён и алиасов доступных команд (`abuot` → `about`), кликабельная (TASK-55). [commandHandlers](src/commandHandlers) |
| ✅ TASK-58 | P1 | M | **Быстрые команды для новичков** | Чипы `about` · `projects` · `contacts` · `help` над строкой ввода (обязательно на мобильном, где клавиатура закрывает пол-экрана). Прячутся после нескольких самостоятельно введённых команд. |

### Для тех, кто не дружит с терминалом

| ID | Pri | Est | Задача | Суть |
|---|---|---|---|---|
| ✅ TASK-59 | P1 | L | **Режим `gui`** | Обычное одностраничное резюме из тех же словарей (карточки секций, контакты, кнопка печати/PDF через print-стили — закрывает `cv --download` из TASK-48). Маршрут `/gui`, команда `gui`, переключатель terminal ⇄ gui в углу; если посетитель ~15 с ничего не ввёл — мягкая подсказка «предпочитаете обычный вид?». |

### Глубина шелла (для разработчиков)

| ID | Pri | Est | Задача | Суть |
|---|---|---|---|---|
| ✅ TASK-60 | P2 | L | **Виртуальная файловая система** | `ls`, `cd`, `cat`, `tree`, `pwd`; разделы резюме — файлы (`cat about.md`, `ls projects/`), промпт `visitor@tyulkin:~/projects$`, автодополнение путей по Tab. cwd синхронизирован с URL. Требует пересмотра [router](src/router/const.ts) и `commandsByRoute`: `/settings` становится каталогом. |
| ✅ TASK-61 | P2 | M | **Привычки шелла** | `history`, `!!`, `Ctrl+R` (reverse search), `echo`, `whoami`, `date`, `pwd`; пайп `\| grep <слово>` по выводу команды; история сохраняется между визитами (через `src/storage`). |
| ✅ TASK-62 | P2 | S | **Deep links** | `/?cmd=projects` выполняет команду при загрузке; команда `share` копирует ссылку на последний вывод. Позволяет давать в резюме/LinkedIn ссылки сразу на нужный раздел. |
| ✅ TASK-72 | P2 | S | **Язык по браузеру** | При первом визите (в storage пусто) — язык из `navigator.languages`, иначе `eng`. [storage](src/storage/index.ts) |

### Пасхалки и вау-эффекты

| ID | Pri | Est | Задача | Суть |
|---|---|---|---|---|
| ✅ TASK-63 | P2 | M | **Пасхалки** | Скрытые от `help` команды: `sudo …` («visitor is not in the sudoers file. This incident will be reported.»), `rm -rf /` (фейковое удаление → «шутка»), `vim` (и как из него выйти), `sudo hire-me` → контакты, `cowsay`, `fortune`, `sl`, `coffee`. Команда `secrets` — «найдено 3/10» (прогресс в storage) — геймификация. Все тексты через словари. |
| ✅ TASK-64 | P2 | M | **CRT-эффект** | Scanlines, свечение текста, лёгкая виньетка/изгиб, мерцание; `set crt on\|off` (по умолчанию выкл.). При `prefers-reduced-motion` — без мерцания. Особенно с темой Hacker. |
| ✅ TASK-65 | P2 | S | **`matrix` и Konami code** | «Цифровой дождь» на canvas поверх консоли в цветах темы, выход по любой клавише/тапу. ↑↑↓↓←→←→BA открывает секретную тему. |
| TASK-66 | P3 | L | **Мини-игры** | `snake` / `2048` / `tetris` внутри терминала (символьная сетка), стрелки и свайпы, рекорд в storage. Ленивая загрузка чанка (`import()`), чтобы не раздувать основной бандл. |
| TASK-67 | P3 | S | **Звук клавиатуры** | Механические щелчки при наборе через Web Audio, `set sound on\|off`, по умолчанию выкл. |
| TASK-73 | P3 | M | **Больше тем** | Dracula, Solarized, Gruvbox, Nord, Monokai, `set theme random`; тема по умолчанию — по `prefers-color-scheme`. [domain](src/domain/index.ts), [themes.scss](src/styles/themes.scss) |

### Живой контент

| ID | Pri | Est | Задача | Суть |
|---|---|---|---|---|
| TASK-68 | P2 | M | **`projects` с данными GitHub** | Список репозиториев (описание, язык, звёзды, ссылка) из GitHub API **на этапе сборки** (не в рантайме: лимиты API и скорость), результат — JSON в бандле, обновляется при каждом деплое. Какие репо показывать — решает владелец. Связано с TASK-48. _(частично: сборка тянет репо из GitHub API по переменной `GITHUB_REPOS` (`owner/repo, …`), без неё/при недоступности API — прежний текст; осталось владельцу выбрать репозитории и задать переменную репозитория `GITHUB_REPOS`)_ |
| ✅ TASK-69 | P2 | S | **`changelog`** | История изменений сайта из реальных коммитов (`git log` при сборке, формат `[add]/[fix]` уже единый) — сайт, который рассказывает, как он сделан. |
| TASK-70 | P3 | L | **Блог / заметки** | `blog` — список постов, `read <slug>` — пост в терминале (markdown → богатый вывод TASK-56); посты в `content/*.md`, компилируются при сборке; RSS, отдельные статичные страницы для SEO. Контент — владелец. |
| TASK-71 | P3 | L | **`ask` — ИИ-ассистент о владельце** | `ask <вопрос>` — ответ стримится в консоль, строго по фактам из словарей/контента, отказ на вопросы вне темы. Нужен serverless-прокси (ключ API только на сервере, rate-limit по IP, лимит бюджета). Самая «вау», но и самая дорогая в поддержке — после деплоя (TASK-74). |

### Публикация

| ID | Pri | Est | Задача | Суть |
|---|---|---|---|---|
| TASK-74 | P1 | M | **Деплой и домен** | Автодеплой из CI (GitHub Pages / Cloudflare Pages / Vercel), свой домен, HTTPS, SPA-фолбэк (прямой заход на `/settings`, `/gui` не даёт 404). Разблокирует TASK-51 (og:url, canonical) и TASK-75. _(частично: деплой на GitHub Pages из CI в `/tyulkin/` есть; нет своего домена — тогда `CNAME`, `E2E_BASE_PATH: /` и `SITE_URL` в `ci.yml`)_ |
| ✅ TASK-75 | P2 | M | **Картинка превью (og:image)** | Генерация при сборке PNG 1200×630 в стиле терминала (промпт + `neofetch`-блок) — красивая карточка в Telegram/LinkedIn/Slack. Закрывает остаток TASK-51. |
| TASK-76 | P2 | S | **Аналитика без cookies** | Umami / Plausible / GoatCounter: визиты + события «какая команда введена» и «какая не найдена» — подскажет, какие алиасы и разделы добавить. Без персональных данных, не нужен cookie-баннер. _(частично: интеграция Umami готова и включается переменной `UMAMI_WEBSITE_ID` при сборке; осталось завести сайт в Umami Cloud или своём Umami и задать переменные репозитория `UMAMI_WEBSITE_ID` (и `UMAMI_SCRIPT_URL` для своего инстанса))_ |
| TASK-77 | P3 | M | **PWA и Lighthouse 100** | manifest, иконки, service worker (офлайн-доступ, «установить терминал» на телефон); цель — 100 во всех категориях Lighthouse, бейдж в README. |

---

## Рекомендуемый порядок
1. **Спринт 1 (стабилизация):** TASK-21, 22, 23, 24, 25, 27, 47, 39 — всё, что видит пользователь + починка тулинга.
2. **Спринт 2 (фундамент):** TASK-40 (тесты), 33 (реестр команд), 34, 35, 36 — после него новые команды добавляются в одном месте.
3. **Спринт 3 (продукт):** TASK-48, 49, 51, 26, 43, 45.
4. **Спринт 4 (сайт в сети + контент):** TASK-74, 48, 56, 55, 57, 72, 78 — домен, наполнение, богатый вывод, кликабельность.
5. **Спринт 5 (первое впечатление):** TASK-53, 54, 58, 59, 62, 75 — boot, neofetch, быстрые команды, режим `gui`, превью.
6. **Спринт 6 (глубина и вау):** TASK-63, 64, 65, 60, 61, 68, 69, 76.
7. Остальное — по мере сил (66, 67, 70, 71, 73, 77, 51-остаток закрывается 74+75).

## Как воспроизвести ключевые баги
`npm start`, затем: Enter на пустой строке сразу после загрузки (TASK-22), `set themeblack` (TASK-25), `set language eng` (TASK-24), открыть `/settings/` (TASK-28), открыть сайт в мобильном эмуляторе DevTools (TASK-21).
