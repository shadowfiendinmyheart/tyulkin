# CLAUDE.md

Терминал-резюме на React + TS 6 + webpack 5. Подробности устройства — в [README.md](README.md).

## Проверки (те же, что в CI, `.github/workflows/ci.yml`)

```bash
npx typed-scss-modules "src/**/*.module.scss" --listDifferent
npx tsc --noEmit
npm run lint            # --max-warnings 0
npx prettier --check .  # .md тоже проверяются; BACKLOG.md и .claude исключены
npm test
npm run build
```

## Неочевидное

- Правка `*.module.scss` → `npx typed-scss-modules "src/**/*.module.scss"` и коммит `.module.scss.d.ts`: это
  единственный источник типов классов (настройки — `typed-scss-modules.config.ts`, только
  default-экспорт). В `src/global.d.ts` нет шаблона `*.scss` — не добавлять.
- Новая команда = объект в `src/commandHandlers/commands/` + ключ `helpXxx` в
  `CommandDescriptionDictionary` и в **обоих** словарях `src/localization/dictionaries/{eng,ru}.json`
  (иначе падает `dictionaries.test.ts`). Любой текст для пользователя — только через словари.
- Темы/каретки/`oneOf` — `src/domain`; значения из `localStorage` читаются только через
  `src/storage` (валидация). Маршруты — `src/router/const.ts`.
- Тексты резюме (`about`, `education`) из `eng.json` также попадают в `<noscript>` при сборке.
  Не выдумывать факты о владельце резюме — контент только от пользователя.
- Переводы строк LF (`.gitattributes`, Prettier `endOfLine: lf`).

## Процесс

- Задачи — в `BACKLOG.md`; скиллы в `.claude/skills/`: `/backlog` (что делать дальше),
  `/task TASK-N` (задача целиком, с ревью и коммитом), `/fuck-tokens` (автопилот по бэклогу).
- Коммиты: `[add]|[fix]|[refactor] <описание на английском в нижнем регистре> TASK-N`, файлы
  добавлять поимённо, не пушить без просьбы.
