import { Layout } from "@/components/Layout";
import { ToolsSection } from "@/components/ToolsSection";

export default function ToolsPage() {
  return (
    <Layout>
      <section className="tools-hero">
        <p className="hero__eyebrow">Tools Workspace</p>
        <h2 className="hero__title">Security Modules</h2>
        <p className="hero__subtitle">
          Run practical awareness checks and review outputs in one unified cyber console.
        </p>
      </section>
      <ToolsSection />
    </Layout>
  );
}
