import { Suspense } from "react";
import PageClient from "./PageClient";

export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <PageClient params={props.params} />
    </Suspense>
  );
}
