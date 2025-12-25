
'use client';

import { Menu, Star, ChevronDown, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShieldIcon } from './icons';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useMemo } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebaseClient';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

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

        <div className="flex items-center gap-2">
          <ShieldIcon className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">Pentellia</span>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side: buttons + dropdowns */}
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
                <AvatarImage
                  src={userAvatar?.imageUrl}
                  alt={userAvatar?.description}
                  data-ai-hint={userAvatar?.imageHint}
                />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium">User</span>
                  <span className="text-xs text-muted-foreground">My Workspace</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
