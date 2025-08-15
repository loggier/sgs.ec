
"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { ChevronLeft } from "lucide-react"

import { Sheet, SheetContent, SheetTrigger } from "./sheet"
import { cn } from "@/lib/utils"

import { Button } from "./button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip"

interface SidebarContextProps {
  isOpen: boolean
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
  isCollapsed: boolean
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>
}

const SidebarContext = React.createContext<SidebarContextProps | undefined>(
  undefined
)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [isCollapsed, setIsCollapsed] = React.useState(false)

  return (
    <SidebarContext.Provider
      value={{ isOpen, setIsOpen, isCollapsed, setIsCollapsed }}
    >
      <TooltipProvider>{children}</TooltipProvider>
    </SidebarContext.Provider>
  )
}

const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { mobile?: boolean }
>(({ className, mobile = false, ...props }, ref) => {
  const { isCollapsed, isOpen, setIsOpen } = useSidebar()

  if (mobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <aside
            ref={ref}
            className={cn("flex flex-col h-full", className)}
            {...props}
          />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <aside ref={ref} className={cn("flex-col border-r bg-card hidden md:flex", isCollapsed ? "w-16" : "w-64", "transition-all duration-300 ease-in-out", className)} {...props} />
  )
})
Sidebar.displayName = "Sidebar"

const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, ...props }, ref) => {
  return (
    <SheetTrigger asChild>
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        className={cn("md:hidden", className)}
        {...props}
      >
        {props.children}
      </Button>
    </SheetTrigger>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

const SidebarClose = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className={cn("md:hidden", className)}
      {...props}
    />
  )
})
SidebarClose.displayName = "SidebarClose"

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex h-16 items-center", className)} {...props} />
))
SidebarHeader.displayName = "SidebarHeader"

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col", className)} {...props} />
))
SidebarContent.displayName = "SidebarContent"

const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex grow flex-col space-y-1", className)}
    {...props}
  />
))
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.LiHTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
))
SidebarMenuItem.displayName = "SidebarMenuItem"

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button> & {
    asChild?: boolean
    tooltip?: string
  }
>(({ className, tooltip, asChild, ...props }, ref) => {
  const { isCollapsed } = useSidebar()
  const Comp = asChild ? Slot : "button"

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={ref}
            variant="ghost"
            size="icon"
            className={cn("size-10", className)}
            {...props}
          />
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Button
      ref={ref}
      variant="ghost"
      className={cn("w-full justify-start gap-2", className)}
      asChild={asChild}
      {...props}
    />
  )
})
SidebarMenuButton.displayName = "SidebarMenuButton"

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { setIsCollapsed, isCollapsed } = useSidebar()
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center border-t",
        isCollapsed ? "justify-center" : "justify-between",
        className
      )}
      {...props}
    >
      {props.children}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "size-10 shrink-0",
          isCollapsed ? "hidden" : "inline-flex"
        )}
        onClick={() => setIsCollapsed(true)}
      >
        <ChevronLeft className="size-4" />
      </Button>
    </div>
  )
})
SidebarFooter.displayName = "SidebarFooter"

const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => {
  return (
    <main
      ref={ref}
      {...props}
    />
  )
})
SidebarInset.displayName = "SidebarInset"

export {
  SidebarProvider,
  useSidebar,
  Sidebar,
  SidebarTrigger,
  SidebarClose,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
}
