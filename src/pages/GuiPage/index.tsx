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

interface Section {
  key: CommonDictionaryKeys;
  titleKey: CommonDictionaryKeys;
  // paragraphs start with a title line: a job, a project, a university
  titled?: boolean;
}

// the same texts the terminal commands print, in the order of a regular CV
const sections: Section[] = [
  { key: "contacts", titleKey: "guiContacts" },
  { key: "experience", titleKey: "guiExperience", titled: true },
  { key: "skills", titleKey: "guiSkills" },
  { key: "projects", titleKey: "guiProjects", titled: true },
  { key: "education", titleKey: "guiEducation", titled: true },
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
const renderParagraphs = (text: string, titled = false) =>
  text
    .split("\n\n")
    .filter((paragraph) => paragraph.trim() !== "")
    .map((paragraph, index) => {
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
        {sections.map(({ key, titleKey, titled }) => (
          <section key={key} className={styles.card} aria-labelledby={`gui-${key}`}>
            <h2 id={`gui-${key}`} className={styles.title}>
              {t({ key: titleKey })}
            </h2>
            {renderParagraphs(t({ key }), titled)}
          </section>
        ))}
      </main>
    </div>
  );
};

export default GuiPage;
