import { ReactNode } from "react";
import { AtlasNavigation } from "./AtlasNavigation";
export function NavigationBar({
  desktopActions,
  mobileActions,
}: {
  desktopActions?: ReactNode;
  mobileActions?: ReactNode;
}) {
  return (
    <>
      <AtlasNavigation />
      {desktopActions && (
        <div className="hidden md:block">{desktopActions}</div>
      )}
      {mobileActions && <div className="md:hidden">{mobileActions}</div>}
    </>
  );
}
