import React from "react";
import Footer from "@theme-original/DocItem/Footer";
import type FooterType from "@theme/DocItem/Footer";
import type { WrapperProps } from "@docusaurus/types";
import FeedbackWidget from "@site/src/components/FeedbackWidget";

type Props = WrapperProps<typeof FooterType>;

/**
 * DocItem footer swizzle — orijinal edit-url + son güncelleme alanlarından
 * sonra geri bildirim widget'ını mount eder.
 */
export default function FooterWrapper(props: Props): JSX.Element {
  return (
    <>
      <Footer {...props} />
      <FeedbackWidget />
    </>
  );
}
