import Head from "next/head";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { APP_NAME, DISCLAIMER, PRIVACY_NOTICE } from "@/lib/constants";

export function Layout(props: { children: ReactNode }) {
  const router = useRouter();
  const isToolsPage = router.pathname === "/tools";

  return (
    <>
      <Head>
        <title>{APP_NAME}</title>
        <meta name="description" content={DISCLAIMER} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="page">
        <div className="page__noise" aria-hidden="true" />
        <header className="header">
          <div className="header__inner">
            <div className="header__bar">
              <Link href="/" className="header__brand">
                <h1 className="title">{APP_NAME}</h1>
              </Link>
              <nav className="nav">
                <Link href="/tools" className="nav__link">
                  Tools
                </Link>
                {!isToolsPage ? (
                  <>
                    <Link href="/" className="nav__link">
                      Home
                    </Link>
                    <Link href="/ethics" className="nav__link">
                      Ethics
                    </Link>
                  </>
                ) : null}
                {isToolsPage ? (
                  <Link href="/" className="nav__link nav__link--back">
                    Back to Home
                  </Link>
                ) : null}
              </nav>
            </div>
            <div className="header__meta">
              <p className="subtitle">{DISCLAIMER}</p>
              <div className="status-ticker" aria-live="polite">
                <span className="status-ticker__label">SYSTEM STATUS</span>
                <span className="status-ticker__viewport">
                  <span className="status-ticker__track">
                    Awareness Mode Active // No Data Storage // Public API Checks // Verify Before You Trust
                  </span>
                </span>
              </div>
            </div>
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
