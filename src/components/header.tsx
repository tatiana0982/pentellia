import Link from "next/link";
import Image from "next/image";
import { Bell, Rocket, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AppSidebar } from "@/components/app-sidebar";
import { cn } from "@/lib/utils";

const userAvatar = PlaceHolderImages.find((img) => img.id === "user-avatar");

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
      <div className="lg:hidden">
        <Sheet>
            <SheetTrigger asChild>
                <SidebarTrigger />
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] p-0">
                 <div className="flex h-full flex-col">
                    <AppSidebar />
                </div>
            </SheetContent>
        </Sheet>
      </div>

      <div className="flex-1">
        {/* Can be used for breadcrumbs or page title */}
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Toggle notifications</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              {userAvatar && (
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={userAvatar.imageUrl}
                    alt={userAvatar.description}
                    width={32}
                    height={32}
                    data-ai-hint={userAvatar.imageHint}
                  />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              )}
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
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
