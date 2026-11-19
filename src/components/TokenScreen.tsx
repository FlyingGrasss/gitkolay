"use client";

import { ArrowRight, Check, Eye, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TokenForm } from "@/components/TokenForm";
import { useSession } from "@/components/SessionProvider";

const BENEFITS = [
  "Depolarınızı tek ekranda görün.",
  "Dosyaları tarayıcıda düzenleyin.",
  "Yeni depo birkaç tıkla hazır olsun.",
];

export function TokenScreen({ authError }: { authError?: string | null }) {
  const { skip } = useSession();

  return (
    <main className="mx-auto max-w-content px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      <div className="grid items-start gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <section>
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-subtle px-3 py-1 text-sm font-medium text-muted">
            <Eye aria-hidden="true" className="h-3.5 w-3.5" />
            Sade bir GitHub arayüzü
          </p>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
            GitHub, olduğundan daha kolay.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
            Depolarınızı görüntüleyin, dosya düzenleyin ve yeni depo açın.
            Terminal ya da karmaşık menüler olmadan.
          </p>

          <ul className="mt-8 space-y-3">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-base text-ink">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                  <Check aria-hidden="true" className="h-3.5 w-3.5" />
                </span>
                {benefit}
              </li>
            ))}
          </ul>

          <div className="mt-10 max-w-xl rounded-container border border-line p-5">
            <div className="flex items-start gap-3">
              <Eye aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-muted" />
              <div>
                <h2 className="font-semibold text-ink">
                  Token olmadan da göz atabilirsiniz
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-muted">
                  Herkese açık depoları görüntülemek için token gerekmez.
                  Düzenleme, yeni dosya ve yeni depo için token gerekir.
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 -ml-2 text-ink underline underline-offset-4"
              onClick={skip}
            >
              Token olmadan devam et
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
        </section>

        <section
          aria-labelledby="connect-heading"
          className="rounded-container border border-line bg-surface p-6 sm:p-8"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-field bg-subtle text-ink">
              <KeyRound aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h2 id="connect-heading" className="text-xl font-semibold text-ink">
                Hesabınızı bağlayın
              </h2>
              <p className="text-sm text-muted">İsteğe bağlı, tek adım.</p>
            </div>
          </div>

          <p className="mt-5 text-sm leading-6 text-muted">
            Token yalnızca bu tarayıcı sekmesinde saklanır. GitKolay
            tarayıcınızdan doğrudan GitHub&apos;a bağlanır; arada bir sunucu
            yoktur.
          </p>

          <div className="mt-6">
            <TokenForm initialError={authError} />
          </div>

          <div className="mt-6 flex items-start gap-2 border-t border-line pt-5 text-xs leading-5 text-muted">
            <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Tokenı yalnızca bu cihazda, bu sekme açık kaldığı sürece
              saklarız. Sekmeyi kapatınca silinir.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
