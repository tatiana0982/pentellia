
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import Link from "next/link";
import MarketingLayout from "./(marketing)/layout";

const Section = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <section
    className={`container mx-auto px-4 py-16 md:px-6 md:py-24 ${className || ""}`}
  >
    {children}
  </section>
);

export default function MarketingPage() {
  return (
    <MarketingLayout>
      {/* Hero Section */}
      <Section className="relative text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(37,99,235,0.2),rgba(255,255,255,0))]"></div>
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
          The Future of Offensive Security
        </h1>
        <p className="mx-auto mt-6 max-w-[700px] text-lg text-slate-300">
          Pentellia is a unified platform that combines advanced scanning with
          AI-driven insights to manage and mitigate your attack surface.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Button asChild size="lg" className="bg-cyan-500 text-slate-900 hover:bg-cyan-400">
            <Link href="#demo">Book a Demo</Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="bg-slate-800 hover:bg-slate-700">
            <Link href="#platform">Explore Platform</Link>
          </Button>
        </div>
      </Section>

      {/* What Pentellia Does */}
      <Section id="product">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            What Pentellia Does
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-slate-400">
            From asset discovery to vulnerability management, Pentellia provides a complete, automated security workflow.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
           {/* Placeholder for feature grid items */}
          <FeatureCard title="Continuous Asset Discovery" description="Automatically discover and inventory all your external-facing assets." />
          <FeatureCard title="Multi-Layered Scanning" description="Run network, web, and cloud scans to identify vulnerabilities." />
          <FeatureCard title="AI-Powered Triage" description="Leverage AI to prioritize critical findings and reduce noise." />
        </div>
      </Section>

      {/* Modules Section */}
      <Section id="modules" className="bg-slate-900/50 rounded-xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            Integrated Security Modules
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-slate-400">
            A comprehensive suite of tools working together to secure your perimeter.
          </p>
        </div>
         {/* Placeholder for modules */}
        <div className="text-center text-slate-500">[Modules content here]</div>
      </Section>

      {/* How It Works Section */}
      <Section id="platform">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            How It Works
          </h2>
        </div>
        {/* Placeholder for how-it-works steps */}
         <div className="text-center text-slate-500">[How It Works steps here]</div>
      </Section>
      
      {/* Stats Strip */}
      <div className="bg-blue-900/20 py-12">
        <Section className="py-0">
            <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
                {/* Placeholder for stats */}
                <div><p className="text-4xl font-bold text-cyan-400">10x</p><p className="text-slate-300">Faster Discovery</p></div>
                <div><p className="text-4xl font-bold text-cyan-400">95%</p><p className="text-slate-300">Signal-to-Noise</p></div>
                <div><p className="text-4xl font-bold text-cyan-400">24/7</p><p className="text-slate-300">Autonomous Monitoring</p></div>
                <div><p className="text-4xl font-bold text-cyan-400">100+</p><p className="text-slate-300">Integrations</p></div>
            </div>
        </Section>
      </div>

      {/* Testimonials Strip */}
      <Section>
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            Trusted by Security Teams
          </h2>
        </div>
         {/* Placeholder for testimonials */}
        <div className="text-center text-slate-500">[Testimonials here]</div>
      </Section>

      {/* CTA Section */}
      <Section id="demo" className="text-center">
         <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            Ready to Secure Your Attack Surface?
          </h2>
           <p className="mx-auto mt-4 max-w-3xl text-slate-400">
            Schedule a demo to see how Pentellia can transform your security operations.
          </p>
           <div className="mt-8">
            <Button asChild size="lg" className="bg-cyan-500 text-slate-900 hover:bg-cyan-400">
              <Link href="#demo">Book a Demo Today</Link>
            </Button>
          </div>
      </Section>
    </MarketingLayout>
  );
}

const FeatureCard = ({ title, description }: { title: string, description: string }) => (
  <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
    <CheckCircle className="mb-4 h-8 w-8 text-cyan-400" />
    <h3 className="mb-2 text-xl font-bold">{title}</h3>
    <p className="text-slate-400">{description}</p>
  </div>
);
