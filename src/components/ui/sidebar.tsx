
"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { PanelLeft } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent as SheetPrimitiveContent } from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH_ICON = "3.5rem"
const SIDEBAR_WIDTH_EXPANDED = "22rem" // 352px
const SIDEBAR_KEYBOARD_SHORTCUT = "b"


type SidebarContextValue = {
  state: "expanded" | "collapsed"
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }
  return context
}

export const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultOpen?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }
>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      children,
      ...props
    },
    ref
  ) => {
    const isMobile = useIsMobile()
    const [openMobile, setOpenMobile] = React.useState(false)
    const [_open, _setOpen] = React.useState(defaultOpen)
    const open = openProp ?? _open

    const setOpen = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const openState = typeof value === "function" ? value(open) : value
        if (setOpenProp) {
          setOpenProp(openState)
        } else {
          _setOpen(openState)
        }
        if (typeof window !== 'undefined') {
          document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
        }
      },
      [setOpenProp, open]
    )

    const toggleSidebar = React.useCallback(() => {
      return isMobile
        ? setOpenMobile((current) => !current)
        : setOpen((current) => !current)
    }, [isMobile, setOpen, setOpenMobile])

    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault()
          toggleSidebar()
        }
      }
      if (typeof window !== 'undefined') {
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
      }
    }, [toggleSidebar])

    const state = open ? "expanded" : "collapsed"

    const contextValue = React.useMemo<SidebarContextValue>(
      () => ({
        state,
        isMobile,
        toggleSidebar,
      }),
      [state, isMobile, toggleSidebar]
    )

    // For mobile, we render the Sheet. The main content is just children.
    if (isMobile) {
        return (
            <SidebarContext.Provider value={contextValue}>
                <TooltipProvider delayDuration={0}>
                    <Sheet open={openMobile} onOpenChange={setOpenMobile}>
                        {children}
                    </Sheet>
                </TooltipProvider>
            </SidebarContext.Provider>
        )
    }

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={0}>
            <div
                ref={ref}
                className="group/sidebar-wrapper"
                data-state={state}
                style={{
                    "--sidebar-width": SIDEBAR_WIDTH_EXPANDED,
                    "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
                } as React.CSSProperties}
                {...props}
            >
                {children}
            </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    )
  }
)
SidebarProvider.displayName = "SidebarProvider"


export const Sidebar = React.forwardRef<
  HTMLElement,
  React.ComponentProps<"aside">
>(
  ({ className, children, ...props }, ref) => {
    const { isMobile } = useSidebar();
    
    if (isMobile) {
      return (
        <SheetPrimitiveContent
          ref={ref as React.Ref<HTMLDivElement>}
          side="left"
          className="w-[var(--sidebar-width)] bg-sidebar p-0 text-sidebar-foreground data-[state=closed]:duration-200 data-[state=open]:duration-300"
        >
          {children}
        </SheetPrimitiveContent>
      )
    }

    return (
      <aside
        ref={ref}
        className={cn(
          "hidden md:flex flex-col h-screen transition-all duration-300 ease-in-out",
          "bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
          "group-data-[state=expanded]/sidebar-wrapper:w-[var(--sidebar-width)]",
          "group-data-[state=collapsed]/sidebar-wrapper:w-[var(--sidebar-width-icon)]",
          className
        )}
        {...props}
      >
        {children}
      </aside>
    )
  }
)
Sidebar.displayName = "Sidebar"

export const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className={cn("md:hidden", className)}
      onClick={toggleSidebar}
      {...props}
    >
      <PanelLeft />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

export const SidebarToggle = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, ...props }, ref) => {
  const { isMobile, toggleSidebar, state } = useSidebar();

  if (isMobile) {
    return null;
  }

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8 shrink-0", className)}
      onClick={toggleSidebar}
      {...props}
    >
      <PanelLeft
        className={cn(
          "h-5 w-5 transition-transform duration-300 ease-in-out",
          state === "collapsed" && "rotate-180"
        )}
      />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
});
SidebarToggle.displayName = "SidebarToggle";


export const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex h-14 items-center p-4 transition-all duration-300 shrink-0",
        "group-data-[state=collapsed]/sidebar-wrapper:px-2",
        className)}
      {...props}
    />
  )
})
SidebarHeader.displayName = "SidebarHeader"

export const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex-1 overflow-y-auto overflow-x-hidden",
        className
      )}
      {...props}
    />
  )
})
SidebarContent.displayName = "SidebarContent"

export const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "p-2 mt-auto shrink-0",
        className)}
      {...props}
    />
  )
})
SidebarFooter.displayName = "SidebarFooter"

export const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-col gap-1 px-2", className)}
    {...props}
  />
))
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItemContext = React.createContext<{ isCollapsed: boolean }>({ isCollapsed: false });


export const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, children, ...props }, ref) => {
    const { state } = useSidebar();
    const isCollapsed = state === 'collapsed';
    
    return (
        <SidebarMenuItemContext.Provider value={{ isCollapsed }}>
            <li ref={ref} className={cn("group/menu-item relative", className)} {...props}>
                {children}
            </li>
        </SidebarMenuItemContext.Provider>
    )
})
SidebarMenuItem.displayName = "SidebarMenuItem"


export const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: React.ReactNode;
  }
>(({ asChild, isActive, tooltip, children, className, ...props }, ref) => {
    const { isCollapsed } = React.useContext(SidebarMenuItemContext);
    const Comp = asChild ? Slot : "button";

    const button = (
        <Comp
            ref={ref}
            data-active={isActive}
            className={cn(
                "flex w-full items-center gap-3 overflow-hidden rounded-md p-2 text-left text-sm h-auto outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
                "data-[active=true]:bg-sidebar-primary data-[active=true]:font-semibold data-[active=true]:text-sidebar-primary-foreground",
                "data-[active=true]:hover:bg-sidebar-primary/90",
                isCollapsed && "justify-center",
                className
            )}
            {...props}
        >
            {children}
        </Comp>
    );

    if (!tooltip || !isCollapsed) {
        return button;
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="right" align="center">
                {tooltip}
            </TooltipContent>
        </Tooltip>
    );
});
SidebarMenuButton.displayName = "SidebarMenuButton";

export const SidebarMenuItemLabel = React.forwardRef<
    HTMLSpanElement,
    React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => {
    const { isCollapsed } = React.useContext(SidebarMenuItemContext);

    return (
        <span
            ref={ref}
            className={cn(
                "truncate",
                isCollapsed && "hidden",
                className
            )}
            {...props}
        />
    )
});
SidebarMenuItemLabel.displayName = "SidebarMenuItemLabel";
