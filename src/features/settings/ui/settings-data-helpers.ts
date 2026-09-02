import { useCallback, useEffect, useState } from "react";
import { liveDbPath } from "@/features/settings/application/settings-cases";
import { liveDbSize } from "@/features/settings/infrastructure/backup-service";

export function formatSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

export function useDbInfo() {
  const [dbPath, setDbPath] = useState<string | null>(null);
  const [pathError, setPathError] = useState(false);
  const [dbSize, setDbSize] = useState<number | null>(null);
  const [sizeError, setSizeError] = useState(false);

  const loadPath = useCallback(() => {
    setPathError(false);
    setDbPath(null);
    void liveDbPath()
      .then(setDbPath)
      .catch(() => setPathError(true));
  }, []);
  const loadSize = useCallback(() => {
    setSizeError(false);
    setDbSize(null);
    void liveDbSize()
      .then(setDbSize)
      .catch(() => setSizeError(true));
  }, []);

  useEffect(() => { loadPath(); }, [loadPath]);
  useEffect(() => { loadSize(); }, [loadSize]);

  return { dbPath, pathError, dbSize, sizeError, loadPath, loadSize };
}
