import { Panel } from "@/components/ui/Panel";
import { Divider } from "@/components/ui/Divider";

const FEATURES = [
  {
    id: "password",
    title: "Password Analysis",
    description: "Client-side strength and entropy checks with simple risk signals.",
    tone: "shield"
  },
  {
    id: "leaks",
    title: "Breach Awareness",
    description: "Email exposure lookup via LeakCheck Public API, in a concise readable format.",
    tone: "radar"
  },
  {
    id: "urls",
    title: "Malicious URL Scan",
    description: "VirusTotal verdict aggregation with retry, summary stats, and vendor flags.",
    tone: "pulse"
  },
  {
    id: "osint",
    title: "Username Footprint",
    description: "Cross-platform public profile checks with platform-aware verification signals.",
    tone: "grid"
  }
];

export function FeatureGrid() {
  return (
    <section className="section-dark landing-section">
      <div className="section-heading">
        <p className="section-heading__kicker">What You Get</p>
        <h2 className="section-heading__title">Rapid Awareness Modules</h2>
      </div>
      <div className="feature-grid">
        {FEATURES.map((feature) => (
          <Panel key={feature.id} as="article" className="feature-card">
            <div className={`feature-icon feature-icon--${feature.tone}`} aria-hidden="true" />
            <h3 className="feature-card__title">{feature.title}</h3>
            <Divider />
            <p className="feature-card__desc">{feature.description}</p>
          </Panel>
        ))}
      </div>
    </section>
  );
}
