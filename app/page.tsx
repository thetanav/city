import SignIn from "@/components/auth/sign-in";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] overflow-hidden">
      {/* Background Decorative Element */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] -right-[5%] w-[30%] h-[30%] bg-primary/10 rounded-full blur-[100px]" />
      </div>

      <section className="container px-4 md:px-6 py-12 md:py-24 lg:py-32 flex flex-col items-center text-center space-y-8">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-block px-3 py-1 rounded-full bg-secondary text-[10px] font-bold uppercase tracking-[0.2em] animate-in fade-in slide-in-from-bottom-3 duration-1000">
            Next Generation Events
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-black tracking-tight uppercase leading-[0.9] animate-in fade-in slide-in-from-bottom-4 duration-1000 fill-mode-both delay-150">
            Build the <span className="text-primary italic">future</span> of events.
          </h1>
          <p className="mx-auto max-w-[700px] text-muted-foreground text-lg md:text-xl font-light animate-in fade-in slide-in-from-bottom-5 duration-1000 fill-mode-both delay-300">
            A refined, minimalist platform for creators. Experience the intersection of performance, design, and scalability.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-6 duration-1000 fill-mode-both delay-500">
          <Button size="lg" className="h-12 px-8 rounded-none uppercase tracking-widest text-xs font-bold">
            Get Started
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-8 rounded-none uppercase tracking-widest text-xs font-bold">
            Explore
          </Button>
        </div>

        <div className="w-full max-w-sm pt-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both delay-700">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/0 rounded-lg blur opacity-25" />
            <div className="relative bg-card border border-border/50 p-6">
               <SignIn />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
