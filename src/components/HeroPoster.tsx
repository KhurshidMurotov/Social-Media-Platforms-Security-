import { CyberButton } from "@/components/ui/CyberButton";

export function HeroPoster() {
  return (
    <section className="hero" id="top">
      <p className="hero__eyebrow">Security Poster Edition</p>
      <h2 className="hero__title">SOCIAL DEFENSE PROTOCOL</h2>
      <p className="hero__subtitle">
        A practical cyber-awareness toolkit for quick checks across passwords, leaked emails, suspicious URLs, and
        public username exposure.
      </p>
      <div className="hero__actions">
        <CyberButton href="/tools" variant="primary">
          Launch Tools
        </CyberButton>
        <CyberButton href="/ethics" variant="secondary">
          Read Ethics
        </CyberButton>
      </div>
    </section>
  );
}
