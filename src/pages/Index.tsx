const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <main className="text-center max-w-2xl">
        <h1 className="font-serif text-5xl md:text-7xl font-medium text-foreground animate-fade-in tracking-tight">
          Welcome
        </h1>
        
        <p className="mt-6 text-lg md:text-xl text-muted-foreground font-sans font-light opacity-0 animate-fade-in-slow leading-relaxed">
          We're glad you're here.
        </p>
        
        <div className="mt-12 w-16 h-px bg-accent/40 mx-auto opacity-0 animate-fade-in-slow" />
      </main>
    </div>
  );
};

export default Index;
