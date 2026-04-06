import { useEffect } from "react";

const BASE_TITLE = "Us";

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} — ${BASE_TITLE}` : `${BASE_TITLE} — Your Relationship OS`;
    return () => { document.title = `${BASE_TITLE} — Your Relationship OS`; };
  }, [title]);
}
