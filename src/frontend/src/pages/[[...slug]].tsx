import { useEffect, useState, type ComponentType } from "react";

function LoadingShell() {
  return (
    <main className="min-h-screen bg-white text-[#1A2B47] flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-lg font-semibold">Loading CentralPerk...</p>
        <p className="mt-2 text-sm text-slate-500">Initializing the app shell.</p>
      </div>
    </main>
  );
}

export default function CatchAllPage() {
  const [ClientApp, setClientApp] = useState<ComponentType | null>(null);

  useEffect(() => {
    let isMounted = true;

    import("../next/LegacySpaApp").then((mod) => {
      if (isMounted) {
        setClientApp(() => mod.LegacySpaApp);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!ClientApp) {
    return <LoadingShell />;
  }

  return <ClientApp />;
}

export async function getServerSideProps() {
  return {
    props: {},
  };
}
