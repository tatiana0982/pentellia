
import type { ReactNode } from 'react';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const authImage = PlaceHolderImages.find(img => img.id === 'auth-image');

  return (
    <div className="container mx-auto flex flex-1 items-center justify-center py-12">
        <div className="grid w-full max-w-6xl grid-cols-1 items-center gap-12 md:grid-cols-2">
          {/* Left Column: Visual/Marketing */}
          <div className="hidden md:flex flex-col items-center justify-center text-center">
             <div className="relative h-[600px] w-full overflow-hidden rounded-lg">
                {authImage && (
                  <Image 
                    src={authImage.imageUrl}
                    alt={authImage.description}
                    fill
                    className="object-cover"
                    data-ai-hint={authImage.imageHint}
                  />
                )}
             </div>
          </div>

          {/* Right Column: Auth Form */}
          <div className="w-full">{children}</div>
        </div>
    </div>
  );
}
