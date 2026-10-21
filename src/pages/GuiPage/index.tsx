import React from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import TextLink from "../../components/TextLink";
import ViewSwitch from "../../components/ViewSwitch";
import { useT } from "../../context/localizationContext";
import { CommonDictionaryKeys } from "../../localization/interfaces";
import { ROUTES } from "../../router/const";
import { GuiLocationState } from "../../router/interfaces";
import storage from "../../storage";
import { linkify } from "../../store/console/logNodes";

import styles from "./styles.module.scss";

// how a section lays out the paragraphs of its text
type SectionLayout =
  // as they are
  | "plain"
  // each starts with a title line: a project, a university
  | "titled"
  // a job a paragraph: the title line, the period line, then the description
  | "timeline"
  // a group a line: "Category: tag, tag, tag"
  | "tags";

interface Section {
  key: CommonDictionaryKeys;
  titleKey: CommonDictionaryKeys;
  layout: SectionLayout;
}

// the same texts the terminal commands print, in the order of a regular CV
const sections: Section[] = [
  { key: "contacts", titleKey: "guiContacts", layout: "plain" },
  { key: "experience", titleKey: "guiExperience", layout: "timeline" },
  { key: "skills", titleKey: "guiSkills", layout: "tags" },
  { key: "projects", titleKey: "guiProjects", layout: "titled" },
  { key: "education", titleKey: "guiEducation", layout: "titled" },
];

// the owner's text with clickable links (URLs, emails, phones), see linkify
const renderText = (text: string) =>
  linkify(text).map((node, index) =>
    typeof node === "string" ? (
      // eslint-disable-next-line @eslint-react/no-array-index-key -- the text never reorders
      <React.Fragment key={index}>{node}</React.Fragment>
    ) : (
      node.type === "link" && (
        // eslint-disable-next-line @eslint-react/no-array-index-key -- the text never reorders
        <TextLink key={index} className={styles.link} href={node.href}>
          {node.text}
        </TextLink>
      )
    ),
  );

// paragraphs are separated by an empty line; an empty text gives no empty paragraph
const splitParagraphs = (text: string) =>
  text.split("\n\n").filter((paragraph) => paragraph.trim() !== "");

const renderParagraphs = (text: string, titled = false) =>
  splitParagraphs(text).map((paragraph, index) => {
    const [title, ...lines] = paragraph.split("\n");
    return (
      // eslint-disable-next-line @eslint-react/no-array-index-key -- the text never reorders
      <p key={index} className={styles.paragraph}>
        {titled ? (
          <>
            <strong className={styles.paragraphTitle}>{renderText(title)}</strong>
            {lines.length > 0 && renderText(`\n${lines.join("\n")}`)}
          </>
        ) : (
          renderText(paragraph)
        )}
      </p>
    );
  });

// the jobs as marks on a vertical line, the latest first as the text has them
const renderTimeline = (text: string) => (
  <ol className={styles.timeline}>
    {splitParagraphs(text).map((paragraph, index) => {
      const [title, period, ...lines] = paragraph.split("\n");
      return (
        // eslint-disable-next-line @eslint-react/no-array-index-key -- the text never reorders
        <li key={index} className={styles.event}>
          <h3 className={styles.eventTitle}>{renderText(title)}</h3>
          {period && <p className={styles.period}>{period}</p>}
          {lines.length > 0 && <p className={styles.paragraph}>{renderText(lines.join("\n"))}</p>}
        </li>
      );
    })}
  </ol>
);

// the commas between tags, not those inside parentheses: "monorepo (Lerna, Nx)" is one tag
const TAG_SEPARATOR = /,\s*(?![^()]*\))/;

// a line "Category: a, b" is a group of tags; a line without a category is tags alone
const renderTags = (text: string) =>
  text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line, index) => {
      const separator = line.indexOf(": ");
      const category = separator === -1 ? null : line.slice(0, separator);
      const tags = (separator === -1 ? line : line.slice(separator + 2))
        .split(TAG_SEPARATOR)
        .map((tag) => tag.trim())
        .filter((tag) => tag !== "");
      return (
        // eslint-disable-next-line @eslint-react/no-array-index-key -- the text never reorders
        <div key={index} className={styles.tagGroup}>
          {category && <h3 className={styles.tagCategory}>{category}</h3>}
          <ul className={styles.tags}>
            {tags.map((tag, tagIndex) => (
              // eslint-disable-next-line @eslint-react/no-array-index-key -- the text never reorders
              <li key={tagIndex} className={styles.tag}>
                {tag}
              </li>
            ))}
          </ul>
        </div>
      );
    });

const renderSection = (text: string, layout: SectionLayout) => {
  switch (layout) {
    case "timeline":
      return renderTimeline(text);
    case "tags":
      return renderTags(text);
    default:
      return renderParagraphs(text, layout === "titled");
  }
};

const isPrintRequested = (state: unknown) =>
  typeof state === "object" && state !== null && (state as GuiLocationState).print === true;

// the CV as a regular one-page site from the same dictionaries; printing it saves it as PDF
const GuiPage: React.FC = () => {
  const t = useT();
  const navigate = useNavigate();
  const { pathname, search, hash, state: locationState } = useLocation();

  // a visitor who has seen the regular view doesn't need it offered in the terminal
  React.useEffect(() => {
    storage.setGuiOffered();
  }, []);

  // `cv --download`: the print dialog (its "Save as PDF") opens once; the state is dropped,
  // so a reload or going back doesn't print again. StrictMode re-runs effects on mount,
  // the ref (it survives the remount) keeps it to one dialog
  const printedRef = React.useRef(false);
  const shouldPrint = pathname === ROUTES.GUI && isPrintRequested(locationState);
  React.useEffect(() => {
    if (!shouldPrint || printedRef.current) return;
    printedRef.current = true;
    navigate({ pathname, search, hash }, { replace: true, state: null });
    window.print();
  }, [shouldPrint, navigate, pathname, search, hash]);

  // "/gui/" and "/Gui" match this route too: switch to the canonical path
  if (pathname !== ROUTES.GUI) {
    return <Navigate to={{ pathname: ROUTES.GUI, search, hash }} state={locationState} replace />;
  }

  // the first line of `about` is the name, the rest introduces the owner
  const [name, ...intro] = t({ key: "about" }).split("\n");

  return (
    <div className={styles.page}>
      <nav className={styles.toolbar}>
        <ViewSwitch to="terminal" />
      </nav>
      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.name}>{name}</h1>
          {renderParagraphs(intro.join("\n").trim())}
          <button type="button" className={styles.print} onClick={() => window.print()}>
            {t({ key: "guiPrint" })}
          </button>
        </header>
        {sections.map(({ key, titleKey, layout }) => (
          <section key={key} className={styles.section} aria-labelledby={`gui-${key}`}>
            <h2 id={`gui-${key}`} className={styles.title}>
              {t({ key: titleKey })}
            </h2>
            {renderSection(t({ key }), layout)}
          </section>
        ))}
      </main>
    </div>
  );
};

export default GuiPage;
