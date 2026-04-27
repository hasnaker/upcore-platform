import React from "react";
import BrowserOnly from "@docusaurus/BrowserOnly";

/**
 * API referans görüntüleyici.
 *
 * Stoplight Elements web componentini iframe-free olarak mount eder.
 * SSR sırasında yalnızca placeholder gösterir (Stoplight'in runtime bağımlılığı
 * window gerektirir).
 */
export interface ApiReferenceProps {
  /** Static klasörde /openapi/<id>.yaml adresinde yayımlanan spec. */
  specId: string;
  /** Servisin kullanıcı-dostu adı. */
  title?: string;
  /** "try-it-out" sandbox'ı görünsün mü? Default: true */
  tryItEnabled?: boolean;
  /** Router mode — path veya hash. Default: hash (SPA uyumlu) */
  routerMode?: "hash" | "history" | "memory";
}

const ApiReferenceInner: React.FC<ApiReferenceProps> = ({
  specId,
  title,
  tryItEnabled = true,
  routerMode = "hash",
}) => {
  React.useEffect(() => {
    const scriptId = "stoplight-elements-script";
    if (!document.getElementById(scriptId)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/@stoplight/elements@8.4.3/styles.min.css";
      document.head.appendChild(link);

      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://unpkg.com/@stoplight/elements@8.4.3/web-components.min.js";
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  const apiDescriptionUrl = `/openapi/${specId}.yaml`;

  return (
    <div style={{ height: "calc(100vh - 200px)", minHeight: "600px" }}>
      {title ? <h1 style={{ marginTop: 0 }}>{title}</h1> : null}
      {/* @ts-expect-error custom element */}
      <elements-api
        apiDescriptionUrl={apiDescriptionUrl}
        router={routerMode}
        layout="sidebar"
        tryItCredentialsPolicy="same-origin"
        hideSchemas="false"
        hideInternal="true"
        tryItOutEnabled={tryItEnabled ? "true" : "false"}
      />
    </div>
  );
};

export default function ApiReference(props: ApiReferenceProps): JSX.Element {
  return (
    <BrowserOnly
      fallback={
        <div style={{ padding: "2rem", textAlign: "center" }}>
          API referansı yükleniyor…
        </div>
      }
    >
      {() => <ApiReferenceInner {...props} />}
    </BrowserOnly>
  );
}
