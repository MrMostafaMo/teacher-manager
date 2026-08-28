import { useEffect, useState } from "react";
import { getTeacherProfile } from "./teacher-profile-cases";

export function useTeacherProfile() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    void getTeacherProfile()
      .then((p) => setName(p?.name ?? null))
      .catch(() => setName(null));
    const onChange = () => void getTeacherProfile().then((p) => setName(p?.name ?? null)).catch(() => setName(null));
    window.addEventListener("tm:data-changed", onChange);
    return () => window.removeEventListener("tm:data-changed", onChange);
  }, []);

  return { name, setName };
}
