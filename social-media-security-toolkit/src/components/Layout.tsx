import Head from "next/head";
import Link from "next/link";
import type { ReactNode } from "react";
import { APP_NAME, DISCLAIMER, PRIVACY_NOTICE } from "@/lib/constants";

export function Layout(props: { children: ReactNode }) {
  return (
    <>
      <Head>
        <title>{APP_NAME}</title>
        <meta name="description" content={DISCLAIMER} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="page">
        <header className="header">
          <div className="header__inner">
            <div className="header__bar">
              <a href="#top" className="header__brand">
                <h1 className="title">{APP_NAME}</h1>
              </a>
              <nav className="nav">
                <a href="#password" className="nav__link">
                  Password
                </a>
                <a href="#email-leak" className="nav__link">
                  Email Leak
                </a>
                <a href="#url-scanner" className="nav__link">
                  URL Scanner
                </a>
                <a href="#username-finder" className="nav__link">
                  Username Finder
                </a>
              </nav>
            </div>
            <p className="subtitle">{DISCLAIMER}</p>
          </div>
        </header>
        <main className="main">{props.children}</main>
        <footer className="footer">
          <p>{PRIVACY_NOTICE}</p>
          <div style={{ marginTop: 12, fontSize: 14, color: "rgba(255,255,255,0.6)" }}>
            <p style={{ margin: 0 }}>
              Xurshidbek Murotov | Student Number: 2427305 |{" "}
              <a
                href="https://github.com/KhurshidMurotov"
                target="_blank"
                rel="noreferrer"
                style={{ color: "rgba(255,255,255,0.8)", textDecoration: "underline" }}
              >
                GitHub
              </a>
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}

