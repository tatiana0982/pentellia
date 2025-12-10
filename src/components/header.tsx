
import { Menu, Star, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShieldIcon } from "./icons";

export function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-x-4">
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
        <div className="hidden items-center gap-2 md:flex">
             <Menu className="h-6 w-6 text-gray-600" />
             <ShieldIcon className="h-6 w-6 text-gray-800" />
             <span className="text-lg font-semibold text-gray-800">Pentest Tools</span>
        </div>
      </div>

      <div className="flex items-center gap-x-4">
        <Button variant="warning" className="hidden sm:inline-flex">
          <Star className="mr-2 h-4 w-4" />
          Unlock full features
        </Button>
        <Button variant="dark" className="hidden sm:inline-flex">Book a Demo</Button>
        
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-1 text-sm font-semibold text-gray-600">
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
            <button className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxwZXJzb24lMjBmYWNlfGVufDB8fHx8MTc2NTE4MzEwM3ww&ixlib=rb-4.1.0&q=80&w=1080"
                    alt="User avatar"
                  />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <ChevronDown className="h-4 w-4 text-gray-600" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuContent />
            <DropdownMenuItem>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
