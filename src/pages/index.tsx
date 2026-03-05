import { Layout } from "@/components/Layout";
import { HeroPoster } from "@/components/HeroPoster";
import { FeatureGrid } from "@/components/FeatureGrid";
import { CyberButton } from "@/components/ui/CyberButton";

export default function HomePage() {
  return (
    <Layout>
      <HeroPoster />

      <FeatureGrid />

      <section className="notice section-ethics" id="ethics-preview">
        <p className="notice__kicker">Ethics and Privacy</p>
        <h2 className="notice__title">Use This Toolkit Responsibly</h2>
        <p className="notice__body">
          This app is designed for awareness and training. Do not upload sensitive personal data, and always verify
          findings manually before making decisions.
        </p>
        <div className="hero__actions">
          <CyberButton href="/ethics" variant="primary">
            View Full Ethics Guide
          </CyberButton>
        </div>
      </section>

      <section className="landing-cta section-dark">
        <p className="section-heading__kicker">Ready to Run Checks</p>
        <h2 className="section-heading__title">Open the Full Toolkit</h2>
        <p className="landing-cta__desc">
          Jump to the tools workspace and run password, leak, URL, and username awareness checks.
        </p>
        <CyberButton href="/tools" variant="ghost">
          Launch Tools
        </CyberButton>
      </section>
    </Layout>
  );
}
