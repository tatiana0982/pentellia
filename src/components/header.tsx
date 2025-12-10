
'use client';

import { Menu, Star, ChevronDown } from 'lucide-react';
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

export function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  const userAvatar = useMemo(
    () => PlaceHolderImages.find((img) => img.id === 'user-avatar'),
    []
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 text-white">
      {/* Left side: menu + logo */}
      <div className="flex items-center gap-3">
        <Button
          onClick={toggleSidebar}
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white hover:bg-slate-800"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2">
          <ShieldIcon className="h-6 w-6 text-white" />
          <span className="text-lg font-semibold text-white">Pentest Tools</span>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side: buttons + dropdowns */}
      <div className="flex items-center gap-x-3 sm:gap-x-4">
        <Button variant="warning" className="hidden sm:inline-flex text-sm">
          <Star className="mr-2 h-4 w-4" />
          Unlock full features
        </Button>
        <Button variant="dark" className="hidden sm:inline-flex text-sm">
          Book a Demo
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="hidden sm:flex items-center gap-1 text-xs font-medium text-slate-100 hover:text-white"
            >
              RESOURCES
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Blog</DropdownMenuItem>
            <DropdownMenuItem>API Reference</DropdownMenuItem>
            <DropdownMenuItem>Changelog</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 p-1 h-auto rounded-full hover:bg-slate-800"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={userAvatar?.imageUrl}
                  alt={userAvatar?.description}
                  data-ai-hint={userAvatar?.imageHint}
                />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
