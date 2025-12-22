
import MarketingLayout from './(marketing)/layout';

export default function MarketingPage() {
  return (
    <MarketingLayout>
      <div className="flex flex-1 items-center justify-center text-center">
        <div className="container mx-auto px-4 md:px-6">
           <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none text-white">
            Continuous Attack Surface Monitoring
          </h1>
          <p className="mx-auto mt-6 max-w-[700px] text-lg text-slate-400">
            Engineered for the modern enterprise security team.
          </p>
        </div>
      </div>
    </MarketingLayout>
  );
}
