
'use client';

import { Menu, Star, Bell, SlidersHorizontal, KeyRound, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/providers/AuthProvider';

export function Header({ toggleSidebar }: { toggleSidebar: () => void }) {

  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    await fetch('/api/logout', { method: 'POST' });
    return router.push('/login');
  };

  const navLinks = [
    { label: 'Overview', href: '/dashboard/overview' },
    { label: 'Threat Context', href: '/dashboard/threat-context' },
    { label: 'Reports', href: '/dashboard/reports' },
  ];
  
  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return `${first}${last}`.toUpperCase();
  }

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

        <Link href="/dashboard" className="flex items-center">
          <Image
            src="https://blush-fashionable-swift-557.mypinata.cloud/ipfs/bafkreihyjqoev5bqtru5clk4iazyjfwjzaz4te6qr43o6j7closdivtqoq"
            alt="Pentellia Logo"
            width={120}
            height={32}
          />
        </Link>
      </div>

      {/* Center: Contextual Nav */}
      <nav className="hidden md:flex flex-1 items-center justify-center">
        <div className="flex items-center gap-2 rounded-full p-1">
          {navLinks.map((link) => (
            <Button 
                key={link.href}
                variant='ghost'
                size='sm'
                asChild 
                className="rounded-md text-muted-foreground hover:bg-accent hover:text-foreground text-sm"
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
        <Button variant="outline" className="hidden sm:inline-flex text-sm hover:bg-primary/10 hover:text-primary hover:border-primary">
          Plans & Billing
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
                 <AvatarFallback>{user ? getInitials(user.firstName, user.lastName) : 'U'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Preferences
            </DropdownMenuItem>
             <DropdownMenuItem>
                <KeyRound className="mr-2 h-4 w-4" />
                API Keys
            </DropdownMenuItem>
            <DropdownMenuItem>
                <ScrollText className="mr-2 h-4 w-4" />
                Audit Logs
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
