import { Layout } from "@/components/Layout";
import { Panel } from "@/components/ui/Panel";
import { Divider } from "@/components/ui/Divider";
import { CyberButton } from "@/components/ui/CyberButton";

export default function EthicsPage() {
  return (
    <Layout>
      <section className="notice section-ethics" id="top">
        <p className="notice__kicker">Ethics and Privacy</p>
        <h2 className="notice__title">Security Awareness, Not Surveillance</h2>
        <p className="notice__body">
          Use this toolkit for education, personal safety checks, and responsible testing. It is not intended for
          harassment, unauthorized investigation, or illegal monitoring.
        </p>
      </section>

      <section className="section-dark landing-section">
        <Panel as="article" className="feature-card">
          <h3 className="feature-card__title">Responsible Use Rules</h3>
          <Divider />
          <ul className="ethics-list">
            <li>Only test your own data or data you are explicitly authorized to audit.</li>
            <li>Never enter real passwords into awareness tools.</li>
            <li>Treat all scanner outputs as best-effort signals, not guaranteed truth.</li>
            <li>Do not store, share, or publish sensitive findings without consent.</li>
            <li>Comply with local laws, platform policies, and organizational security rules.</li>
          </ul>
        </Panel>

        <div className="hero__actions">
          <CyberButton href="/tools" variant="primary">
            Go to Tools
          </CyberButton>
          <CyberButton href="/" variant="ghost">
            Back Home
          </CyberButton>
        </div>
      </section>
    </Layout>
  );
}
