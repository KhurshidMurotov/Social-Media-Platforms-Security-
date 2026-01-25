import Head from "next/head";
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
            <div>
              <h1 className="title">{APP_NAME}</h1>
              <p className="subtitle">{DISCLAIMER}</p>
            </div>
          </div>
        </header>
        <main className="main">{props.children}</main>
        <footer className="footer">
          <p>{PRIVACY_NOTICE}</p>
        </footer>
      </div>
    </>
  );
}

