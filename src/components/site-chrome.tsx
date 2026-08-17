import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function SiteHeader({ signedIn }: { signedIn?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <Link href="/#features" className="hover:text-foreground">
            Features
          </Link>
          <Link href="/#how-it-works" className="hover:text-foreground">
            How it works
          </Link>
          <Link href="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {signedIn ? (
            <Link href="/app" className={cn(buttonVariants({ size: "sm" }))}>
              Open app
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Log in
              </Link>
              <Link href="/signup" className={cn(buttonVariants({ size: "sm" }))}>
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground">
            Operations software for GunBroker sellers. Chamber does not sell firearms
            or ammunition and does not replace FFL, ATF, or carrier compliance
            obligations.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm">
          <div className="space-y-2">
            <p className="text-foreground">Product</p>
            <Link href="/#features" className="block text-muted-foreground hover:text-foreground">
              Features
            </Link>
            <Link href="/pricing" className="block text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="/signup" className="block text-muted-foreground hover:text-foreground">
              Sign up
            </Link>
          </div>
          <div className="space-y-2">
            <p className="text-foreground">Account</p>
            <Link href="/login" className="block text-muted-foreground hover:text-foreground">
              Log in
            </Link>
            <Link href="/forgot-password" className="block text-muted-foreground hover:text-foreground">
              Reset password
            </Link>
            <Link href="/legal/terms" className="block text-muted-foreground hover:text-foreground">
              Terms
            </Link>
            <Link href="/legal/privacy" className="block text-muted-foreground hover:text-foreground">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
