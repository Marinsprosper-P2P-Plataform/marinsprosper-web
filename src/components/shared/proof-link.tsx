import { LockIcon, PaperclipIcon } from "lucide-react";

/**
 * Link clicável pra abrir um comprovante anexado — sem isto, quem
 * recebe o comprovante só via o nome do arquivo como texto, sem
 * conseguir de fato abrir e conferir o que foi enviado. `url` é um
 * `blob:` local (só válido nesta aba/sessão); no backend real seria
 * uma URL assinada temporária de storage privado, nunca um caminho
 * público — mesmo princípio de `ChatAttachment.signedUrl`.
 */
export function ProofLink({ url, name }: { url: string; name?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="border-border hover:bg-accent flex items-center gap-2 rounded-md border p-2 text-xs"
    >
      <PaperclipIcon className="text-muted-foreground size-4 shrink-0" />
      <span className="text-foreground min-w-0 flex-1 truncate font-medium">
        {name ?? "Ver comprovante"}
      </span>
      <span className="text-muted-foreground flex shrink-0 items-center gap-1">
        <LockIcon className="size-3" />
        Abrir
      </span>
    </a>
  );
}
