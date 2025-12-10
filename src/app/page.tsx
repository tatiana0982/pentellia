
import { Button } from "@/components/ui/button";
import { CheckCircle, Globe, Shield, Activity, Users, Bot, FileText, BrainCircuit } from "lucide-react";
import Link from "next/link";
import MarketingLayout from "./(marketing)/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Section = ({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) => (
  <section
    id={id}
    className={`container mx-auto px-4 py-16 md:px-6 md:py-24 ${className || ""}`}
  >
    {children}
  </section>
);

export default function MarketingPage() {
  return (
    <MarketingLayout>
      {/* Hero Section */}
      <section className="relative w-full pt-24 pb-12 md:pt-32 md:pb-20 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-slate-950">
           <div className="absolute bottom-0 left-[-20%] right-0 top-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(60,130,240,0.2),rgba(255,255,255,0))]"></div>
           <div className="absolute bottom-0 right-[-20%] top-0 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(200,80,240,0.15),rgba(255,255,255,0))]"></div>
        </div>

        <div className="container mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left side content */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <Badge variant="outline" className="mb-4 border-cyan-400/50 text-cyan-400">Enterprise Pentesting Platform</Badge>
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-5xl lg:text-6xl text-white">
                Get a hacker’s perspective on your attack surface.
              </h1>
              <p className="mx-auto mt-6 max-w-[700px] text-lg text-slate-300">
                Pentellia is a multi-tenant, AI-powered pentesting and breach-monitoring dashboard designed for modern security teams.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Button asChild size="lg" className="bg-cyan-500 text-slate-900 hover:bg-cyan-400">
                  <Link href="#demo">Book a live demo</Link>
                </Button>
                <Button asChild size="lg" variant="secondary" className="bg-slate-800 hover:bg-slate-700">
                  <Link href="#modules">Explore dashboard sample</Link>
                </Button>
              </div>
              <p className="mt-4 text-sm text-slate-400">Built for security teams, MSSPs, and enterprise defenders.</p>
            </div>

            {/* Right side content - Dashboard Preview */}
            <div className="relative">
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 opacity-50 blur-lg"></div>
              <Card className="relative bg-slate-900/60 backdrop-blur-lg border-slate-700/80 shadow-2xl shadow-cyan-500/10">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-3 text-white">
                    <MiniStatCard title="Active tenants" value="14" />
                    <MiniStatCard title="Open criticals" value="7" />
                    <MiniStatCard title="Scans running" value="32" />
                    <MiniStatCard title="Breach alerts" value="99+" />
                  </div>
                  <div className="mt-4 h-24 rounded-lg bg-slate-800/50 p-2">
                     <div className="h-full w-full flex items-end gap-1">
                        {Array.from({length: 12}).map((_, i) => (
                          <div key={i} className="flex-1 bg-cyan-400/50 rounded-t-sm" style={{height: `${Math.random() * 60 + 20}%`}}></div>
                        ))}
                     </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props Strip */}
      <section className="bg-slate-900/50 py-12">
        <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <ValueProp icon={Users} text="Multi-tenant ready" />
                <ValueProp icon={FileText} text="Scoped, auditable pentests" />
                <ValueProp icon={BrainCircuit} text="AI summaries for executives" />
                <ValueProp icon={Globe} text="Radar for leaked data" />
            </div>
        </div>
      </section>

      {/* What you can do Section */}
      <Section id="product">
         <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="prose prose-invert max-w-none text-slate-300">
               <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-white">What you can do with Pentellia</h2>
               <p className="mt-4">
                  Pentellia orchestrates your entire offensive security workflow, from asset discovery and scoped scanning to AI-powered reporting. It combines powerful open-source tools with proprietary breach monitoring (Radar) and an AI Co-Pilot to give you a unified view of your risk.
               </p>
            </div>
            <div className="space-y-6">
                <FeatureListItem
                    icon={CheckCircle}
                    title="Register domains and enforce authorized scope."
                    description="Ensure all scans are targeted, authorized, and auditable, giving you full control over your testing environment."
                />
                <FeatureListItem
                    icon={CheckCircle}
                    title="Orchestrate Nmap, Nuclei, Nikto, and more."
                    description="Run a wide range of security tools from a unified dashboard, collecting and correlating findings automatically."
                />
                 <FeatureListItem
                    icon={CheckCircle}
                    title="Generate executive-ready PDF/CSV reports with AI."
                    description="Instantly create professional reports with AI-generated summaries that translate technical findings into business impact."
                />
                <FeatureListItem
                    icon={CheckCircle}
                    title="Let Pentellia Co-Pilot explain findings in plain English."
                    description="Use our AI assistant to understand complex vulnerabilities, get remediation advice, and draft communications."
                />
            </div>
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
        <div className="text-center text-slate-500">[Modules content here]</div>
      </Section>

      {/* How It Works Section */}
      <Section id="platform">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            How It Works
          </h2>
        </div>
         <div className="text-center text-slate-500">[How It Works steps here]</div>
      </Section>

      {/* Stats Strip */}
      <div className="bg-blue-900/20 py-12">
        <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
                <div><p className="text-4xl font-bold text-cyan-400">10x</p><p className="text-slate-300">Faster Discovery</p></div>
                <div><p className="text-4xl font-bold text-cyan-400">95%</p><p className="text-slate-300">Signal-to-Noise</p></div>
                <div><p className="text-4xl font-bold text-cyan-400">24/7</p><p className="text-slate-300">Autonomous Monitoring</p></div>
                <div><p className="text-4xl font-bold text-cyan-400">100+</p><p className="text-slate-300">Integrations</p></div>
            </div>
        </div>
      </div>

      {/* Testimonials Strip */}
      <Section>
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            Trusted by Security Teams
          </h2>
        </div>
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

const MiniStatCard = ({ title, value }: { title: string, value: string }) => (
  <div className="rounded-lg bg-slate-800/50 p-3">
    <p className="text-xs text-slate-400">{title}</p>
    <p className="text-xl font-semibold text-white">{value}</p>
  </div>
);

const ValueProp = ({ icon: Icon, text }: { icon: React.ElementType, text: string }) => (
    <div className="flex flex-col items-center gap-2">
        <Icon className="h-8 w-8 text-cyan-400" />
        <p className="text-slate-300 text-sm">{text}</p>
    </div>
);

const FeatureListItem = ({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => (
    <div className="flex gap-4">
        <div>
            <Icon className="h-6 w-6 text-cyan-400 mt-1" />
        </div>
        <div>
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="text-slate-400 mt-1">{description}</p>
        </div>
    </div>
);
