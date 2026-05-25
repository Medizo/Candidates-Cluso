"use client";

import { ReactNode, useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";

type ProfileEditDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function ProfileEditDrawer({
  isOpen,
  onClose,
  title,
  icon,
  children,
  footer,
}: ProfileEditDrawerProps) {
  const drawerRef = useRef<HTMLDivElement | null>(null);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleEscape]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`profile-edit-backdrop ${isOpen ? "open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`profile-edit-drawer ${isOpen ? "open" : ""}`}
        role="dialog"
        aria-modal={isOpen}
        aria-label={title}
      >
        <div className="profile-edit-drawer-header">
          <h2 className="profile-edit-drawer-title">
            {icon}
            {title}
          </h2>
          <button
            type="button"
            className="profile-edit-drawer-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="profile-edit-drawer-body">{children}</div>

        {footer ? (
          <div className="profile-edit-drawer-footer">{footer}</div>
        ) : null}
      </div>
    </>
  );
}
