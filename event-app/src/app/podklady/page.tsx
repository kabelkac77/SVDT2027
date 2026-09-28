import { Intake } from "@/components/intake";
export default function Page() {
  return (
    <main className="standalone">
      <a href="/" className="back">
        ← Zpět k aplikaci
      </a>
      <Intake />
    </main>
  );
}
