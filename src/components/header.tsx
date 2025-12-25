
'use client';

import { Menu, Star, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShieldIcon } from './icons';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useMemo } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  const userAvatar = useMemo(
    () => PlaceHolderImages.find((img) => img.id === 'user-avatar'),
    []
  );

  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    await fetch('/api/logout', { method: 'POST' });
    return router.push('/login');
  };

  const navLinks = [
    { label: 'Security Overview', href: '#' },
    { label: 'Threat Context', href: '#' },
    { label: 'How It Works', href: '#' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card px-4 text-foreground">
      {/* Left side: menu + logo */}
      <div className="flex items-center gap-3">
        <Button
          onClick={toggleSidebar}
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-foreground/80 hover:bg-accent hover:text-foreground"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Link href="/dashboard" className="flex items-center gap-2">
          <ShieldIcon className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">Pentellia</span>
        </Link>
      </div>

      {/* Center: Contextual Nav */}
      <nav className="hidden md:flex flex-1 items-center justify-center">
        <div className="flex items-center gap-2 rounded-full border border-border bg-background p-1">
          {navLinks.map((link) => (
            <Button 
                key={link.href}
                variant='ghost'
                size='sm'
                asChild 
                className="rounded-full text-muted-foreground hover:text-foreground"
            >
                <Link href={link.href}>
                    {link.label}
                </Link>
            </Button>
          ))}
        </div>
      </nav>

      {/* Right side: actions + user menu */}
      <div className="flex items-center gap-x-2 sm:gap-x-3">
        <Button variant="outline" className="hidden sm:inline-flex text-sm border-secondary/50 text-secondary hover:bg-secondary/10 hover:text-secondary hover:border-secondary">
          <Star className="mr-2 h-4 w-4" />
          Upgrade
        </Button>
        
        <Button variant="ghost" size="icon" className="h-9 w-9 text-foreground/80 hover:bg-accent hover:text-foreground">
            <Bell className="h-5 w-5"/>
            <span className="sr-only">Notifications</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 p-1 h-auto rounded-full hover:bg-accent"
            >
              <Avatar className="h-8 w-8">
                {userAvatar && (
                  <AvatarImage
                    src={userAvatar.imageUrl}
                    alt={userAvatar.description}
                    data-ai-hint={userAvatar.imageHint}
                  />
                )}
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Workspace settings</DropdownMenuItem>
            <DropdownMenuItem>Security preferences</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
