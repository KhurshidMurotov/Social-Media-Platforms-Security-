import { ModuleCard } from "@/components/ModuleCard";
import { Divider } from "@/components/ui/Divider";
import { PasswordChecker } from "@/modules/passwordStrength/PasswordChecker";
import { EmailLeakChecker } from "@/modules/emailLeak/EmailLeakChecker";
import { UrlScanner } from "@/modules/phishingUrl/UrlScanner";
import { UsernameFinder } from "@/modules/osintUsername/UsernameFinder";

const MODULE_INDEX = [
  { id: "password", label: "Password Checker" },
  { id: "email-leak", label: "Email Leak Checker" },
  { id: "url-scanner", label: "URL Scanner" },
  { id: "username", label: "Username Finder" }
];

export function ToolsSection() {
  return (
    <section className="section-dark tools-layout">
      <aside className="module-rail" aria-label="Module index">
        <p className="module-rail__title">Module Index</p>
        <Divider />
        <ul className="module-rail__list">
          {MODULE_INDEX.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`} className="module-rail__link">
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </aside>

      <div className="tools-modules">
        <div className="grid">
          <div className="span-12 module-block" id="password">
            <div className="tool-chips">
              <span className="tool-chip">LOCAL</span>
              <span className="tool-chip">CLIENT-SIDE</span>
            </div>
            <ModuleCard
              title="Password Strength Checker"
              description="Client-side awareness check: length, estimated entropy, and basic pattern warnings."
            >
              <PasswordChecker />
            </ModuleCard>
          </div>

          <div className="span-12 module-block" id="email-leak">
            <div className="tool-chips">
              <span className="tool-chip">PUBLIC API</span>
              <span className="tool-chip">LEAKCHECK</span>
            </div>
            <ModuleCard
              title="Email Leak Checker"
              description="Checks whether an email appears in known breach datasets using LeakCheck Public API."
            >
              <EmailLeakChecker />
            </ModuleCard>
          </div>

          <div className="span-12 module-block" id="url-scanner">
            <div className="tool-chips">
              <span className="tool-chip">PUBLIC API</span>
              <span className="tool-chip">RATE LIMITED</span>
            </div>
            <ModuleCard
              title="Phishing / Malicious URL Scanner (VirusTotal)"
              description="Server-side proxy to scan a URL using VirusTotal (requires VT API key)."
            >
              <UrlScanner />
            </ModuleCard>
          </div>

          <div className="span-12 module-block" id="username">
            <div className="tool-chips">
              <span className="tool-chip">OSINT</span>
              <span className="tool-chip">BEST-EFFORT</span>
            </div>
            <ModuleCard
              title="OSINT Username Finder"
              description="Checks public profile pages across popular platforms and verifies whether the username appears to exist."
            >
              <UsernameFinder />
            </ModuleCard>
          </div>
        </div>
      </div>
    </section>
  );
}
