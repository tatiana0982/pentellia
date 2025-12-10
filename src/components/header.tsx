
import { ChevronDown, LifeBuoy, LogOut, Settings, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AppSidebar } from "@/components/app-sidebar";
import { cn } from "@/lib/utils";

export function Header() {
  return (
    <header className={cn("sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b bg-[#242a34] px-4 sm:gap-x-6 sm:px-6 lg:px-8")}>
      
      {/* Mobile sidebar menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden -ml-2">
            <SidebarTrigger />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[260px] p-0">
          <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
            <AppSidebar />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar trigger */}
      <div className="hidden lg:flex">
        <SidebarTrigger />
      </div>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-200/20 lg:hidden" aria-hidden="true" />


      <div className="flex flex-1 items-center justify-end gap-4">
        <Button variant="outline" size="sm" className="hidden sm:inline-flex">Unlock full features</Button>
        <Button size="sm" className="hidden sm:inline-flex">Book a Demo</Button>
        
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-1">
                    Resources
                    <ChevronDown className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem>Blog</DropdownMenuItem>
                <DropdownMenuItem>API Reference</DropdownMenuItem>
                <DropdownMenuItem>Changelog</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                    <LifeBuoy className="mr-2 h-4 w-4" />
                    <span>Support</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxwZXJzb24lMjBmYWNlfGVufDB8fHx8MTc2NTE4MzEwM3ww&ixlib=rb-4.1.0&q=80&w=1080"
                    alt="User avatar"
                    width={32}
                    height={32}
                    data-ai-hint="person face"
                  />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">User</p>
                <p className="text-xs leading-none text-muted-foreground">
                  user@pentellia.com
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
