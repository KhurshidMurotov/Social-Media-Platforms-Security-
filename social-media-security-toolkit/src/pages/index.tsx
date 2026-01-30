import { Layout } from "@/components/Layout";
import { ModuleCard } from "@/components/ModuleCard";
import { ConsentNotice } from "@/components/ConsentNotice";
import { PasswordChecker } from "@/modules/passwordStrength/PasswordChecker";
import { EmailLeakChecker } from "@/modules/emailLeak/EmailLeakChecker";
import { UrlScanner } from "@/modules/phishingUrl/UrlScanner";
import { UsernameFinder } from "@/modules/osintUsername/UsernameFinder";

export default function HomePage() {
  return (
    <Layout>
      <ConsentNotice />
      <div className="grid" id="top">
        <div className="span-12" id="password">
          <ModuleCard
            title="Password Strength Checker"
            description="Client-side awareness check: length, estimated entropy, and basic pattern warnings."
          >
            <PasswordChecker />
          </ModuleCard>
        </div>

        <div className="span-12" id="email-leak">
          <ModuleCard
            title="Email Leak Checker"
            description="Checks whether an email appears in known breach datasets (requires HIBP_API_KEY or LEAKCHECK_API_KEY)."
          >
            <EmailLeakChecker />
          </ModuleCard>
        </div>

        <div className="span-12" id="url-scanner">
          <ModuleCard
            title="Phishing / Malicious URL Scanner (VirusTotal)"
            description="Server-side proxy to scan a URL using VirusTotal (requires VT API key)."
          >
            <UrlScanner />
          </ModuleCard>
        </div>

        <div className="span-12" id="username-finder">
          <ModuleCard
            title="OSINT Username Finder"
            description="Shows where a username may exist across popular platforms, with limited verification via safe public APIs."
          >
            <UsernameFinder />
          </ModuleCard>
        </div>
      </div>
    </Layout>
  );
}

