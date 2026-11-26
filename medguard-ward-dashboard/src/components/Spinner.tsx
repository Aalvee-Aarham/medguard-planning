import { LoaderCircle } from 'lucide-react';

/** Goes inside a button while it works; the label stays. */
export function Spinner() {
  return <LoaderCircle size={16} aria-hidden className="animate-spin motion-reduce:animate-none" />;
}
