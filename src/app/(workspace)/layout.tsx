import { AppShell } from "@/components/layout/app-shell";
import { AstryxProvider } from "@/components/astryx-provider";

export const metadata = {
  title: {
    default: "SkyOS",
    template: "%s · SkyOS",
  },
  description: "From signal to customer to compliance.",
};

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-sans">
      <AstryxProvider>
        <AppShell>{children}</AppShell>
      </AstryxProvider>
    </div>
  );
}
