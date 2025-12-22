
import MarketingLayout from './(marketing)/layout';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function MarketingPage() {
  return (
    <MarketingLayout>
      <div className="flex flex-1 items-center justify-center text-center">
        <div className="container mx-auto px-4 md:px-6">
           <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl text-white">
            Pentellia
          </h1>
          <p className="mx-auto mt-6 max-w-[700px] text-lg text-slate-300">
            Enterprise Security Platform
          </p>
           <div className="mt-8 flex justify-center gap-4">
            <Button asChild size="lg" variant="secondary">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild size="lg">
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
